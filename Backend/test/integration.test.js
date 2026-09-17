import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import request from 'supertest';

// A unique temporary schema; never mutate the application database.
process.env.DB_NAME=`cpn_test_${Date.now()}_${process.pid}`;
process.env.NODE_ENV='test';
process.env.JWT_SECRET='integration-tests-only-secret-at-least-32-characters';
const {env}=await import('../src/config/env.js');
const {migrate}=await import('../src/scripts/migrate.js');
const {pool}=await import('../src/config/database.js');
const {createApp}=await import('../src/app.js');
let app;const users={};const tokens={};const testPassword='TestPass123!';
const payload={sender_name:'Người gửi kiểm thử',sender_phone:'0901111111',sender_address:'25 Nguyễn Trãi, TP. Hồ Chí Minh',receiver_name:'Người nhận kiểm thử',receiver_phone:'0902222222',receiver_address:'35 Trần Phú, Hà Nội',package_name:'Tài liệu',weight:1.51,zone:'domestic',cod_amount:250000,payer:'receiver',note:'Gọi trước khi giao',service_id:1};
const auth=(method,path,role='customer')=>request(app)[method]('/api'+path).set('Authorization',`Bearer ${tokens[role]}`);
const create=async()=>{const res=await auth('post','/orders').send(payload).expect(201);return res.body.order;};
const assign=order=>auth('patch',`/orders/${order.id}/assign`,'admin').send({employee_id:users.employee.id}).expect(200);
before(async()=>{
  await migrate(); app=createApp();const hash=await bcrypt.hash(testPassword,4);
  for(const key of ['admin','employee','customer','otherCustomer','otherEmployee']){
    const role=key==='otherCustomer'?'customer':key==='otherEmployee'?'employee':key;
    const [result]=await pool.execute('INSERT INTO users (name,email,password_hash,phone,role) VALUES (?,?,?,?,?)',[key,`${key.toLowerCase()}@test.vn`,hash,'0901111111',role]);
    users[key]={id:result.insertId};const res=await request(app).post('/api/auth/login').send({email:`${key.toLowerCase()}@test.vn`,password:testPassword}).expect(200);tokens[key]=res.body.token;
  }
});
after(async()=>{
  await pool.end();
  assert.match(env.db.database,/^cpn_test_\d+_\d+$/);
  const connection=await mysql.createConnection({...env.db,database:undefined});
  try{await connection.query(`DROP DATABASE IF EXISTS \`${env.db.database}\``);}finally{await connection.end();}
});
test('Health checks real MySQL; anonymous requests are denied',async()=>{
  const res=await request(app).get('/api/health').expect(200);assert.equal(res.body.database,'mysql');
  await request(app).get('/api/orders').expect(401);
  await request(app).get('/api/orders').set('Authorization','Bearer invalid').expect(401);
});
test('Registration cannot grant admin/employee roles; duplicates rejected',async()=>{
  const input={name:'Khách mới',email:'new@test.vn',phone:'0901111111',password:testPassword};
  await request(app).post('/api/auth/register').send({...input,role:'admin'}).expect(400);
  const res=await request(app).post('/api/auth/register').send(input).expect(201);assert.equal(res.body.user.role,'customer');assert.equal(res.body.user.password_hash,undefined);
  await request(app).post('/api/auth/register').send(input).expect(409);
});
test('Role checks protect dashboard, users, service pricing and order creation',async()=>{
  await auth('get','/dashboard').expect(403);await auth('get','/users','employee').expect(403);
  await auth('post','/orders','employee').send(payload).expect(403);
  await auth('patch','/services/1','employee').send({}).expect(403);
});
test('Server calculates fees, validates amounts, and scopes customer identity',async()=>{
  const quote=await auth('post','/services/quote').send({service_id:1,weight:1.51,zone:'domestic'}).expect(200);assert.equal(quote.body.shipping_fee,50000);
  await auth('post','/orders').send({...payload,shipping_fee:1}).expect(400);
  await auth('post','/orders').send({...payload,cod_amount:-1}).expect(400);
  await auth('post','/orders').send({...payload,weight:1.001}).expect(400);
  const res=await auth('post','/orders').send({...payload,customer_id:users.otherCustomer.id}).expect(201);
  assert.equal(res.body.order.shipping_fee,50000);assert.equal(res.body.order.customer_id,users.customer.id);
  assert.ok(Math.abs(Date.now()-new Date(res.body.order.created_at).getTime())<10000,'created_at must be UTC, even when MySQL host uses a different timezone');
  await auth('post','/orders','admin').send(payload).expect(400);
});
test('Other customers/employees cannot read, update or enumerate protected orders',async()=>{
  const order=await create();await assign(order);
  await auth('get',`/orders/${order.id}`,'otherCustomer').expect(404);await auth('get',`/orders/${order.id}`,'otherEmployee').expect(404);
  await auth('patch',`/orders/${order.id}/status`,'otherEmployee').send({status:'picked_up'}).expect(404);
  const list=await auth('get','/orders','otherCustomer').expect(200);assert.equal(list.body.total,0);
  await auth('patch',`/orders/${order.id}/assign`,'employee').send({employee_id:users.employee.id}).expect(403);
});
test('Full delivery workflow, failure, retry and terminal state protection',async()=>{
  const order=await create();await assign(order);
  await auth('patch',`/orders/${order.id}/status`,'employee').send({status:'delivered'}).expect(409);
  await auth('patch',`/orders/${order.id}/status`,'customer').send({status:'cancelled',note:'Đổi ý'}).expect(403);
  for(const status of ['picked_up','in_transit','out_for_delivery'])await auth('patch',`/orders/${order.id}/status`,'employee').send({status}).expect(200);
  await auth('patch',`/orders/${order.id}/status`,'employee').send({status:'failed'}).expect(400);
  await auth('patch',`/orders/${order.id}/status`,'employee').send({status:'failed',note:'Không liên lạc được'}).expect(200);
  for(const status of ['out_for_delivery','delivered'])await auth('patch',`/orders/${order.id}/status`,'employee').send({status}).expect(200);
  const detail=await auth('get',`/orders/${order.id}`).expect(200);assert.equal(detail.body.order.status,'delivered');assert.ok(detail.body.order.delivered_at);assert.equal(detail.body.events.length,8);
  await auth('patch',`/orders/${order.id}/status`,'admin').send({status:'out_for_delivery'}).expect(409);
  await auth('patch',`/orders/${order.id}/assign`,'admin').send({employee_id:users.otherEmployee.id}).expect(409);
  const dashboard=await auth('get','/dashboard','admin').expect(200);assert.equal(Number(dashboard.body.summary.revenue),50000);assert.equal(Number(dashboard.body.summary.delivered_cod),250000);
});
test('Concurrent status changes produce one event and one conflict',async()=>{
  const order=await create();await assign(order);
  const results=await Promise.all([auth('patch',`/orders/${order.id}/status`,'employee').send({status:'picked_up'}),auth('patch',`/orders/${order.id}/status`,'employee').send({status:'picked_up'})]);
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
  const res=await auth('get',`/orders/${order.id}`).expect(200);assert.equal(res.body.events.filter(e=>e.status==='picked_up').length,1);
});
test('Customer cancellation requires reason, public tracking excludes private details',async()=>{
  const order=await create();
  await auth('patch',`/orders/${order.id}/status`).send({status:'cancelled'}).expect(400);
  await auth('patch',`/orders/${order.id}/status`).send({status:'cancelled',note:'Thông tin riêng tư'}).expect(200);
  const res=await request(app).get(`/api/tracking/${order.tracking_code}`).expect(200);assert.equal(res.body.order.status,'cancelled');
  for(const value of ['sender_name','receiver_phone','Thông tin riêng tư','actor_name','customer_id'])assert.ok(!JSON.stringify(res.body).includes(value));
});
test('Assigned staff cannot be disabled; inactive staff cannot receive orders',async()=>{
  const order=await create();await assign(order);
  await auth('patch',`/users/${users.employee.id}`,'admin').send({active:false}).expect(409);
  await auth('patch',`/users/${users.otherEmployee.id}`,'admin').send({active:false}).expect(200);
  await auth('get','/orders','otherEmployee').expect(401);
  await auth('patch',`/orders/${order.id}/assign`,'admin').send({employee_id:users.otherEmployee.id}).expect(400);
  await auth('patch',`/users/${users.admin.id}`,'admin').send({active:false}).expect(400);
});
test('Pricing changes preserve existing orders',async()=>{
  const order=await create();const services=await auth('get','/services','admin').expect(200);const service=services.body.items[0];
  const {name,description,extra_half_kg,domestic_surcharge,estimated_days}=service;
  await auth('patch','/services/1','admin').send({name,description,extra_half_kg,domestic_surcharge,estimated_days,base_fee:55000,active:true}).expect(200);
  const detail=await auth('get',`/orders/${order.id}`).expect(200);assert.equal(detail.body.order.shipping_fee,50000);
  const next=await create();assert.equal(next.shipping_fee,80000);
});
test('Pagination and query validation',async()=>{
  await auth('get','/orders?page=-1').expect(400);await auth('get','/orders?status=invalid').expect(400);
  const res=await auth('get','/orders?limit=2&page=1').expect(200);assert.equal(res.body.items.length,2);assert.ok(res.body.total>2);
});
test('Password change and logout revoke existing JWT sessions',async()=>{
  await auth('post','/auth/change-password','otherCustomer').send({current_password:testPassword,new_password:'Changed123!'}).expect(200);
  await auth('get','/auth/me','otherCustomer').expect(401);
  await request(app).post('/api/auth/login').send({email:'othercustomer@test.vn',password:testPassword}).expect(401);
  await auth('post','/auth/logout','customer').expect(200);await auth('get','/auth/me','customer').expect(401);
});

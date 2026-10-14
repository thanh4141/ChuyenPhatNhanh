import {before,after,beforeEach,test} from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import sharp from 'sharp';
import {chromium,expect} from '@playwright/test';
import {rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {mapsFixture,locationFixture} from './maps.fixture.js';
process.env.DB_NAME=`cpn_logistics_${Date.now()}_${process.pid}`;
process.env.JWT_SECRET='logistics-test-only-long-secret-123456789';
const {env}=await import('../src/config/env.js'),{migrate}=await import('../src/scripts/migrate.js'),{pool}=await import('../src/config/database.js'),{createApp}=await import('../src/app.js');
const uploadDirectory=fileURLToPath(new URL('../../.local/test-uploads/'+env.db.database+'/',import.meta.url));
let app,png,pickup;const tokens={},users={},stations={};const password='Logistics@123';
// Separate test clients by actor, so the complete suite doesn't share one
// upload quota. Proxy trust is enabled only on this in-process test app.
const buildApp=options=>createApp(options).set('trust proxy','loopback');
let clientGroup=0;
beforeEach(()=>{clientGroup++;});
const call=(role,method,path)=>request(app)[method]('/api'+path).set('X-Forwarded-For','192.0.2.'+(clientGroup*10+(users[role]||5))).set('Authorization','Bearer '+tokens[role]);
before(async()=>{
 await migrate();app=buildApp({mapsProvider:mapsFixture,uploadDirectory});png=await sharp({create:{width:4,height:4,channels:3,background:'#155d4b'}}).png().toBuffer();
 const hash=await bcrypt.hash(password,4);
 for(const [key,role]of [['admin','admin'],['north','employee'],['south','employee'],['other','employee'],['customer','customer']]){const [r]=await pool.execute('INSERT INTO tai_khoan(ten,thu_dien_tu,mat_khau_bam,so_dien_thoai,vai_tro) VALUES (?,?,?,?,?)',[key,key+'@logistics.vn',hash,'0901111111',role]);users[key]=r.insertId;tokens[key]=(await request(app).post('/api/auth/login').send({email:key+'@logistics.vn',password}).expect(200)).body.token;}
 for(const [key,code]of [['north','01'],['south','79'],['middle','75']]){
  const r=await call('admin','post','/stations').send({name:'Trạm '+key,province_code:code,address:'Địa chỉ trạm '+key,latitude:key==='north'?21.03:10.78,longitude:key==='middle'?108:106.7}).expect(201);stations[key]=r.body.id;
  await call('admin','post','/stations/'+r.body.id+'/managers').send({name:'Quản lý '+key,email:'manager-'+key+'@logistics.vn',phone:'0901111111',password}).expect(201);
  tokens['manager_'+key]=(await request(app).post('/api/auth/login').send({email:'manager-'+key+'@logistics.vn',password}).expect(200)).body.token;
 }
 await pool.execute('UPDATE tai_khoan SET ma_tram=? WHERE ma_so=?',[stations.north,users.north]);await pool.execute('UPDATE tai_khoan SET ma_tram=? WHERE ma_so=?',[stations.south,users.south]);
 pickup=(await call('customer','post','/addresses').send({...locationFixture,province_code:'01',latitude:21.03,longitude:105.85,label:'Kho lấy Hà Nội',is_default:true}).expect(201)).body.id;
});
after(async()=>{await pool.end();assert.match(env.db.database,/^cpn_logistics_\d+_\d+$/);const c=await mysql.createConnection({...env.db,database:undefined});try{await c.query(`DROP DATABASE \`${env.db.database}\``);}finally{await c.end();}assert.ok(uploadDirectory.includes('test-uploads')&&uploadDirectory.includes(env.db.database));await rm(uploadDirectory,{recursive:true,force:true});});
async function create(delivery=locationFixture,pickupId=pickup,assign=true){
 const q=(await call('customer','post','/services/quote').send({pickup_address_id:pickupId,delivery,service_id:1,weight:1,has_cod:false,cod_amount:0,has_insurance:false,has_packaging:false}).expect(200)).body;
 const photo=(await call('customer','post','/media/parcel').attach('image',png,'parcel.png').expect(201)).body.id;
 const order={...(await call('customer','post','/orders').send({quote_id:q.quote_id,parcel_photo_id:photo,package_name:'Kiện Bắc Nam'}).expect(201)).body.order,photo};
 if(assign)await call('admin','post','/logistics/assign-pickup').send({station_id:order.origin_station_id,employee_id:order.origin_station_id===stations.north?users.north:order.origin_station_id===stations.south?users.south:users.other,order_ids:[order.id]}).expect(200);return order;
}
const status=(role,o,next,extra={})=>call(role,'patch','/orders/'+o.id+'/status').send({status:next,...extra});
const proof=async(role)=>(await call(role,'post','/media/delivery').attach('image',png,'delivery.png').expect(201)).body.id;
async function pickupAtNorth(o){await call('north','post','/orders/'+o.id+'/accept').expect(200);await status('north',o,'awaiting_pickup').expect(200);await status('north',o,'picked_up').expect(200);}
test('Station permissions, profile/account scope and local pickup; no direct north-to-south delivery',async()=>{
 const o=await create();
 assert.equal(o.origin_station_id,stations.north);assert.equal(o.destination_station_id,stations.south);
 assert.ok((await call('north','get','/orders?scope=waiting').expect(200)).body.items.some(x=>x.id===o.id));
 assert.ok(!(await call('south','get','/orders?scope=waiting').expect(200)).body.items.some(x=>x.id===o.id));
 await call('south','post','/orders/'+o.id+'/accept').expect(403);await call('south','get','/media/'+o.photo+'/content').expect(404);
 await call('manager_middle','get','/orders/'+o.id).expect(404);await call('manager_middle','get','/media/'+o.photo+'/content').expect(404);
 await call('manager_north','get','/users?role=customer').expect(403);await call('manager_north','get','/logistics/inventory?station_id='+stations.south).expect(403);
 await call('manager_north','patch','/users/'+users.south).send({active:false}).expect(403);
 const input={name:'Nhân viên mới trạm Bắc',phone:'0905555555',employee_code:'NV-BAC',hired_at:'2026-01-01',employment_status:'active'};
 const profile=(await call('manager_north','post','/employees').send(input).expect(201)).body.id;
 assert.ok(!(await call('manager_south','get','/employees?available=1').expect(200)).body.items.some(p=>p.id===profile));
 await call('manager_south','post','/users').send({profile_id:profile,email:'wrong@logistics.vn',password}).expect(403);
 const added=(await call('manager_north','post','/users').send({profile_id:profile,email:'new@logistics.vn',password}).expect(201)).body.user;assert.equal(added.station_id,stations.north);
 await pickupAtNorth(o);await status('north',o,'delivering').expect(403);
 const before=(await call('manager_north','get','/logistics/inventory').expect(200)).body;assert.equal(before.total,0);assert.ok(before.awaiting.some(x=>x.id===o.id));
 await call('manager_south','post','/logistics/orders/'+o.id+'/receive-pickup').expect(403);
 await call('manager_north','post','/logistics/orders/'+o.id+'/receive-pickup').expect(200);await call('manager_north','post','/logistics/orders/'+o.id+'/receive-pickup').expect(409);
 const stock=(await call('manager_north','get','/logistics/inventory').expect(200)).body;assert.equal(stock.total,1);assert.equal(stock.items[0].pickup_employee_id,users.north);assert.equal(stock.items[0].delivery_employee_id,null);
 await call('manager_north','post','/logistics/assign-delivery').send({station_id:stations.north,employee_id:users.north,order_ids:[o.id]}).expect(409);
});
test('Grouped multihop batches, concurrent reservation, partial receiving and separate local delivery',async()=>{
 const a=await create(),b=await create(),wrong=await create({...locationFixture,province_code:'75',longitude:108});
 for(const o of [a,b,wrong]){await pickupAtNorth(o);await call('manager_north','post','/logistics/orders/'+o.id+'/receive-pickup').expect(200);}
 // A real road route can contain tens of thousands of points. Lists/dispatch
 // must never sort the JSON snapshot (MySQL ER_OUT_OF_SORTMEMORY regression).
 await pool.execute('UPDATE don_hang SET chi_tiet_cuoc=? WHERE ma_so=?',[JSON.stringify({route_geometry:{type:'LineString',coordinates:Array.from({length:60000},()=>[106.7009,10.7769])}}),a.id]);
 for(const path of ['/orders','/dashboard','/logistics/inventory?station_id='+stations.north]){
  const data=(await call('admin','get',path).expect(200)).body;
  for(const item of data.items||data.recent)assert.equal(item.pricing_snapshot,undefined);
 }
 const full=(await call('customer','get','/orders/'+a.id).expect(200)).body;assert.equal(full.order.pricing_snapshot.route_geometry.coordinates.length,60000);
 const base={station_id:stations.north,destination_station_id:stations.middle};
 await call('manager_north','post','/logistics/batches').send({...base,order_ids:[a.id,wrong.id]}).expect(400);
 const races=await Promise.all([1,2].map(()=>call('manager_north','post','/logistics/batches').send({...base,order_ids:[a.id,b.id]})));assert.deepEqual(races.map(r=>r.status).sort(),[201,409]);
 const batch=races.find(r=>r.status===201).body.id;
 await call('manager_south','get','/logistics/batches/'+batch).expect(403);
 await call('manager_middle','post','/logistics/batches/'+batch+'/receive').send({order_ids:[a.id]}).expect(409);
 await call('manager_south','post','/logistics/batches/'+batch+'/dispatch').expect(403);
 await call('manager_north','post','/logistics/batches/'+batch+'/dispatch').expect(200);await call('manager_north','post','/logistics/batches/'+batch+'/dispatch').expect(409);
 const incoming=(await call('manager_middle','get','/notifications?limit=100').expect(200)).body.items.filter(n=>n.type==='batch_in:'+batch);
 assert.equal(incoming.length,1);assert.equal(incoming[0].read_at,null);
 assert.ok(!(await call('manager_south','get','/notifications?limit=100').expect(200)).body.items.some(n=>n.type==='batch_in:'+batch));
 await call('manager_south','patch','/notifications/'+incoming[0].id+'/read').expect(404);
 await call('manager_middle','patch','/notifications/'+incoming[0].id+'/read').expect(200);
 assert.ok(!(await call('manager_north','get','/logistics/inventory').expect(200)).body.items.some(o=>o.id===a.id));
 await call('manager_middle','get','/orders/'+a.id).expect(200);await call('manager_middle','get','/media/'+a.photo+'/content').expect(200);
 await call('manager_middle','post','/logistics/batches/'+batch+'/receive').send({order_ids:[a.id,wrong.id]}).expect(409);
 assert.equal((await call('manager_middle','get','/logistics/inventory').expect(200)).body.total,0);
 await call('manager_middle','post','/logistics/batches/'+batch+'/receive').send({order_ids:[a.id]}).expect(200);
 let detail=(await call('manager_middle','get','/logistics/batches/'+batch).expect(200)).body;assert.equal(detail.batch.status,'dispatched');assert.equal(detail.items.filter(i=>i.received_at).length,1);
 await call('manager_middle','post','/logistics/batches/'+batch+'/receive').send({order_ids:[a.id]}).expect(409);
 await call('manager_middle','post','/logistics/batches/'+batch+'/receive').send({order_ids:[b.id]}).expect(200);
 const second=(await call('manager_middle','post','/logistics/batches').send({station_id:stations.middle,destination_station_id:stations.south,order_ids:[a.id,b.id]}).expect(201)).body.id;
  await call('manager_middle','post','/logistics/batches/'+second+'/dispatch').expect(200);await call('manager_south','post','/logistics/batches/'+second+'/receive').send({order_ids:[a.id,b.id]}).expect(200);
 await call('manager_middle','get','/orders/'+a.id).expect(200);await call('manager_middle','get','/media/'+a.photo+'/content').expect(200);
 const assigned={station_id:stations.south,employee_id:users.south,order_ids:[a.id,b.id]};
 await call('manager_south','post','/logistics/assign-delivery').send({...assigned,employee_id:users.north}).expect(400);
 await call('manager_south','post','/logistics/assign-delivery').send(assigned).expect(200);
 const normalMaps=app.locals.maps;
 app.locals.maps={...mapsFixture,route:async()=>{throw Object.assign(new Error('Routing temporarily unavailable'),{status:502});}};
 try{
  const detail=(await call('south','get','/orders/'+a.id).expect(200)).body;assert.equal(detail.order.delivery_route_available,true);
  await call('south','get','/orders/'+a.id+'/delivery-route').expect(502);
 }finally{app.locals.maps=normalMaps;}
 const routeBefore=(await call('south','get','/orders/'+a.id+'/delivery-route').expect(200)).body;assert.equal(routeBefore.route_geometry.type,'LineString');
 await call('other','get','/orders/'+a.id+'/delivery-route').expect(404);
 await status('north',a,'delivering').expect(403);await status('south',a,'completed').expect(409);
 await status('south',a,'delivering').expect(200);assert.ok(!(await call('manager_south','get','/logistics/inventory').expect(200)).body.items.some(o=>o.id===a.id));
 const routeAfter=(await call('south','get','/orders/'+a.id+'/delivery-route').expect(200)).body;assert.equal(routeAfter.from.latitude,routeBefore.from.latitude);assert.equal(routeAfter.distance_meters,routeBefore.distance_meters);
 await status('south',a,'completed',{delivery_photo_id:await proof('south')}).expect(200);await call('customer','post','/orders/'+a.id+'/review').send({stars:5,comment:'Người giao tại miền Nam giao tốt'}).expect(201);
 const final=(await call('customer','get','/orders/'+a.id).expect(200)).body;assert.equal(final.order.pickup_employee_id,users.north);assert.equal(final.order.delivery_employee_id,users.south);assert.equal(final.review.employee_id,users.south);
 const log=(await call('manager_south','get','/logistics/ledger').expect(200)).body.items;assert.ok(log.some(l=>l.order_id===a.id&&l.type==='delivery_out'));assert.ok(log.some(l=>l.order_id===a.id&&l.type==='transfer_received'));
});
test('Same-province delivery goes directly to recipient; proof is mandatory, owned, single-use and private',async()=>{
 const local={...locationFixture,province_code:'01',latitude:21.04,longitude:105.85};
 const a=await create(local),b=await create(local);
 assert.equal(a.route_type,'same_province');
 for(const o of [a,b]){await pickupAtNorth(o);await status('north',o,'completed').expect(409);await status('north',o,'delivering').expect(200);}
 await status('north',a,'completed').expect(400);
 await call('customer','post','/media/delivery').attach('image',png,'wrong.png').expect(403);
 const wrongOwner=await proof('south'),incident=(await call('north','post','/media/incident').attach('image',png,'incident.png').expect(201)).body.id;
 for(const photo of [wrongOwner,incident,a.photo])await status('north',a,'completed',{delivery_photo_id:photo}).expect(400);
 let detail=(await call('customer','get','/orders/'+a.id).expect(200)).body;
 assert.equal(detail.order.status,'delivering');assert.equal(detail.order.delivered_at,null);assert.equal(detail.events.filter(e=>e.status==='completed').length,0);
 const photo=await proof('north');await status('north',a,'completed',{delivery_photo_id:photo}).expect(200);
 await status('north',b,'completed',{delivery_photo_id:photo}).expect(409);
 await status('north',b,'completed',{delivery_photo_id:await proof('north')}).expect(200);
 detail=(await call('customer','get','/orders/'+a.id).expect(200)).body;
 assert.equal(detail.order.pickup_employee_id,users.north);assert.equal(detail.order.delivery_employee_id,users.north);assert.equal(detail.order.current_station_id,null);
 const evidence=detail.media.find(m=>m.purpose==='delivery');assert.equal(evidence.id,photo);assert.equal(detail.events.find(e=>e.id===evidence.event_id).status,'completed');
 await call('customer','get','/media/'+photo+'/content').expect(200);await call('other','get','/media/'+photo+'/content').expect(404);
 const [[{count}]]=await pool.execute('SELECT COUNT(*) AS count FROM nhat_ky_kho WHERE ma_don_hang IN (?,?)',[a.id,b.id]);assert.equal(count,0);
});

test('Same-region cross-province orders require departure, destination receipt and assigned delivery',async()=>{
 const source=(await call('customer','post','/addresses').send({...locationFixture,label:'Lấy tại miền Nam',is_default:false}).expect(201)).body.id;
 const o=await create({...locationFixture,province_code:'75',longitude:108},source);assert.equal(o.route_type,'same_region');
 await call('south','post','/orders/'+o.id+'/accept').expect(200);
 for(const s of ['awaiting_pickup','picked_up'])await status('south',o,s).expect(200);
 await status('south',o,'delivering').expect(403);
 await call('manager_south','post','/logistics/orders/'+o.id+'/receive-pickup').expect(200);
 const batch=(await call('manager_south','post','/logistics/batches').send({station_id:stations.south,destination_station_id:stations.middle,order_ids:[o.id]}).expect(201)).body.id;
 await pool.execute('UPDATE tai_khoan SET ma_tram=? WHERE ma_so=?',[stations.middle,users.other]);
 const assignment={station_id:stations.middle,employee_id:users.other,order_ids:[o.id]};
 await call('manager_middle','post','/logistics/assign-delivery').send(assignment).expect(409);
 await call('manager_south','post','/logistics/batches/'+batch+'/dispatch').expect(200);
 await call('manager_middle','post','/logistics/assign-delivery').send(assignment).expect(409);
 await call('manager_middle','post','/logistics/batches/'+batch+'/receive').send({order_ids:[o.id]}).expect(200);
 await call('manager_middle','post','/logistics/assign-delivery').send(assignment).expect(200);
 await status('other',o,'delivering').expect(200);await status('other',o,'completed',{delivery_photo_id:await proof('other')}).expect(200);
});

test('Complaints enforce ownership, station scope, one submission per order and response notifications',async()=>{
 const o=await create({...locationFixture,province_code:'01',latitude:21.04,longitude:105.85});
 const input={order_id:o.id,title:'Kiểm tra kiện hàng',message:'Tôi cần kiểm tra thông tin vận chuyển của kiện hàng.'};
 await call('north','post','/complaints').send(input).expect(403);
 await call('customer','post','/complaints').send({...input,message:'Ngắn'}).expect(400);
 const races=await Promise.all([1,2].map(()=>call('customer','post','/complaints').send(input)));
 assert.deepEqual(races.map(r=>r.status).sort(),[201,409]);const id=races.find(r=>r.status===201).body.id;
 await call('customer','patch','/complaints/'+id).send({status:'resolved',response:'Tự giải quyết'}).expect(403);
 assert.equal((await call('manager_south','get','/complaints?order_id='+o.id).expect(200)).body.total,0);
 await call('manager_south','patch','/complaints/'+id).send({status:'resolved',response:'Sai trạm'}).expect(404);
 await call('manager_north','patch','/complaints/'+id).send({status:'processing',response:'Trạm đang xác minh kiện hàng.'}).expect(200);
 await call('admin','patch','/complaints/'+id).send({status:'resolved',response:'Đã xác minh và thông báo kết quả cho khách.'}).expect(200);
 await call('admin','patch','/complaints/'+id).send({status:'processing',response:'Mở lại'}).expect(409);
 const k=(await call('customer','get','/complaints?order_id='+o.id).expect(200)).body.items[0];assert.equal(k.status,'resolved');assert.ok(k.handled_at);assert.equal(k.handler_id,users.admin);
 assert.ok((await call('customer','get','/notifications?limit=100').expect(200)).body.items.some(n=>n.type==='complaint_response'&&n.order_id===o.id));
 // A second customer must neither read nor complain about someone else's order.
 const outsider=(await request(app).post('/api/auth/register').send({name:'Khách khác',email:'outsider@logistics.vn',phone:'0902222222',password}).expect(201)).body.token;
 const get=await request(app).get('/api/complaints?order_id='+o.id).set('Authorization','Bearer '+outsider).expect(200);assert.equal(get.body.total,0);
 await request(app).post('/api/complaints').set('Authorization','Bearer '+outsider).send(input).expect(404);
});

test('Nearest road station can be across province boundary; only its staff see, read and claim pickup',async()=>{
 const original=app;
 let best=stations.middle;
 const provider={...mapsFixture,stationDistances:async ss=>ss.map(s=>s.id===best?2300:12000)};
 app=buildApp({mapsProvider:provider,uploadDirectory});
 try{
  const o=await create({...locationFixture,province_code:'01',latitude:21.04,longitude:105.85});
  assert.equal(o.origin_station_id,stations.middle);assert.equal(o.destination_station_id,stations.middle);assert.equal(o.pickup_station_distance_meters,2300);
  for(const role of ['north','south']){
   assert.ok(!(await call(role,'get','/orders?scope=waiting').expect(200)).body.items.some(x=>x.id===o.id));
   await call(role,'get','/orders/'+o.id).expect(404);await call(role,'get','/media/'+o.photo+'/content').expect(404);await call(role,'post','/orders/'+o.id+'/accept').expect(403);
  }
  assert.ok((await call('other','get','/orders?scope=waiting').expect(200)).body.items.some(x=>x.id===o.id));await call('other','get','/orders/'+o.id).expect(200);
  await call('other','post','/orders/'+o.id+'/decline-pickup').send({note:'Không thể nhận'}).expect(200);best=stations.north;await call('admin','post','/orders/'+o.id+'/route-pickup').expect(200);
  await call('other','get','/orders/'+o.id).expect(404);
  assert.ok(!(await call('other','get','/notifications?limit=100').expect(200)).body.items.some(n=>n.order_id===o.id&&n.type==='new_order'));
  await call('admin','post','/logistics/assign-pickup').send({station_id:stations.north,employee_id:users.north,order_ids:[o.id]}).expect(200);await call('north','post','/orders/'+o.id+'/accept').expect(200);await call('admin','post','/orders/'+o.id+'/route-pickup').expect(409);
  // A local delivery stays direct even if the selected pickup station is across the boundary.
  best=stations.middle;const local=await create({...locationFixture,province_code:'01',latitude:21.04,longitude:105.85});await call('other','post','/orders/'+local.id+'/accept').expect(200);
  for(const next of ['awaiting_pickup','picked_up','delivering'])await status('other',local,next).expect(200);
  await status('other',local,'completed',{delivery_photo_id:await proof('other')}).expect(200);
 }finally{app=original;}
});

test('Provinces without warehouses can book; shared hub hands off to final driver without changing full-route price',async()=>{
 const original=app;
 const {provinceByCode}=await import('../src/config/provinces.js');
 const provider={...mapsFixture,
  reverse:async p=>({province:provinceByCode(Number(p.longitude)>107?'22':'01')}),
  stationDistances:async ss=>ss.map(s=>s.id===stations.north?150000:800000),
  route:async(from,to)=>({...await mapsFixture.route(from,to),distance_meters:Number(from.latitude)===21.03?180000:150000})};
 app=buildApp({mapsProvider:provider,uploadDirectory});
 try{
  const delivery={...locationFixture,province_code:'22',latitude:20.95,longitude:107.08};
  const o=await create(delivery);assert.equal(o.origin_station_id,stations.north);assert.equal(o.destination_station_id,stations.north);
  assert.equal(o.distance_meters,180000);const price=o.total_amount;
  await pickupAtNorth(o);await status('north',o,'delivering').expect(403);
  await call('manager_north','post','/logistics/orders/'+o.id+'/receive-pickup').expect(200);
  await call('manager_north','post','/logistics/assign-delivery').send({station_id:stations.north,employee_id:users.north,order_ids:[o.id]}).expect(200);
  const route=(await call('north','get','/orders/'+o.id+'/delivery-route').expect(200)).body;
  assert.equal(Number(route.from.longitude),106.7);assert.equal(Number(route.to.longitude),delivery.longitude);
  await status('north',o,'delivering').expect(200);
  await status('north',o,'completed',{delivery_photo_id:await proof('north')}).expect(200);
  const detail=(await call('customer','get','/orders/'+o.id).expect(200)).body.order;
  assert.equal(detail.total_amount,price);assert.equal(detail.distance_meters,180000);
  const source=(await call('customer','post','/addresses').send({...delivery,label:'Điểm lấy không có kho',is_default:false}).expect(201)).body.id;
  const reverse=await create({...delivery,province_code:'01',latitude:21.03,longitude:105.85},source);
  assert.equal(reverse.origin_station_id,stations.north);assert.equal(reverse.destination_station_id,stations.north);
 }finally{app=original;}
});

test('Unconfigured stations, stale quotes and unassigned historical pickups cannot bypass station selection',async()=>{
 const o=await create();
 await pool.execute('UPDATE don_hang SET ma_nv_lay_hang=NULL,ma_tram_gui=NULL,quang_duong_tram_lay_met=NULL WHERE ma_so=?',[o.id]);
 for(const role of ['north','south','other']){
  assert.ok(!(await call(role,'get','/orders?scope=waiting').expect(200)).body.items.some(x=>x.id===o.id));
  await call(role,'get','/orders/'+o.id).expect(404);await call(role,'get','/media/'+o.photo+'/content').expect(404);await call(role,'post','/orders/'+o.id+'/accept').expect(409);
 }
 await call('manager_north','patch','/stations/'+stations.north+'/location').send({latitude:21.03,longitude:105.85}).expect(403);
 await call('admin','patch','/stations/'+stations.north+'/location').send({latitude:10.78,longitude:106.7}).expect(422);
 const input={pickup_address_id:pickup,delivery:locationFixture,service_id:1,weight:1,has_cod:false,cod_amount:0,has_insurance:false,has_packaging:false};
 const q=(await call('customer','post','/services/quote').send(input).expect(200)).body;
 await call('admin','patch','/stations/'+stations.north+'/location').send({latitude:21.031,longitude:105.851}).expect(200);
 const photo=(await call('customer','post','/media/parcel').attach('image',png,'parcel.png').expect(201)).body.id;
 await call('customer','post','/orders').send({quote_id:q.quote_id,parcel_photo_id:photo,package_name:'Báo giá cũ'}).expect(409);
 await pool.execute('UPDATE tram_chuyen_phat SET vi_do=NULL,kinh_do=NULL WHERE ma_so=?',[stations.north]);
 await call('customer','post','/services/quote').send(input).expect(409);
 await call('admin','patch','/stations/'+stations.north+'/location').send({latitude:21.03,longitude:105.85}).expect(200);
 await call('admin','post','/orders/'+o.id+'/route-pickup').expect(200);
 await call('north','get','/orders/'+o.id).expect(404);
});

test('Only manager-assigned staff can confirm; decline returns task and reassignment is atomic',async()=>{
 const o=await create(locationFixture,pickup,false),other=await create(locationFixture,pickup,false);
 await call('north','get','/orders/'+o.id).expect(404);
 await call('north','post','/orders/'+o.id+'/accept').expect(403);
 const input={station_id:stations.north,employee_id:users.north,order_ids:[o.id,other.id]};
 await call('north','post','/logistics/assign-pickup').send(input).expect(403);
 await call('manager_south','post','/logistics/assign-pickup').send(input).expect(403);
 await call('manager_north','post','/logistics/assign-pickup').send({...input,employee_id:users.south}).expect(400);
 await call('manager_north','post','/logistics/assign-pickup').send(input).expect(200);
 assert.ok((await call('north','get','/orders?scope=waiting').expect(200)).body.items.some(x=>x.id===o.id));
 await call('north','post','/orders/'+o.id+'/decline-pickup').send({note:''}).expect(400);
 await call('north','post','/orders/'+o.id+'/decline-pickup').send({note:'Xe đang sửa, không thể đi lấy'}).expect(200);
 await call('north','get','/orders/'+o.id).expect(404);
 assert.ok((await call('manager_north','get','/notifications?limit=100').expect(200)).body.items.some(n=>n.order_id===o.id&&n.message.includes('Xe đang sửa')));
 await call('manager_north','post','/logistics/assign-pickup').send({...input,order_ids:[o.id]}).expect(200);
 const responses=await Promise.all([call('north','post','/orders/'+o.id+'/accept'),call('north','post','/orders/'+o.id+'/accept')]);
 assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);
 await call('manager_north','post','/logistics/assign-pickup').send(input).expect(409);
 await call('north','post','/orders/'+o.id+'/decline-pickup').send({note:'Đã nhận rồi'}).expect(409);
 await status('customer',other,'cancelled',{note:'Không gửi nữa'}).expect(200);
 await call('north','post','/orders/'+other.id+'/accept').expect(409);
});

test('Warehouse filters enforce station scope, direction, service and Vietnam date boundaries',async()=>{
 const o=await create();await pickupAtNorth(o);await call('manager_north','post','/logistics/orders/'+o.id+'/receive-pickup').expect(200);
 await pool.execute("UPDATE don_hang SET ngay_nhan_don='2026-09-24 17:00:00' WHERE ma_so=?",[o.id]);
 const stock='/logistics/inventory?station_id='+stations.north+'&q='+o.tracking_code;
 let r=(await call('manager_north','get',stock+'&service_code=standard&date_from=2026-09-25&date_to=2026-09-25').expect(200)).body;
 assert.equal(r.total,1);assert.equal(r.items[0].service_name,'Tiêu chuẩn');
 assert.equal((await call('manager_north','get',stock+'&service_code=express').expect(200)).body.total,0);
 assert.equal((await call('manager_north','get',stock+'&date_to=2026-09-24').expect(200)).body.total,0);
 const b=(await call('manager_north','post','/logistics/batches').send({station_id:stations.north,destination_station_id:stations.south,order_ids:[o.id]}).expect(201)).body.id;
 await call('manager_north','post','/logistics/batches/'+b+'/dispatch').expect(200);
 await pool.execute("UPDATE chuyen_trung_chuyen SET ngay_xuat_kho='2026-09-24 17:00:00' WHERE ma_so=?",[b]);
 const detail=(await call('manager_north','get','/logistics/batches/'+b).expect(200)).body.batch;
 const path='/logistics/batches?q='+detail.code+'&service_code=standard&status=dispatched&date_from=2026-09-25&date_to=2026-09-25';
 assert.equal((await call('manager_north','get',path+'&direction=outgoing').expect(200)).body.total,1);
 assert.equal((await call('manager_north','get',path+'&direction=incoming').expect(200)).body.total,0);
 assert.equal((await call('manager_south','get',path+'&direction=incoming').expect(200)).body.total,1);
 assert.equal((await call('manager_middle','get',path).expect(200)).body.total,0);
 await call('manager_north','get','/logistics/batches?direction=invalid').expect(400);
 await call('manager_north','get','/logistics/batches?date_from=2026-09-26&date_to=2026-09-25').expect(400);
});

test('Cancelling a planned batch releases reservations without moving inventory',async()=>{
 const o=await create();await pickupAtNorth(o);await call('manager_north','post','/logistics/orders/'+o.id+'/receive-pickup').expect(200);
 const body={station_id:stations.north,destination_station_id:stations.south,order_ids:[o.id]};const b=(await call('manager_north','post','/logistics/batches').send(body).expect(201)).body.id;
 await call('manager_north','post','/logistics/batches/'+b+'/cancel').expect(200);await call('manager_north','post','/logistics/batches').send(body).expect(201);
});

test('Weight adjustment is strictly restricted to at_origin status and rejected in any other status',async()=>{
 const o=await create();
 const weightPhoto=(await call('manager_north','post','/media/weight').attach('image',png,'weight.png').expect(201)).body.id;
 await call('manager_north','patch','/orders/'+o.id+'/weight').send({weight:2.5,reason:'Cân tại điểm lấy',photo_id:weightPhoto}).expect(409);
 await pickupAtNorth(o);
 await call('manager_north','patch','/orders/'+o.id+'/weight').send({weight:2.5,reason:'Cân khi vừa nhận',photo_id:weightPhoto}).expect(409);
 await call('manager_north','post','/logistics/orders/'+o.id+'/receive-pickup').expect(200);
 const inStock=(await call('customer','get','/orders/'+o.id).expect(200)).body.order;
 assert.equal(inStock.status,'at_origin');
 const updated=(await call('manager_north','patch','/orders/'+o.id+'/weight').send({weight:2.5,reason:'Đo lại kích thước tại kho',photo_id:weightPhoto}).expect(200)).body.order;
 assert.equal(updated.weight,2.5);
 const detail=(await call('customer','get','/orders/'+o.id).expect(200)).body.order;
 assert.equal(detail.pricing_snapshot.weight_adjustment_reason,'Đo lại kích thước tại kho');
 assert.equal(detail.pricing_snapshot.initial_weight,1);
 assert.equal(detail.pricing_snapshot.old_weight,1);
 const b=(await call('manager_north','post','/logistics/batches').send({station_id:stations.north,destination_station_id:stations.south,order_ids:[o.id]}).expect(201)).body.id;
 await call('manager_north','post','/logistics/batches/'+b+'/dispatch').expect(200);
 const photo2=(await call('manager_north','post','/media/weight').attach('image',png,'weight2.png').expect(201)).body.id;
 await call('manager_north','patch','/orders/'+o.id+'/weight').send({weight:3.0,reason:'Cân trên đường',photo_id:photo2}).expect(409);
});

test('Admin and station managers operate station setup, stock and batch receiving through the web',async()=>{
 const a=await create(),b=await create();await pickupAtNorth(a);await pickupAtNorth(b);
 const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});let browser,page;
 try{
  browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'chrome',headless:true});const errors=[];
  page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>errors.push(e.message));const origin='http://127.0.0.1:'+server.address().port;
  async function login(email){await page.goto(origin);await page.getByLabel('Email quản trị').fill(email);await page.getByLabel('Mật khẩu',{exact:true}).fill(password);await page.getByRole('button',{name:'Đăng nhập'}).click();}
  await login('admin@logistics.vn');await page.getByRole('link',{name:'Trạm chuyển phát',exact:true}).click();await expect(page.getByRole('heading',{name:'Trạm chuyển phát',exact:true})).toBeVisible();
  await page.getByLabel('Tên trạm',{exact:true}).fill('Trạm UI Đà Nẵng');await page.getByLabel('Tỉnh / Thành phố',{exact:true}).selectOption('48');await page.getByLabel('Địa chỉ kho',{exact:true}).fill('Kho kiểm thử Đà Nẵng');await page.route('**/maps/picker.html?**',route=>{const channel=new URL(route.request().url()).searchParams.get('channel');return route.fulfill({contentType:'text/html',body:'<button onclick="parent.postMessage({type:\'cpn-map-location\',channel:\''+channel+'\',location:{province_code:\'48\',latitude:16.0471,longitude:108.2068}},location.origin)">Chọn kho Đà Nẵng</button>'});});
  await page.getByRole('button',{name:'Chọn vị trí kho trên bản đồ',exact:true}).click();await page.frameLocator('iframe[title="Bản đồ vị trí trạm"]').getByRole('button',{name:'Chọn kho Đà Nẵng'}).click();await expect(page.getByLabel('Vĩ độ trạm',{exact:true})).toHaveValue('16.0471');
  await page.getByRole('button',{name:'Thêm trạm',exact:true}).click();await expect(page.getByRole('row').filter({hasText:'Trạm UI Đà Nẵng'})).toBeVisible();
  await page.getByRole('row').filter({hasText:'Trạm UI Đà Nẵng'}).getByRole('button',{name:'Thêm quản lý trạm'}).click();await page.getByLabel('Tên quản lý').fill('Quản lý kho UI');await page.getByLabel('Số điện thoại',{exact:true}).fill('0907777777');await page.getByLabel('Email quản lý').fill('manager-ui@logistics.vn');await page.getByLabel('Mật khẩu ban đầu').fill(password);await page.getByRole('button',{name:'Lưu',exact:true}).click();await expect(page.locator('#modal')).not.toBeVisible();await expect(page.getByText('manager-ui@logistics.vn',{exact:false})).toBeVisible();
  await page.getByRole('button',{name:'Đăng xuất',exact:true}).click();await login('manager-north@logistics.vn');
  await expect(page.getByRole('heading',{name:'Kho & trung chuyển',exact:true})).toBeVisible();await expect(page.getByRole('link',{name:'Bảng cước',exact:true})).not.toBeVisible();await expect(page.getByRole('link',{name:'Trạm chuyển phát',exact:true})).not.toBeVisible();
  for(const o of [a,b]){await page.locator('.account-row').filter({hasText:o.tracking_code}).getByRole('button',{name:'Xác nhận hàng về kho'}).click();await expect(page.locator('[data-stock="'+o.id+'"]')).toBeVisible();}
  await page.getByLabel('Kho giao cuối',{exact:true}).selectOption(String(stations.south));await page.getByRole('button',{name:'Lọc kho',exact:true}).click();
  for(const o of [a,b])await page.getByLabel('Chọn '+o.tracking_code,{exact:true}).check();await page.getByRole('button',{name:'Gom chuyến đã chọn'}).click();await page.getByLabel('Trạm đến của chuyến').selectOption(String(stations.south));await page.getByRole('button',{name:'Lưu',exact:true}).click();await expect(page.locator('#modal')).not.toBeVisible();
  const [[batch]]=await pool.execute('SELECT b.* FROM chuyen_trung_chuyen b JOIN kien_trung_chuyen k ON k.ma_chuyen=b.ma_so WHERE k.ma_don_hang=? ORDER BY b.ma_so DESC LIMIT 1',[a.id]);
  await page.getByRole('row').filter({hasText:batch.code}).getByRole('button',{name:'Xuất chuyến'}).click();await expect(page.locator('[data-stock="'+a.id+'"]')).toHaveCount(0);
  await page.getByLabel('Tìm chuyến',{exact:true}).fill(batch.code);
  await page.getByLabel('Hướng chuyến',{exact:true}).selectOption('incoming');await page.getByRole('button',{name:'Lọc chuyến',exact:true}).click();
  await expect(page.getByRole('row').filter({hasText:batch.code})).toHaveCount(0);
  await page.getByLabel('Hướng chuyến',{exact:true}).selectOption('outgoing');await page.getByRole('button',{name:'Lọc chuyến',exact:true}).click();
  await expect(page.getByRole('row').filter({hasText:batch.code})).toContainText('Chuyến đi');
  await page.getByLabel('Hướng chuyến',{exact:true}).selectOption('');await page.getByLabel('Tìm chuyến',{exact:true}).fill('');await page.getByRole('button',{name:'Lọc chuyến',exact:true}).click();
  await page.getByRole('button',{name:'Đăng xuất',exact:true}).click();await login('manager-south@logistics.vn');await expect(page.getByRole('heading',{name:'Kho & trung chuyển',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Thông báo quản lý'}).click();
  await expect(page.getByRole('heading',{name:'Thông báo',exact:true})).toBeVisible();
  await page.locator('.notification-card').filter({hasText:batch.code}).click();
  await expect(page.locator('#modal-title')).toContainText(batch.code);
  await page.locator('#receive-batch-form input[value="'+a.id+'"]').check();await page.getByRole('button',{name:'Xác nhận đã nhận các kiện chọn'}).click();await expect(page.locator('#modal')).not.toBeVisible();
  await expect(page.locator('[data-stock="'+a.id+'"]')).toBeVisible();await expect(page.locator('[data-stock="'+b.id+'"]')).toHaveCount(0);await expect(page.getByRole('row').filter({hasText:batch.code})).toContainText('1/2');
  await page.getByLabel('Chọn '+a.tracking_code,{exact:true}).check();await page.getByRole('button',{name:'Phân công giao đã chọn'}).click();await page.getByLabel('Nhân viên giao hàng').selectOption(String(users.south));await page.getByRole('button',{name:'Lưu',exact:true}).click();await expect(page.locator('#modal')).not.toBeVisible();await expect(page.getByRole('row').filter({hasText:a.tracking_code}).first()).toContainText('Đã phân công giao');
  await page.screenshot({path:fileURLToPath(new URL('../../.local/review/station-warehouse.png',import.meta.url)),fullPage:true});assert.deepEqual(errors,[]);
 }catch(e){if(page)await page.screenshot({path:fileURLToPath(new URL('../../.local/review/station-failure.png',import.meta.url)),fullPage:true}).catch(()=>{});throw e;}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
});

import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { pool,transaction } from '../../config/database.js';
import { authorize } from '../../common/auth.js';
import { AppError } from '../../common/errors.js';
import { id,text,pagination,optionalNote,validate } from '../../common/validation.js';
import { assertTransition,canAccess,statusLabels } from './order.domain.js';
import { attachMedia } from '../media/media.routes.js';
import { notify } from '../notifications/notifications.routes.js';
export const ordersRouter=Router();
const select=`SELECT o.*,s.name AS service_name,c.name AS customer_name,e.name AS employee_name FROM orders o JOIN services s ON s.id=o.service_id JOIN users c ON c.id=o.customer_id LEFT JOIN users e ON e.id=o.employee_id`;
ordersRouter.get('/',async(req,res)=>{
  const {page,limit,q,status,scope}=pagination.extend({status:z.enum(Object.keys(statusLabels)).optional(),scope:z.enum(['mine','waiting']).default('mine')}).parse(req.query);
  const where=['1=1'],values=[];
  if(scope==='waiting'){if(req.user.role!=='employee')throw new AppError(403,'Chỉ nhân viên được xem đơn chờ nhận.');where.push("o.status='pending' AND o.employee_id IS NULL");}
  else if(req.user.role!=='admin'){where.push(req.user.role==='customer'?'o.customer_id=?':'o.employee_id=?');values.push(req.user.id);}
  if(status){where.push('o.status=?');values.push(status);}if(q){where.push('(o.tracking_code LIKE ? OR o.receiver_name LIKE ? OR o.receiver_phone LIKE ?)');values.push(...Array(3).fill(`%${q}%`));}
  const clause=where.join(' AND ');const [[{total}]]=await pool.execute(`SELECT COUNT(*) AS total FROM orders o WHERE ${clause}`,values);const [items]=await pool.query(`${select} WHERE ${clause} ORDER BY o.id DESC LIMIT ? OFFSET ?`,[...values,limit,(page-1)*limit]);res.json({items,total,page,limit});
});
ordersRouter.post('/',authorize('customer'),validate(z.object({quote_id:z.uuid(),package_name:text(200),parcel_photo_id:z.uuid(),note:optionalNote}).strict()),async(req,res)=>{
  const result=await transaction(async c=>{
    const [[user]]=await c.execute('SELECT active FROM users WHERE id=? FOR UPDATE',[req.user.id]);if(!user.active)throw new AppError(401,'Tài khoản đã bị khóa.');
    const [[quote]]=await c.execute('SELECT * FROM shipping_quotes WHERE id=? AND customer_id=? FOR UPDATE',[req.input.quote_id,req.user.id]);if(!quote)throw new AppError(404,'Không tìm thấy báo giá.');
    const [[existing]]=await c.execute('SELECT id FROM orders WHERE quote_id=?',[quote.id]);if(existing)return {id:existing.id,reused:true};
    if(new Date(quote.expires_at)<=new Date())throw new AppError(409,'Báo giá đã hết hạn. Vui lòng tính lại cước.');
    const q=typeof quote.snapshot==='string'?JSON.parse(quote.snapshot):quote.snapshot;
    const record={tracking_code:`CPN${randomBytes(6).toString('hex').toUpperCase()}`,customer_id:req.user.id,service_id:q.service_id,rate_id:quote.rate_id,quote_id:quote.id,sender_name:q.pickup.contact_name,sender_phone:q.pickup.phone,sender_address:q.pickup.formatted_address,receiver_name:q.delivery.contact_name,receiver_phone:q.delivery.phone,receiver_address:q.delivery.formatted_address,package_name:req.input.package_name,weight:q.weight,zone:q.route_type==='same_province'?'same_city':'domestic',route_type:q.route_type,cod_amount:q.cod_amount,shipping_fee:q.shipping_fee,has_cod:q.has_cod,has_insurance:q.has_insurance,has_packaging:q.has_packaging,cod_fee:q.cod_fee,insurance_fee:q.insurance_fee,packaging_fee:q.packaging_fee,total_amount:q.total_amount,pickup_snapshot:JSON.stringify(q.pickup),delivery_snapshot:JSON.stringify(q.delivery),pricing_snapshot:JSON.stringify(q),distance_meters:q.distance_meters,distance_source:q.source,note:req.input.note};
    const [created]=await c.execute(`INSERT INTO orders(${Object.keys(record).join(',')}) VALUES (${Object.keys(record).map(()=>'?').join(',')})`,Object.values(record));
    await attachMedia(c,req.input.parcel_photo_id,req.user.id,'parcel',created.insertId);
    await c.execute('INSERT INTO order_events(order_id,actor_id,status,note) VALUES (?,?,?,?)',[created.insertId,req.user.id,'pending','Khách hàng đã ủy thác vận chuyển.']);
    await notify(c,req.user.id,created.insertId,'created','Đã tạo đơn hàng',`${record.tracking_code} đang chờ nhân viên nhận.`);
    await c.execute("INSERT INTO notifications(user_id,order_id,type,title,message) SELECT id,?,'new_order','Có đơn chờ nhận',? FROM users WHERE role='employee' AND active=TRUE",[created.insertId,`${record.tracking_code}: ${record.sender_address} → ${record.receiver_address}`.slice(0,500)]);
    return {id:created.insertId,reused:false};
  });
  const [[order]]=await pool.execute(`${select} WHERE o.id=?`,[result.id]);res.status(result.reused?200:201).json({order});
});
ordersRouter.get('/:id',async(req,res)=>{
  const [[order]]=await pool.execute(`${select} WHERE o.id=?`,[id.parse(req.params.id)]);if(!order||!canAccess(order,req.user))throw new AppError(404,'Không tìm thấy đơn hàng.');
  const [events]=await pool.execute('SELECT ev.*,u.name AS actor_name FROM order_events ev JOIN users u ON u.id=ev.actor_id WHERE ev.order_id=? ORDER BY ev.id DESC',[order.id]);
  const [media]=await pool.execute('SELECT m.upload_id AS id,m.event_id,u.purpose,u.size_bytes FROM order_media m JOIN uploads u ON u.id=m.upload_id WHERE m.order_id=? ORDER BY m.id',[order.id]);
  const [[review]]=await pool.execute('SELECT r.*,u.name AS customer_name FROM reviews r JOIN users u ON u.id=r.customer_id WHERE r.order_id=?',[order.id]);res.json({order,events,media,review:review||null});
});
ordersRouter.post('/:id/accept',authorize('employee'),async(req,res)=>{
  await transaction(async c=>{
    const [[employee]]=await c.execute('SELECT active FROM users WHERE id=? FOR UPDATE',[req.user.id]);if(!employee.active)throw new AppError(401,'Tài khoản đã bị khóa.');
    const [[profile]]=await c.execute('SELECT employment_status FROM employee_profiles WHERE user_id=?',[req.user.id]);if(profile?.employment_status==='stopped')throw new AppError(403,'Nhân viên đã ngừng làm việc.');
    const [[order]]=await c.execute('SELECT * FROM orders WHERE id=? FOR UPDATE',[id.parse(req.params.id)]);if(!order)throw new AppError(404,'Không tìm thấy đơn hàng.');
    if(order.status!=='pending'||order.employee_id)throw new AppError(409,'Đơn đã có người nhận hoặc đã bị hủy. Hãy tải lại danh sách.');
    await c.execute("UPDATE orders SET employee_id=?,status='accepted',accepted_at=UTC_TIMESTAMP() WHERE id=?",[req.user.id,order.id]);
    await c.execute('INSERT INTO order_events(order_id,actor_id,status,note) VALUES (?,?,?,?)',[order.id,req.user.id,'accepted',`${req.user.name} đã nhận vận chuyển.`]);
    await notify(c,order.customer_id,order.id,'status','Nhân viên đã nhận đơn',`${order.tracking_code}: ${req.user.name} đã nhận vận chuyển.`);
    await notify(c,req.user.id,order.id,'assigned','Bạn đã nhận đơn',`Tiếp tục xử lý ${order.tracking_code} trong Đơn đã nhận.`);
  });res.json({message:'Đã nhận đơn hàng.'});
});
ordersRouter.patch('/:id/status',authorize('customer','employee'),validate(z.object({status:z.enum(Object.keys(statusLabels)),note:optionalNote,incident_photo_id:z.uuid().nullable().optional()}).strict()),async(req,res)=>{
  await transaction(async c=>{
    const [[order]]=await c.execute('SELECT * FROM orders WHERE id=? FOR UPDATE',[id.parse(req.params.id)]);if(!order||!canAccess(order,req.user))throw new AppError(404,'Không tìm thấy đơn hàng.');
    assertTransition(order,req.input.status,req.user,req.input.note,req.input.incident_photo_id);
    await c.execute('UPDATE orders SET status=?,delivered_at=? WHERE id=?',[req.input.status,req.input.status==='completed'?new Date():null,order.id]);
    const [event]=await c.execute('INSERT INTO order_events(order_id,actor_id,status,note) VALUES (?,?,?,?)',[order.id,req.user.id,req.input.status,req.input.note||statusLabels[req.input.status]]);
    if(req.input.status==='incomplete')await attachMedia(c,req.input.incident_photo_id,req.user.id,'incident',order.id,event.insertId);
    await notify(c,order.customer_id,order.id,req.input.status==='completed'?'review_invite':'status',req.input.status==='completed'?'Đơn hoàn thành — đánh giá nhân viên':'Cập nhật đơn hàng',`${order.tracking_code}: ${statusLabels[req.input.status]}.`);
    if(req.input.status==='cancelled'&&order.employee_id)await notify(c,order.employee_id,order.id,'cancelled','Khách hàng đã hủy đơn',`${order.tracking_code}: ${req.input.note}`.slice(0,500));
  });res.json({message:'Đã cập nhật trạng thái.'});
});
ordersRouter.post('/:id/review',authorize('customer'),validate(z.object({stars:z.number().int().min(1).max(5),comment:text(1000)}).strict()),async(req,res)=>{
  await transaction(async c=>{const [[order]]=await c.execute('SELECT * FROM orders WHERE id=? AND customer_id=? FOR UPDATE',[id.parse(req.params.id),req.user.id]);if(!order)throw new AppError(404,'Không tìm thấy đơn hàng.');if(order.status!=='completed'||!order.employee_id)throw new AppError(409,'Chỉ đánh giá đơn đã hoàn thành có nhân viên vận chuyển.');const [[existing]]=await c.execute('SELECT id FROM reviews WHERE order_id=?',[order.id]);if(existing)throw new AppError(409,'Bạn đã đánh giá đơn này.');await c.execute('INSERT INTO reviews(order_id,customer_id,employee_id,stars,comment) VALUES (?,?,?,?,?)',[order.id,req.user.id,order.employee_id,req.input.stars,req.input.comment]);await notify(c,order.employee_id,order.id,'review','Bạn có đánh giá mới',`${order.tracking_code}: ${req.input.stars}/5 sao.`);});res.status(201).json({message:'Cảm ơn bạn đã đánh giá.'});
});

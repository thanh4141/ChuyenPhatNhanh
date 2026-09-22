import { Router } from 'express';
import { z } from 'zod';
import { pool,transaction } from '../../config/database.js';
import { authorize } from '../../common/auth.js';
import { AppError } from '../../common/errors.js';
import { id,text,pagination,validate } from '../../common/validation.js';
export const employeesRouter=Router();
const profileSelect='SELECT p.*,u.name,u.phone,u.email,u.active,u.address FROM employee_profiles p JOIN users u ON u.id=p.user_id';
employeesRouter.get('/me',authorize('employee'),async(req,res)=>{
  const {page,limit}=pagination.parse(req.query);
  const [[profile]]=await pool.execute(`${profileSelect} WHERE p.user_id=?`,[req.user.id]);
  const [[stats]]=await pool.execute("SELECT COUNT(*) AS total,COALESCE(SUM(status='completed'),0) AS completed,COALESCE(SUM(status='incomplete'),0) AS incomplete FROM orders WHERE employee_id=?",[req.user.id]);
  const [[ratings]]=await pool.execute('SELECT COUNT(*) AS review_count,COALESCE(ROUND(AVG(stars),2),0) AS average_stars FROM reviews WHERE employee_id=?',[req.user.id]);
  const [reviews]=await pool.query('SELECT r.*,u.name AS customer_name,o.tracking_code FROM reviews r JOIN users u ON u.id=r.customer_id JOIN orders o ON o.id=r.order_id WHERE r.employee_id=? ORDER BY r.id DESC LIMIT ? OFFSET ?',[req.user.id,limit,(page-1)*limit]);
  res.json({profile:profile||null,stats:{...stats,...ratings},reviews,page,limit});
});
employeesRouter.use(authorize('admin'));
employeesRouter.get('/',async(req,res)=>{const {page,limit,q}=pagination.parse(req.query);const values=Array(4).fill(`%${q}%`);const where='p.employee_code LIKE ? OR u.name LIKE ? OR u.phone LIKE ? OR p.identity_number LIKE ?';const [[{total}]]=await pool.execute(`SELECT COUNT(*) AS total FROM employee_profiles p JOIN users u ON u.id=p.user_id WHERE ${where}`,values);const [items]=await pool.query(`${profileSelect} WHERE ${where} ORDER BY p.id DESC LIMIT ? OFFSET ?`,[...values,limit,(page-1)*limit]);res.json({items,total,page,limit});});
const profileSchema=z.object({user_id:id,employee_code:text(30).regex(/^[A-Za-z0-9_-]+$/,'Mã nhân viên chỉ gồm chữ, số, gạch ngang.'),hometown:z.string().trim().max(255).default(''),identity_number:z.union([z.literal(''),z.string().regex(/^\d{12}$/,'CCCD cần đúng 12 chữ số.')]).default(''),hired_at:z.iso.date(),employment_status:z.enum(['active','stopped'])}).strict();
async function save(req,res){
  const input=req.input,profileId=req.params.id?id.parse(req.params.id):null;
  await transaction(async c=>{
    const [[user]]=await c.execute("SELECT id FROM users WHERE id=? AND role='employee' FOR UPDATE",[input.user_id]);if(!user)throw new AppError(400,'Cần chọn tài khoản nhân viên hợp lệ.');
    if(profileId){const [[current]]=await c.execute('SELECT user_id FROM employee_profiles WHERE id=? FOR UPDATE',[profileId]);if(!current)throw new AppError(404,'Không tìm thấy hồ sơ.');if(current.user_id!==input.user_id)throw new AppError(400,'Không được chuyển hồ sơ sang tài khoản khác.');}
    if(input.employment_status==='stopped'){const [[{count}]]=await c.execute("SELECT COUNT(*) AS count FROM orders WHERE employee_id=? AND status NOT IN ('completed','incomplete','cancelled')",[input.user_id]);if(count)throw new AppError(409,'Nhân viên cần xử lý xong các đơn đã nhận trước khi ngừng làm việc.');await c.execute('UPDATE users SET active=FALSE,token_version=token_version+1 WHERE id=?',[input.user_id]);}
    const record={...input,identity_number:input.identity_number||null};
    if(profileId)await c.execute(`UPDATE employee_profiles SET ${Object.keys(record).map(k=>`${k}=?`).join(',')} WHERE id=?`,[...Object.values(record),profileId]);
    else await c.execute(`INSERT INTO employee_profiles(${Object.keys(record).join(',')}) VALUES (${Object.keys(record).map(()=>'?').join(',')})`,Object.values(record));
  });res.status(profileId?200:201).json({message:'Đã lưu hồ sơ nhân viên.'});
}
employeesRouter.post('/',validate(profileSchema),save);
employeesRouter.patch('/:id',validate(profileSchema),save);

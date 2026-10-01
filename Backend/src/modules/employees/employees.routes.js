import { dbColumn } from '../../config/database-names.js';
import { Router } from 'express';
import { z } from 'zod';
import { pool,transaction } from '../../config/database.js';
import { authorize } from '../../common/auth.js';
import { AppError } from '../../common/errors.js';
import { id,text,phone,pagination,validate } from '../../common/validation.js';
export const employeesRouter=Router();
const profileSelect="SELECT p.*,COALESCE(u.ten,p.ten) AS ten,COALESCE(u.so_dien_thoai,p.so_dien_thoai) AS so_dien_thoai,u.thu_dien_tu,u.dang_hoat_dong,COALESCE(u.dia_chi_lien_he,p.dia_chi_lien_he) AS dia_chi_lien_he FROM ho_so_nhan_vien p LEFT JOIN tai_khoan u ON u.ma_so=p.ma_tai_khoan";
employeesRouter.get('/me',authorize('employee'),async(req,res)=>{
  const {page,limit}=pagination.parse(req.query);
  const [[profile]]=await pool.execute(`${profileSelect} WHERE p.ma_tai_khoan=?`,[req.user.id]);
  const [[stats]]=await pool.execute("SELECT COUNT(*) AS total,COALESCE(SUM(trang_thai='completed'),0) AS completed,COALESCE(SUM(trang_thai='incomplete'),0) AS incomplete FROM don_hang WHERE ma_nhan_vien=?",[req.user.id]);
  const [[pickups]]=await pool.execute("SELECT COUNT(*) AS pickup_count,COALESCE(SUM(EXISTS(SELECT 1 FROM nhat_ky_kho k WHERE k.ma_don_hang=o.ma_so AND k.loai='pickup_received')),0) AS handed_over FROM don_hang o WHERE o.ma_nv_lay_hang=?",[req.user.id]);
  const [[ratings]]=await pool.execute("SELECT COUNT(*) AS review_count,COALESCE(ROUND(AVG(so_sao),2),0) AS average_stars FROM danh_gia WHERE ma_nhan_vien=?",[req.user.id]);
  const [reviews]=await pool.query("SELECT r.*,u.ten AS customer_name,o.ma_van_don FROM danh_gia r JOIN tai_khoan u ON u.ma_so=r.ma_khach_hang JOIN don_hang o ON o.ma_so=r.ma_don_hang WHERE r.ma_nhan_vien=? ORDER BY r.ma_so DESC LIMIT ? OFFSET ?",[req.user.id,limit,(page-1)*limit]);
  res.json({profile:profile||null,stats:{...stats,...ratings,...pickups},reviews,page,limit});
});
employeesRouter.use(authorize('admin','station_manager'));

employeesRouter.get('/',async(req,res)=>{
 const {page,limit,q,available}=pagination.extend({available:z.enum(['1']).optional()}).parse(req.query);
 const values=Array(4).fill('%'+q+'%');
 let where="(p.ma_nhan_vien_noi_bo LIKE ? OR COALESCE(u.ten,p.ten) LIKE ? OR COALESCE(u.so_dien_thoai,p.so_dien_thoai) LIKE ? OR p.so_cccd LIKE ?)"+(available?" AND p.ma_tai_khoan IS NULL AND p.trang_thai_lam_viec='active'":'');
 if(req.user.role==='station_manager'){where+=' AND p.ma_tram=?';values.push(req.user.station_id||0);}
 const [[{total}]]=await pool.execute('SELECT COUNT(*) AS total FROM ho_so_nhan_vien p LEFT JOIN tai_khoan u ON u.ma_so=p.ma_tai_khoan WHERE '+where,values);
 const [items]=await pool.query(profileSelect+' WHERE '+where+' ORDER BY p.ma_so DESC LIMIT ? OFFSET ?',[...values,limit,(page-1)*limit]);res.json({items,total,page,limit});
});
const profileSchema=z.object({station_id:id.nullable().optional(),user_id:id.optional(),name:text(120).optional(),phone:phone.optional(),address:z.string().trim().max(500).default(''),employee_code:text(30).regex(/^[A-Za-z0-9_-]+$/,'Mã nhân viên chỉ gồm chữ, số, gạch ngang.'),hometown:z.string().trim().max(255).default(''),identity_number:z.union([z.literal(''),z.string().regex(/^\d{12}$/,'CCCD cần đúng 12 chữ số.')]).default(''),hired_at:z.iso.date(),employment_status:z.enum(['active','stopped'])}).strict().refine(v=>v.user_id||(v.name&&v.phone),'Nhập họ tên và số điện thoại nhân viên.');
async function save(req,res){
 const input=req.input,profileId=req.params.id?id.parse(req.params.id):null;
 const savedId=await transaction(async c=>{
  let current=null,user=null;
  if(profileId){const [[p]]=await c.execute('SELECT * FROM ho_so_nhan_vien WHERE ma_so=? FOR UPDATE',[profileId]);if(!p)throw new AppError(404,'Không tìm thấy hồ sơ.');current=p;}
  if(req.user.role==='station_manager'&&(!req.user.station_id||(current&&current.station_id!==req.user.station_id)||(input.station_id&&input.station_id!==req.user.station_id)))throw new AppError(403,'Hồ sơ không thuộc trạm.');
  const stationId=req.user.role==='station_manager'?req.user.station_id:input.station_id===undefined?current?.station_id||null:input.station_id;
  if(stationId){const [[s]]=await c.execute('SELECT ma_so FROM tram_chuyen_phat WHERE ma_so=? AND dang_hoat_dong=TRUE',[stationId]);if(!s)throw new AppError(400,'Trạm không hợp lệ.');}
  const userId=current?current.user_id:input.user_id||null;
  if(current&&input.user_id!==undefined&&input.user_id!==current.user_id)throw new AppError(400,'Không được chuyển hồ sơ sang tài khoản khác.');
  if(userId){const [[u]]=await c.execute("SELECT * FROM tai_khoan WHERE ma_so=? AND vai_tro='employee' FOR UPDATE",[userId]);if(!u)throw new AppError(400,'Tài khoản nhân viên không hợp lệ.');user=u;}
  if(userId&&stationId!==user.station_id){
    const [[{count}]]=await c.execute("SELECT COUNT(*) AS count FROM don_hang WHERE ma_nhan_vien=? AND trang_thai NOT IN ('completed','incomplete','cancelled')",[userId]);if(count)throw new AppError(409,'Nhân viên đang có nhiệm vụ, chưa thể chuyển trạm.');
    if(req.user.role==='station_manager'&&user.station_id!==req.user.station_id)throw new AppError(403,'Không thể lấy nhân viên từ trạm khác.');
    await c.execute('UPDATE tai_khoan SET ma_tram=?,phien_ban_token=phien_ban_token+1 WHERE ma_so=?',[stationId,userId]);
  }
  if(input.employment_status==='stopped'&&userId){
   const [[{count}]]=await c.execute("SELECT COUNT(*) AS count FROM don_hang WHERE ma_nhan_vien=? AND trang_thai NOT IN ('completed','incomplete','cancelled')",[userId]);
   if(count)throw new AppError(409,'Nhân viên cần xử lý xong các đơn đã nhận trước khi ngừng làm việc.');
   await c.execute('UPDATE tai_khoan SET dang_hoat_dong=FALSE,phien_ban_token=phien_ban_token+1 WHERE ma_so=?',[userId]);
  }
  const record={...input,station_id:stationId,user_id:userId,name:input.name||user?.name,phone:input.phone||user?.phone,address:input.name?input.address:user?.address||input.address,identity_number:input.identity_number||null};
  if(userId&&input.name)await c.execute('UPDATE tai_khoan SET ten=?,so_dien_thoai=?,dia_chi_lien_he=? WHERE ma_so=?',[record.name,record.phone,record.address,userId]);
  if(profileId){await c.execute('UPDATE ho_so_nhan_vien SET '+Object.keys(record).map(k=>dbColumn(k)+'=?').join(',')+' WHERE ma_so=?',[...Object.values(record),profileId]);return profileId;}
  const [result]=await c.execute('INSERT INTO ho_so_nhan_vien('+Object.keys(record).map(dbColumn).join(',')+') VALUES ('+Object.keys(record).map(()=>'?').join(',')+')',Object.values(record));return result.insertId;
 });res.status(profileId?200:201).json({id:savedId,message:'Đã lưu hồ sơ nhân viên.'});
}
employeesRouter.post('/',validate(profileSchema),save);
employeesRouter.patch('/:id',validate(profileSchema),save);

import { dbColumn } from '../../config/database-names.js';
import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { pool, transaction } from '../../config/database.js';
import { authorize, userColumns } from '../../common/auth.js';
import { AppError } from '../../common/errors.js';
import { email, password, phone, text, id, pagination, validate } from '../../common/validation.js';

export const usersRouter = Router();
usersRouter.use(authorize('admin','station_manager'));
usersRouter.get('/', async (req, res) => {
  const { page, limit, q, role, active, station_id } = pagination.extend({ station_id:id.optional(), role: z.enum(['admin','employee','customer','station_manager']).optional(), active: z.enum(['0','1']).optional() }).parse(req.query);
  const where = ['1=1']; const values = [];
  if(req.user.role==='station_manager'){
    if(role&&role!=='employee')throw new AppError(403,'Chỉ quản lý tài khoản nhân viên tại trạm.');
    where.push("vai_tro='employee' AND ma_tram=?");values.push(req.user.station_id||0);
  }
  if(station_id){if(req.user.role==='station_manager'&&station_id!==req.user.station_id)throw new AppError(403,'Trạm không thuộc quyền quản lý.');where.push('ma_tram=?');values.push(station_id);}
  if (role) { where.push("vai_tro=?"); values.push(role); }
  if (active) { where.push("dang_hoat_dong=?"); values.push(Number(active)); }
  if (q) { where.push("(ten LIKE ? OR thu_dien_tu LIKE ? OR so_dien_thoai LIKE ?)"); values.push(...Array(3).fill(`%${q}%`)); }
  const clause = where.join(' AND ');
  const [[{ total }]] = await pool.execute(`SELECT COUNT(*) AS total FROM tai_khoan WHERE ${clause}`, values);
  const [items] = await pool.query(`SELECT ${userColumns} FROM tai_khoan WHERE ${clause} ORDER BY ma_so DESC LIMIT ? OFFSET ?`, [...values, limit, (page - 1) * limit]);
  res.json({ items, total, page, limit });
});
usersRouter.post('/', validate(z.object({ profile_id:id, email, password }).strict()), async (req, res) => {
  const hash=await bcrypt.hash(req.input.password,12);
  const user=await transaction(async c=>{
    const [[profile]]=await c.execute('SELECT * FROM ho_so_nhan_vien WHERE ma_so=? FOR UPDATE',[req.input.profile_id]);
    if(!profile)throw new AppError(404,'Không tìm thấy hồ sơ nhân viên.');
    if(req.user.role==='station_manager'&&(!req.user.station_id||profile.station_id!==req.user.station_id))throw new AppError(403,'Hồ sơ không thuộc trạm của bạn.');
    if(profile.user_id)throw new AppError(409,'Nhân viên này đã có tài khoản.');
    if(profile.employment_status!=='active')throw new AppError(409,'Chỉ tạo tài khoản cho nhân viên đang làm việc.');
    const [result]=await c.execute("INSERT INTO tai_khoan(ten,thu_dien_tu,so_dien_thoai,mat_khau_bam,vai_tro,dia_chi_lien_he,ma_tram) VALUES (?,?,?,?,'employee',?,?)",[profile.name,req.input.email,profile.phone,hash,profile.address,profile.station_id||null]);
    await c.execute('UPDATE ho_so_nhan_vien SET ma_tai_khoan=? WHERE ma_so=?',[result.insertId,profile.id]);
    const [[created]]=await c.execute(`SELECT ${userColumns} FROM tai_khoan WHERE ma_so=?`,[result.insertId]);return created;
  });
  res.status(201).json({ user });
});
usersRouter.patch('/:id', validate(z.object({ name: text(120).optional(), email: email.optional(), password: password.optional(), phone: phone.optional(), address: z.string().trim().max(500).optional(), active: z.boolean().optional() }).strict().refine(v => Object.keys(v).length > 0)), async (req, res) => {
  const userId = id.parse(req.params.id);
  const user = await transaction(async connection => {
    const [[target]] = await connection.execute(`SELECT ${userColumns} FROM tai_khoan WHERE ma_so=? FOR UPDATE`, [userId]);
    if (!target) throw new AppError(404, 'Không tìm thấy người dùng.');
    if(req.user.role==='station_manager'&&(target.role!=='employee'||!req.user.station_id||target.station_id!==req.user.station_id))throw new AppError(403,'Tài khoản không thuộc trạm của bạn.');
    if(target.role==='customer' && Object.keys(req.input).some(key=>key!=='active'))throw new AppError(403,'Quản lí chỉ được khóa hoặc mở khóa tài khoản khách hàng.');
    if (target.role === 'admin' && req.input.active === false) throw new AppError(400, 'Không thể khóa tài khoản quản trị.');
    if (target.role === 'employee' && req.input.active === false) {
      const [[{ count }]] = await connection.execute("SELECT COUNT(*) AS count FROM don_hang WHERE ma_nhan_vien=? AND trang_thai NOT IN ('completed','incomplete','cancelled')", [userId]);
      if (count > 0) throw new AppError(409, 'Nhân viên cần xử lý xong các đơn đã nhận trước khi khóa tài khoản.');
    }
    const record={...req.input};
    if(record.password){record.password_hash=await bcrypt.hash(record.password,12);delete record.password;}
    const fields = Object.keys(record);
    const revoke = req.input.active === false || req.input.password ? ', phien_ban_token=phien_ban_token+1' : '';
    await connection.execute(`UPDATE tai_khoan SET ${fields.map(key => `${dbColumn(key)}=?`).join(',')}${revoke} WHERE ma_so=?`, [...Object.values(record), userId]);
    const {password_hash,...safe}=record;
    return { ...target, ...safe };
  });
  res.json({ user });
});

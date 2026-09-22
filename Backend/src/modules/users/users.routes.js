import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { pool, transaction } from '../../config/database.js';
import { authorize, userColumns } from '../../common/auth.js';
import { AppError } from '../../common/errors.js';
import { email, password, phone, text, id, pagination, validate } from '../../common/validation.js';

export const usersRouter = Router();
usersRouter.use(authorize('admin'));
usersRouter.get('/', async (req, res) => {
  const { page, limit, q, role, active } = pagination.extend({ role: z.enum(['admin','employee','customer']).optional(), active: z.enum(['0','1']).optional() }).parse(req.query);
  const where = ['1=1']; const values = [];
  if (role) { where.push('role=?'); values.push(role); }
  if (active) { where.push('active=?'); values.push(Number(active)); }
  if (q) { where.push('(name LIKE ? OR email LIKE ? OR phone LIKE ?)'); values.push(...Array(3).fill(`%${q}%`)); }
  const clause = where.join(' AND ');
  const [[{ total }]] = await pool.execute(`SELECT COUNT(*) AS total FROM users WHERE ${clause}`, values);
  const [items] = await pool.query(`SELECT ${userColumns} FROM users WHERE ${clause} ORDER BY id DESC LIMIT ? OFFSET ?`, [...values, limit, (page - 1) * limit]);
  res.json({ items, total, page, limit });
});
usersRouter.post('/', validate(z.object({ name: text(120), email, phone, password, role: z.literal('employee'), address: z.string().trim().max(500).default('') }).strict()), async (req, res) => {
  const { name, email, phone, password, role, address } = req.input;
  const [result] = await pool.execute('INSERT INTO users (name,email,phone,password_hash,role,address) VALUES (?,?,?,?,?,?)', [name, email, phone, await bcrypt.hash(password, 12), role, address]);
  const [[user]] = await pool.execute(`SELECT ${userColumns} FROM users WHERE id=?`, [result.insertId]);
  res.status(201).json({ user });
});
usersRouter.patch('/:id', validate(z.object({ name: text(120).optional(), email: email.optional(), password: password.optional(), phone: phone.optional(), address: z.string().trim().max(500).optional(), active: z.boolean().optional() }).strict().refine(v => Object.keys(v).length > 0)), async (req, res) => {
  const userId = id.parse(req.params.id);
  const user = await transaction(async connection => {
    const [[target]] = await connection.execute(`SELECT ${userColumns} FROM users WHERE id=? FOR UPDATE`, [userId]);
    if (!target) throw new AppError(404, 'Không tìm thấy người dùng.');
    if(target.role==='customer' && Object.keys(req.input).some(key=>key!=='active'))throw new AppError(403,'Quản lí chỉ được khóa hoặc mở khóa tài khoản khách hàng.');
    if (target.role === 'admin' && req.input.active === false) throw new AppError(400, 'Không thể khóa tài khoản quản trị.');
    if (target.role === 'employee' && req.input.active === false) {
      const [[{ count }]] = await connection.execute("SELECT COUNT(*) AS count FROM orders WHERE employee_id=? AND status NOT IN ('completed','incomplete','cancelled')", [userId]);
      if (count > 0) throw new AppError(409, 'Nhân viên cần xử lý xong các đơn đã nhận trước khi khóa tài khoản.');
    }
    const record={...req.input};
    if(record.password){record.password_hash=await bcrypt.hash(record.password,12);delete record.password;}
    const fields = Object.keys(record);
    const revoke = req.input.active === false || req.input.password ? ', token_version=token_version+1' : '';
    await connection.execute(`UPDATE users SET ${fields.map(key => `${key}=?`).join(',')}${revoke} WHERE id=?`, [...Object.values(record), userId]);
    const {password_hash,...safe}=record;
    return { ...target, ...safe };
  });
  res.json({ user });
});

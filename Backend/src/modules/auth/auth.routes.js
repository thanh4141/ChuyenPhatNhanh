import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { rateLimit } from 'express-rate-limit';
import { pool } from '../../config/database.js';
import { authenticate, signToken, userColumns } from '../../common/auth.js';
import { AppError } from '../../common/errors.js';
import { email, password, phone, text, validate } from '../../common/validation.js';

export const authRouter = Router();
const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false, message: { message: 'Bạn thử quá nhiều lần. Vui lòng thử lại sau 15 phút.' } });
const publicUser = user => { const { password_hash, token_version, ...safe } = user; return safe; };

authRouter.post('/register', authLimit, validate(z.object({ name: text(120), email, phone, password, address: z.string().trim().max(500).default('') }).strict()), async (req, res) => {
  const { name, email, phone, password, address } = req.input;
  const hash = await bcrypt.hash(password, 12);
  const [result] = await pool.execute("INSERT INTO tai_khoan (ten,thu_dien_tu,so_dien_thoai,mat_khau_bam,dia_chi_lien_he,vai_tro) VALUES (?,?,?,?,?,'customer')", [name, email, phone, hash, address]);
  const [[user]] = await pool.execute(`SELECT ${userColumns}, phien_ban_token FROM tai_khoan WHERE ma_so = ?`, [result.insertId]);
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

authRouter.post('/login', authLimit, validate(z.object({ email, password: z.string().min(1).max(200) })), async (req, res) => {
  const [[user]] = await pool.execute(`SELECT ${userColumns}, mat_khau_bam, phien_ban_token FROM tai_khoan WHERE thu_dien_tu = ?`, [req.input.email]);
  const valid = user ? await bcrypt.compare(req.input.password, user.password_hash) : false;
  if (!valid || !user.active) throw new AppError(401, 'Email hoặc mật khẩu không đúng, hoặc tài khoản đã bị khóa.');
  res.json({ token: signToken(user), user: publicUser(user) });
});
authRouter.get('/me', authenticate, (req, res) => res.json({ user: publicUser(req.user) }));
authRouter.patch('/me', authenticate, validate(z.object({ name: text(120), phone, address: z.string().trim().max(500).default('') }).strict()), async (req, res) => {
  const { name, phone, address } = req.input;
  await pool.execute("UPDATE tai_khoan SET ten=?,so_dien_thoai=?,dia_chi_lien_he=? WHERE ma_so=?", [name, phone, address, req.user.id]);
  const [[user]] = await pool.execute(`SELECT ${userColumns} FROM tai_khoan WHERE ma_so=?`, [req.user.id]);
  res.json({ user });
});
authRouter.post('/change-password', authenticate, validate(z.object({ current_password: z.string().min(1).max(200), new_password: password })), async (req, res) => {
  const [[user]] = await pool.execute("SELECT mat_khau_bam FROM tai_khoan WHERE ma_so=?", [req.user.id]);
  if (!await bcrypt.compare(req.input.current_password, user.password_hash)) throw new AppError(400, 'Mật khẩu hiện tại không đúng.');
  await pool.execute("UPDATE tai_khoan SET mat_khau_bam=?,phien_ban_token=phien_ban_token+1 WHERE ma_so=?", [await bcrypt.hash(req.input.new_password, 12), req.user.id]);
  res.json({ message: 'Đã đổi mật khẩu. Vui lòng đăng nhập lại trên các thiết bị.' });
});
authRouter.post('/logout', authenticate, async (req, res) => {
  await pool.execute("UPDATE tai_khoan SET phien_ban_token=phien_ban_token+1 WHERE ma_so=?", [req.user.id]);
  res.json({ message: 'Đã đăng xuất trên các thiết bị.' });
});

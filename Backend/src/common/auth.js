import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { pool } from '../config/database.js';
import { AppError } from './errors.js';

export const userColumns = 'id, name, email, phone, address, role, active, created_at';
export function signToken(user) {
  return jwt.sign({ sub: String(user.id), version: user.token_version }, env.jwtSecret, { algorithm: 'HS256', expiresIn: '12h', issuer: 'chuyen-phat-nhanh', audience: 'cpn-clients' });
}
export async function authenticate(req, res, next) {
  const token = req.headers.authorization?.match(/^Bearer (\S+)$/)?.[1];
  if (!token) throw new AppError(401, 'Vui lòng đăng nhập.');
  let claims;
  try { claims = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'], issuer: 'chuyen-phat-nhanh', audience: 'cpn-clients' }); }
  catch { throw new AppError(401, 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'); }
  const [[user]] = await pool.execute(`SELECT ${userColumns}, token_version FROM users WHERE id = ?`, [claims.sub]);
  if (!user || !user.active || user.token_version !== claims.version) throw new AppError(401, 'Tài khoản hoặc phiên đăng nhập không còn hiệu lực.');
  req.user = user;
  next();
}
export const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) throw new AppError(403, 'Bạn không có quyền thực hiện thao tác này.');
  next();
};

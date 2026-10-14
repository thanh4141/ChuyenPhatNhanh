import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { pool } from "../config/database.js";
import { AppError } from "./errors.js";

export const userColumns =
  "ma_so, ten, thu_dien_tu, so_dien_thoai, dia_chi_lien_he, vai_tro, dang_hoat_dong, ngay_tao, ma_tram";
export function signToken(user) {
  return jwt.sign(
    { sub: String(user.id), version: user.token_version },
    env.jwtSecret,
    {
      algorithm: "HS256",
      expiresIn: "12h",
      issuer: "chuyen-phat-nhanh",
      audience: "cpn-clients",
    },
  );
}
export async function authenticate(req, res, next) {
  const token =
    req.headers.authorization?.match(/^Bearer (\S+)$/)?.[1] || req.query?.token;
  if (!token) throw new AppError(401, "Vui lòng đăng nhập.");
  let claims;
  try {
    claims = jwt.verify(token, env.jwtSecret, {
      algorithms: ["HS256"],
      issuer: "chuyen-phat-nhanh",
      audience: "cpn-clients",
    });
  } catch {
    throw new AppError(
      401,
      "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
    );
  }
  const [[user]] = await pool.execute(
    `SELECT ${userColumns}, phien_ban_token FROM tai_khoan WHERE ma_so = ?`,
    [claims.sub],
  );
  if (!user || !user.active || user.token_version !== claims.version)
    throw new AppError(
      401,
      "Tài khoản hoặc phiên đăng nhập không còn hiệu lực.",
    );
  req.user = user;
  next();
}
export const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role))
      throw new AppError(403, "Bạn không có quyền thực hiện thao tác này.");
    next();
  };

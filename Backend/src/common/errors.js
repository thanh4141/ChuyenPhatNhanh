import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error instanceof ZodError) {
    return res.status(400).json({ message: 'Thông tin chưa hợp lệ.', errors: error.issues.map(i => ({ field: i.path.join('.'), message: i.message })) });
  }
  if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Email hoặc mã dữ liệu đã tồn tại.' });
  if (error.type === 'entity.parse.failed') return res.status(400).json({ message: 'JSON không hợp lệ.' });
  if (error.type === 'entity.too.large') return res.status(413).json({ message: 'Dữ liệu gửi lên quá lớn.' });
  if (error.status) return res.status(error.status).json({ message: error.message });
  console.error(`[${req.method} ${req.path}]`, error.code || error.message);
  return res.status(500).json({ message: 'Máy chủ gặp lỗi. Vui lòng thử lại sau.' });
}

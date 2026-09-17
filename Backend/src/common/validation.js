import { z } from 'zod';

export const text = (max = 255) => z.string().trim().min(1, 'Không được để trống.').max(max);
export const phone = z.string().trim().regex(/^(?:0|\+84)[0-9]{9,10}$/, 'Số điện thoại Việt Nam không hợp lệ.');
export const email = z.email('Email không hợp lệ.').trim().toLowerCase().max(190);
export const password = z.string().min(8, 'Mật khẩu cần ít nhất 8 ký tự.').refine(v => Buffer.byteLength(v, 'utf8') <= 72, 'Mật khẩu tối đa 72 byte.');
export const id = z.coerce.number().int().positive();
export const pagination = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20), q: z.string().trim().max(100).default('') });
export const optionalNote = z.string().trim().max(1000).default('');
export const validate = schema => (req, res, next) => { req.input = schema.parse(req.body); next(); };

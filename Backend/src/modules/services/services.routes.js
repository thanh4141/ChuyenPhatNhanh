import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../config/database.js';
import { authorize } from '../../common/auth.js';
import { AppError } from '../../common/errors.js';
import { id, text, validate } from '../../common/validation.js';
import { calculateFee } from '../orders/order.domain.js';

export const servicesRouter = Router();
export const quoteSchema = z.object({ service_id: id, weight: z.coerce.number().min(0.01).max(1000).refine(v => Math.abs(v * 100 - Math.round(v * 100)) < 0.00001, 'Khối lượng tối đa 2 chữ số thập phân.'), zone: z.enum(['same_city','domestic']) });
servicesRouter.get('/', async (req, res) => {
  const [items] = await pool.execute(`SELECT * FROM services ${req.user.role === 'admin' ? '' : 'WHERE active=TRUE'} ORDER BY id`);
  res.json({ items });
});
servicesRouter.post('/quote', validate(quoteSchema), async (req, res) => {
  const [[service]] = await pool.execute('SELECT * FROM services WHERE id=? AND active=TRUE', [req.input.service_id]);
  if (!service) throw new AppError(404, 'Dịch vụ không khả dụng.');
  res.json({ shipping_fee: calculateFee(service, req.input.weight, req.input.zone), estimated_days: service.estimated_days });
});
servicesRouter.patch('/:id', authorize('admin'), validate(z.object({ name: text(100), description: text(255), base_fee: z.number().int().min(0).max(10000000), extra_half_kg: z.number().int().min(0).max(1000000), domestic_surcharge: z.number().int().min(0).max(10000000), estimated_days: text(30), active: z.boolean() }).strict()), async (req, res) => {
  const fields = Object.keys(req.input);
  const [result] = await pool.execute(`UPDATE services SET ${fields.map(key => `${key}=?`).join(',')} WHERE id=?`, [...Object.values(req.input), id.parse(req.params.id)]);
  if (!result.affectedRows) throw new AppError(404, 'Không tìm thấy dịch vụ.');
  res.json({ message: 'Đã cập nhật bảng giá. Cước các đơn đã tạo được giữ nguyên.' });
});

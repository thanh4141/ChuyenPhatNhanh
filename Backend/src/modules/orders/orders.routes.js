import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { pool, transaction } from '../../config/database.js';
import { authorize } from '../../common/auth.js';
import { AppError } from '../../common/errors.js';
import { id, text, phone, pagination, optionalNote, validate } from '../../common/validation.js';
import { quoteSchema } from '../services/services.routes.js';
import { assertTransition, calculateFee, canAccess, statusLabels } from './order.domain.js';

export const ordersRouter = Router();
const orderSelect = `SELECT o.*, s.name AS service_name, c.name AS customer_name, e.name AS employee_name
  FROM orders o JOIN services s ON s.id=o.service_id JOIN users c ON c.id=o.customer_id LEFT JOIN users e ON e.id=o.employee_id`;
const orderSchema = quoteSchema.extend({
  customer_id: id.optional(), sender_name: text(120), sender_phone: phone, sender_address: text(500),
  receiver_name: text(120), receiver_phone: phone, receiver_address: text(500), package_name: text(200),
  cod_amount: z.number().int().min(0).max(100000000).default(0), payer: z.enum(['sender','receiver']).default('sender'), note: optionalNote,
}).strict();

ordersRouter.get('/', async (req, res) => {
  const { page, limit, q, status } = pagination.extend({ status: z.enum(Object.keys(statusLabels)).optional() }).parse(req.query);
  const clauses = ['1=1']; const params = [];
  if (req.user.role !== 'admin') { clauses.push(req.user.role === 'customer' ? 'o.customer_id=?' : 'o.employee_id=?'); params.push(req.user.id); }
  if (status) { clauses.push('o.status=?'); params.push(status); }
  if (q) { clauses.push('(o.tracking_code LIKE ? OR o.receiver_name LIKE ? OR o.receiver_phone LIKE ?)'); params.push(...Array(3).fill(`%${q}%`)); }
  const where = clauses.join(' AND ');
  const [[{ total }]] = await pool.execute(`SELECT COUNT(*) AS total FROM orders o WHERE ${where}`, params);
  const [items] = await pool.query(`${orderSelect} WHERE ${where} ORDER BY o.created_at DESC, o.id DESC LIMIT ? OFFSET ?`, [...params, limit, (page - 1) * limit]);
  res.json({ items, total, page, limit });
});

ordersRouter.post('/', authorize('admin','customer'), validate(orderSchema), async (req, res) => {
  const input = req.input;
  const customerId = req.user.role === 'customer' ? req.user.id : input.customer_id;
  if (!customerId) throw new AppError(400, 'Vui lòng chọn khách hàng.');
  const orderId = await transaction(async connection => {
    const [[customer]] = await connection.execute("SELECT id FROM users WHERE id=? AND role='customer' AND active=TRUE FOR SHARE", [customerId]);
    if (!customer) throw new AppError(400, 'Khách hàng không hợp lệ.');
    const [[service]] = await connection.execute('SELECT * FROM services WHERE id=? AND active=TRUE FOR SHARE', [input.service_id]);
    if (!service) throw new AppError(400, 'Dịch vụ không khả dụng.');
    const tracking = `CPN${randomBytes(6).toString('hex').toUpperCase()}`;
    const values = [tracking, customerId, input.service_id, input.sender_name, input.sender_phone, input.sender_address, input.receiver_name, input.receiver_phone, input.receiver_address, input.package_name, input.weight, input.zone, input.cod_amount, calculateFee(service, input.weight, input.zone), input.payer, input.note];
    const [result] = await connection.execute(`INSERT INTO orders (tracking_code,customer_id,service_id,sender_name,sender_phone,sender_address,receiver_name,receiver_phone,receiver_address,package_name,weight,zone,cod_amount,shipping_fee,payer,note) VALUES (${values.map(() => '?').join(',')})`, values);
    await connection.execute('INSERT INTO order_events (order_id,actor_id,status,note) VALUES (?,?,?,?)', [result.insertId, req.user.id, 'pending', 'Đã tạo yêu cầu vận chuyển.']);
    return result.insertId;
  });
  const [[order]] = await pool.execute(`${orderSelect} WHERE o.id=?`, [orderId]);
  res.status(201).json({ order });
});

ordersRouter.get('/:id', async (req, res) => {
  const [[order]] = await pool.execute(`${orderSelect} WHERE o.id=?`, [id.parse(req.params.id)]);
  if (!order || !canAccess(order, req.user)) throw new AppError(404, 'Không tìm thấy đơn hàng.');
  const [events] = await pool.execute('SELECT ev.*, u.name AS actor_name FROM order_events ev JOIN users u ON u.id=ev.actor_id WHERE ev.order_id=? ORDER BY ev.id DESC', [order.id]);
  res.json({ order, events });
});

ordersRouter.patch('/:id/assign', authorize('admin'), validate(z.object({ employee_id: id }).strict()), async (req, res) => {
  await transaction(async connection => {
    // Lock employee first to serialize against account deactivation.
    const [[employee]] = await connection.execute("SELECT id,name FROM users WHERE id=? AND role='employee' AND active=TRUE FOR UPDATE", [req.input.employee_id]);
    if (!employee) throw new AppError(400, 'Nhân viên không khả dụng.');
    const [[order]] = await connection.execute('SELECT * FROM orders WHERE id=? FOR UPDATE', [id.parse(req.params.id)]);
    if (!order) throw new AppError(404, 'Không tìm thấy đơn hàng.');
    if (['delivered','cancelled'].includes(order.status)) throw new AppError(409, 'Không thể phân công đơn đã kết thúc.');
    if (order.employee_id === employee.id) throw new AppError(409, 'Đơn đã được phân công cho nhân viên này.');
    const status = order.status === 'pending' ? 'assigned' : order.status;
    await connection.execute('UPDATE orders SET employee_id=?,status=? WHERE id=?', [employee.id, status, order.id]);
    await connection.execute('INSERT INTO order_events (order_id,actor_id,status,note) VALUES (?,?,?,?)', [order.id, req.user.id, status, `Phân công vận chuyển: ${employee.name}.`]);
  });
  res.json({ message: 'Đã phân công nhân viên.' });
});

ordersRouter.patch('/:id/status', validate(z.object({ status: z.enum(Object.keys(statusLabels)), note: optionalNote }).strict()), async (req, res) => {
  await transaction(async connection => {
    const [[order]] = await connection.execute('SELECT * FROM orders WHERE id=? FOR UPDATE', [id.parse(req.params.id)]);
    if (!order || !canAccess(order, req.user)) throw new AppError(404, 'Không tìm thấy đơn hàng.');
    assertTransition(order, req.input.status, req.user, req.input.note);
    await connection.execute('UPDATE orders SET status=?,delivered_at=? WHERE id=?', [req.input.status, req.input.status === 'delivered' ? new Date() : null, order.id]);
    await connection.execute('INSERT INTO order_events (order_id,actor_id,status,note) VALUES (?,?,?,?)', [order.id, req.user.id, req.input.status, req.input.note || statusLabels[req.input.status]]);
  });
  res.json({ message: 'Đã cập nhật trạng thái.' });
});

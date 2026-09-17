import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { pool } from '../config/database.js';
import { authenticate } from '../common/auth.js';
import { AppError } from '../common/errors.js';
import { authRouter } from '../modules/auth/auth.routes.js';
import { usersRouter } from '../modules/users/users.routes.js';
import { servicesRouter } from '../modules/services/services.routes.js';
import { ordersRouter } from '../modules/orders/orders.routes.js';
import { dashboardRouter } from '../modules/dashboard/dashboard.routes.js';
import { statusLabels } from '../modules/orders/order.domain.js';

export const apiRouter = Router();
apiRouter.get('/health', async (req, res) => { await pool.query('SELECT 1'); res.json({ status: 'ok', database: 'mysql' }); });
apiRouter.use('/auth', authRouter);
apiRouter.get('/tracking/:code', rateLimit({ windowMs: 60000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false, message: { message: 'Vui lòng thử lại sau một phút.' } }), async (req, res) => {
  if (!/^CPN[A-Z0-9]{10,20}$/.test(req.params.code)) throw new AppError(404, 'Không tìm thấy mã vận đơn.');
  const [[order]] = await pool.execute('SELECT id,tracking_code,status,created_at,delivered_at FROM orders WHERE tracking_code=?', [req.params.code]);
  if (!order) throw new AppError(404, 'Không tìm thấy mã vận đơn.');
  const [rows] = await pool.execute('SELECT status,created_at FROM order_events WHERE order_id=? ORDER BY id DESC', [order.id]);
  const { id, ...safeOrder } = order;
  res.json({ order: safeOrder, events: rows.map(event => ({ ...event, label: statusLabels[event.status] })) });
});
apiRouter.use(authenticate);
apiRouter.use('/users', usersRouter);
apiRouter.use('/services', servicesRouter);
apiRouter.use('/orders', ordersRouter);
apiRouter.use('/dashboard', dashboardRouter);

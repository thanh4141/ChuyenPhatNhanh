import { Router } from 'express';
import { pool } from '../../config/database.js';
import { authorize } from '../../common/auth.js';

export const dashboardRouter = Router();
dashboardRouter.use(authorize('admin'));
dashboardRouter.get('/', async (req, res) => {
  const [[summary]] = await pool.query(`SELECT COUNT(*) AS total,
    COALESCE(SUM(status='pending'),0) AS pending,
    COALESCE(SUM(status NOT IN ('delivered','cancelled','pending')),0) AS shipping,
    COALESCE(SUM(status='delivered'),0) AS delivered,
    COALESCE(SUM(status='failed'),0) AS failed,
    COALESCE(SUM(CASE WHEN status='delivered' THEN shipping_fee ELSE 0 END),0) AS revenue,
    COALESCE(SUM(CASE WHEN status='delivered' THEN cod_amount ELSE 0 END),0) AS delivered_cod FROM orders`);
  const [statuses] = await pool.query('SELECT status,COUNT(*) AS count FROM orders GROUP BY status');
  const [daily] = await pool.query("SELECT DATE_FORMAT(created_at + INTERVAL 7 HOUR,'%Y-%m-%d') AS date,COUNT(*) AS count FROM orders WHERE created_at >= DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR)-INTERVAL 6 DAY-INTERVAL 7 HOUR GROUP BY DATE_FORMAT(created_at + INTERVAL 7 HOUR,'%Y-%m-%d') ORDER BY date");
  const [recent] = await pool.query('SELECT o.*,s.name AS service_name,e.name AS employee_name FROM orders o JOIN services s ON s.id=o.service_id LEFT JOIN users e ON e.id=o.employee_id ORDER BY o.id DESC LIMIT 6');
  const [[people]] = await pool.query("SELECT COALESCE(SUM(role='employee' AND active=TRUE),0) AS employees,COALESCE(SUM(role='customer'),0) AS customers FROM users");
  res.json({ summary: { ...summary, ...people }, statuses, daily, recent });
});

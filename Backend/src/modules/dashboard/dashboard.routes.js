import { orderSummaryColumns } from "../orders/order.columns.js";
import { Router } from "express";
import { pool } from "../../config/database.js";
import { authorize } from "../../common/auth.js";
import { dashboardPeriod } from "./period.js";

export const dashboardRouter = Router();
dashboardRouter.use(authorize("admin"));
dashboardRouter.get("/", async (req, res) => {
  const period = dashboardPeriod(req.query);
  const bounds = [period.start, period.end];
  // Summary, chart and recent orders are a cohort by creation date (Vietnam time).
  const where = "ngay_tao >= ? AND ngay_tao < ?";
  const [[summary]] = await pool.execute(
    `SELECT COUNT(*) AS total,
    COALESCE(SUM(trang_thai='pending'),0) AS pending,
    COALESCE(SUM(trang_thai NOT IN ('completed','incomplete','cancelled','pending')),0) AS shipping,
    COALESCE(SUM(trang_thai='completed'),0) AS delivered,
    COALESCE(SUM(trang_thai='incomplete'),0) AS failed,
    COALESCE(SUM(CASE WHEN trang_thai='completed' THEN tong_thanh_toan ELSE 0 END),0) AS revenue,
    COALESCE(SUM(CASE WHEN trang_thai='completed' THEN tien_thu_ho ELSE 0 END),0) AS delivered_cod
    FROM don_hang WHERE ${where}`,
    bounds,
  );
  const [statuses] = await pool.execute(
    `SELECT trang_thai,COUNT(*) AS count FROM don_hang WHERE ${where} GROUP BY trang_thai`,
    bounds,
  );
  const [counts] = await pool.execute(
    `SELECT DATE_FORMAT(ngay_tao + INTERVAL 7 HOUR,'%Y-%m-%d') AS date,COUNT(*) AS count FROM don_hang WHERE ${where} GROUP BY date ORDER BY date`,
    bounds,
  );
  const daily = Array.from({ length: period.days }, (_, i) => {
    const date = new Date(Date.parse(period.from + "T00:00:00Z") + i * 86400000)
      .toISOString()
      .slice(0, 10);
    return {
      date,
      count: Number(counts.find((row) => row.date === date)?.count || 0),
    };
  });
  const [recent] = await pool.execute(
    `SELECT ${orderSummaryColumns},s.ten AS service_name,e.ten AS employee_name FROM don_hang o JOIN dich_vu s ON s.ma_so=o.ma_dich_vu LEFT JOIN tai_khoan e ON e.ma_so=o.ma_nhan_vien WHERE o.ngay_tao >= ? AND o.ngay_tao < ? ORDER BY o.ma_so DESC LIMIT 6`,
    bounds,
  );
  const [[people]] = await pool.query(
    "SELECT COALESCE(SUM(vai_tro='employee' AND dang_hoat_dong=TRUE),0) AS employees,COALESCE(SUM(vai_tro='customer'),0) AS customers FROM tai_khoan",
  );
  // Rank actual deliveries in the period, including orders created earlier.
  // Aggregate orders and reviews separately to avoid multiplying delivery counts.
  const [leaderboard] = await pool.execute(
    `SELECT u.ma_so AS employee_id,u.ten AS employee_name,
    p.ma_nhan_vien_noi_bo AS employee_code,d.completed,d.revenue,
    COALESCE(r.average_stars,0) AS average_stars,COALESCE(r.review_count,0) AS review_count
    FROM (SELECT ma_nhan_vien,COUNT(*) AS completed,SUM(tong_thanh_toan) AS revenue
      FROM don_hang WHERE trang_thai='completed' AND ngay_giao_xong >= ? AND ngay_giao_xong < ? AND ma_nhan_vien IS NOT NULL GROUP BY ma_nhan_vien) d
    JOIN tai_khoan u ON u.ma_so=d.ma_nhan_vien
    LEFT JOIN ho_so_nhan_vien p ON p.ma_tai_khoan=u.ma_so
    LEFT JOIN (SELECT v.ma_nhan_vien,AVG(v.so_sao) AS average_stars,COUNT(*) AS review_count FROM danh_gia v
      JOIN don_hang o ON o.ma_so=v.ma_don_hang WHERE o.trang_thai='completed' AND o.ngay_giao_xong >= ? AND o.ngay_giao_xong < ? GROUP BY v.ma_nhan_vien) r ON r.ma_nhan_vien=u.ma_so
    ORDER BY d.completed DESC,average_stars DESC,u.ma_so ASC LIMIT 10`,
    [...bounds, ...bounds],
  );
  res.json({
    period: { from: period.from, to: period.to, timezone: "Asia/Ho_Chi_Minh" },
    summary: { ...summary, ...people },
    statuses,
    daily,
    recent,
    leaderboard,
  });
});

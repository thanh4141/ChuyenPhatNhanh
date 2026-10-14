import { Router } from "express";
import { pool } from "../../config/database.js";
import { id, pagination } from "../../common/validation.js";
import { AppError } from "../../common/errors.js";
export async function notify(c, userId, orderId, type, title, message) {
  await c.execute(
    "INSERT INTO thong_bao(ma_tai_khoan,ma_don_hang,loai,tieu_de,noi_dung) VALUES (?,?,?,?,?)",
    [userId, orderId, type, title, message],
  );
}
export async function notifyManagers(
  c,
  stationId,
  orderId,
  type,
  title,
  message,
) {
  await c.execute(
    "INSERT INTO thong_bao(ma_tai_khoan,ma_don_hang,loai,tieu_de,noi_dung) SELECT ma_so,?,?,?,? FROM tai_khoan WHERE dang_hoat_dong=TRUE AND (vai_tro='admin' OR (vai_tro='station_manager' AND ma_tram=?))",
    [orderId, type, title, message, stationId],
  );
}
export const notificationsRouter = Router();
notificationsRouter.get("/", async (req, res) => {
  const { page, limit } = pagination.parse(req.query),
    values = [req.user.id];
  let where = "n.ma_tai_khoan=?";
  if (req.user.role === "employee") {
    where +=
      " AND (n.loai<>'new_order' OR EXISTS(SELECT 1 FROM don_hang o WHERE o.ma_so=n.ma_don_hang AND o.trang_thai='pending' AND o.ma_nhan_vien IS NULL AND o.quang_duong_tram_lay_met IS NOT NULL AND o.ma_tram_gui=? AND o.ma_nv_lay_hang=?))";
    values.push(req.user.station_id || 0, req.user.id);
  }
  const [[{ total }]] = await pool.execute(
    "SELECT COUNT(*) AS total FROM thong_bao n WHERE " + where,
    values,
  );
  const [[{ unread }]] = await pool.execute(
    "SELECT COUNT(*) AS unread FROM thong_bao n WHERE " +
      where +
      " AND n.ngay_doc IS NULL",
    values,
  );
  const [items] = await pool.query(
    "SELECT n.* FROM thong_bao n WHERE " +
      where +
      " ORDER BY n.ma_so DESC LIMIT ? OFFSET ?",
    [...values, limit, (page - 1) * limit],
  );
  res.json({ items, total, unread_count: unread, page, limit });
});
notificationsRouter.patch("/read-all", async (req, res) => {
  await pool.execute(
    "UPDATE thong_bao SET ngay_doc=COALESCE(ngay_doc,UTC_TIMESTAMP()) WHERE ma_tai_khoan=?",
    [req.user.id],
  );
  res.json({ message: "Đã đọc tất cả thông báo." });
});
notificationsRouter.patch("/:id/read", async (req, res) => {
  const [result] = await pool.execute(
    "UPDATE thong_bao SET ngay_doc=COALESCE(ngay_doc,UTC_TIMESTAMP()) WHERE ma_so=? AND ma_tai_khoan=?",
    [id.parse(req.params.id), req.user.id],
  );
  if (!result.affectedRows)
    throw new AppError(404, "Không tìm thấy thông báo.");
  res.json({ message: "Đã đọc thông báo." });
});

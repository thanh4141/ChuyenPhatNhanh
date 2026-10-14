import { Router } from "express";
import { z } from "zod";
import { pool, transaction } from "../../config/database.js";
import { authorize } from "../../common/auth.js";
import { AppError } from "../../common/errors.js";
import { id, text, pagination, validate } from "../../common/validation.js";
import { canReadOrder } from "../orders/order.domain.js";
import { orderStationScope } from "../logistics/logistics.service.js";
import { notify } from "../notifications/notifications.routes.js";

export const complaintsRouter = Router();
complaintsRouter.use(authorize("customer", "admin", "station_manager"));
const statuses = ["open", "processing", "resolved", "rejected"];
const select = `SELECT k.*,o.ma_van_don,u.ten AS customer_name,r.ten AS handler_name
  FROM khieu_nai k JOIN don_hang o ON o.ma_so=k.ma_don_hang
  JOIN tai_khoan u ON u.ma_so=k.ma_khach_hang LEFT JOIN tai_khoan r ON r.ma_so=k.ma_nguoi_xu_ly`;

complaintsRouter.get("/", async (req, res) => {
  const { page, limit, q, order_id, status } = pagination
    .extend({ order_id: id.optional(), status: z.enum(statuses).optional() })
    .parse(req.query);
  const where = ["1=1"],
    values = [];
  if (req.user.role === "customer") {
    where.push("k.ma_khach_hang=?");
    values.push(req.user.id);
  }
  if (req.user.role === "station_manager") {
    where.push(orderStationScope);
    values.push(...Array(5).fill(req.user.station_id || 0));
  }
  if (order_id) {
    where.push("k.ma_don_hang=?");
    values.push(order_id);
  }
  if (status) {
    where.push("k.trang_thai=?");
    values.push(status);
  }
  if (q) {
    where.push("(o.ma_van_don LIKE ? OR k.tieu_de LIKE ?)");
    values.push("%" + q + "%", "%" + q + "%");
  }
  const clause = where.join(" AND ");
  const [[{ total }]] = await pool.execute(
    "SELECT COUNT(*) AS total FROM khieu_nai k JOIN don_hang o ON o.ma_so=k.ma_don_hang WHERE " +
      clause,
    values,
  );
  const [items] = await pool.query(
    `${select} WHERE ${clause} ORDER BY k.ma_so DESC LIMIT ? OFFSET ?`,
    [...values, limit, (page - 1) * limit],
  );
  res.json({ items, total, page, limit });
});

complaintsRouter.post(
  "/",
  authorize("customer"),
  validate(
    z
      .object({
        order_id: id,
        title: text(150).min(3),
        message: text(2000).min(10),
      })
      .strict(),
  ),
  async (req, res) => {
    const complaintId = await transaction(async (c) => {
      // Serialize duplicate submissions against the same order.
      const [[o]] = await c.execute(
        "SELECT ma_so,ma_khach_hang,ma_van_don,ma_tram_gui,ma_tram_dich,ma_tram_hien_tai FROM don_hang WHERE ma_so=? FOR UPDATE",
        [req.input.order_id],
      );
      if (!o || o.customer_id !== req.user.id)
        throw new AppError(404, "Không tìm thấy đơn hàng.");
      const [[existing]] = await c.execute(
        "SELECT ma_so FROM khieu_nai WHERE ma_don_hang=? AND ma_khach_hang=?",
        [o.id, req.user.id],
      );
      if (existing)
        throw new AppError(
          409,
          "Bạn đã gửi khiếu nại cho đơn này. Theo dõi phản hồi trong chi tiết đơn.",
        );
      const [r] = await c.execute(
        "INSERT INTO khieu_nai(ma_don_hang,ma_khach_hang,tieu_de,noi_dung) VALUES (?,?,?,?)",
        [o.id, req.user.id, req.input.title, req.input.message],
      );
      await notify(
        c,
        req.user.id,
        o.id,
        "complaint",
        "Đã tiếp nhận khiếu nại",
        o.tracking_code + ": " + req.input.title,
      );
      await c.execute(
        `INSERT INTO thong_bao(ma_tai_khoan,ma_don_hang,loai,tieu_de,noi_dung)
      SELECT ma_so,?,'complaint','Có khiếu nại mới',? FROM tai_khoan
      WHERE dang_hoat_dong=TRUE AND (vai_tro='admin' OR (vai_tro='station_manager' AND ma_tram IN (?,?,?)))`,
        [
          o.id,
          o.tracking_code + ": " + req.input.title,
          o.origin_station_id,
          o.destination_station_id,
          o.current_station_id,
        ],
      );
      return r.insertId;
    });
    res
      .status(201)
      .json({
        id: complaintId,
        message: "Đã gửi khiếu nại. Bạn sẽ nhận thông báo khi có phản hồi.",
      });
  },
);

complaintsRouter.patch(
  "/:id",
  authorize("admin", "station_manager"),
  validate(
    z
      .object({
        status: z.enum(["processing", "resolved", "rejected"]),
        response: text(2000).min(3),
      })
      .strict(),
  ),
  async (req, res) => {
    await transaction(async (c) => {
      const [[k]] = await c.execute(
        "SELECT * FROM khieu_nai WHERE ma_so=? FOR UPDATE",
        [id.parse(req.params.id)],
      );
      if (!k) throw new AppError(404, "Không tìm thấy khiếu nại.");
      const [[o]] = await c.execute(
        "SELECT ma_so,ma_khach_hang,ma_tram_gui,ma_tram_dich,ma_tram_hien_tai,ma_van_don FROM don_hang WHERE ma_so=?",
        [k.order_id],
      );
      if (!(await canReadOrder(c, o, req.user)))
        throw new AppError(404, "Không tìm thấy khiếu nại.");
      if (["resolved", "rejected"].includes(k.status))
        throw new AppError(409, "Khiếu nại đã kết thúc xử lý.");
      await c.execute(
        "UPDATE khieu_nai SET trang_thai=?,phan_hoi=?,ma_nguoi_xu_ly=?,ngay_xu_ly=UTC_TIMESTAMP() WHERE ma_so=?",
        [req.input.status, req.input.response, req.user.id, k.id],
      );
      await notify(
        c,
        k.customer_id,
        k.order_id,
        "complaint_response",
        "Khiếu nại có phản hồi",
        (o.tracking_code + ": " + req.input.response).slice(0, 500),
      );
    });
    res.json({ message: "Đã cập nhật và thông báo cho khách hàng." });
  },
);

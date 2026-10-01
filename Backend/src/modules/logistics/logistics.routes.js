import { orderSummaryColumns } from "../orders/order.columns.js";
import { logisticsFilters, dateFilter } from "./filters.js";
import { Router } from "express";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { pool, transaction } from "../../config/database.js";
import { authorize } from "../../common/auth.js";
import { id, pagination, validate } from "../../common/validation.js";
import { AppError } from "../../common/errors.js";
import { stationAccess, event, warehouseLog } from "./logistics.service.js";
import { notify,notifyManagers } from "../notifications/notifications.routes.js";
const ids = z
  .array(id)
  .min(1)
  .max(100)
  .refine((a) => new Set(a).size === a.length, "Mỗi đơn chỉ chọn một lần.");
export const logisticsRouter = Router();
logisticsRouter.use(authorize("admin", "station_manager"));
function station(req) {
  const n = id.parse(req.query.station_id || req.user.station_id);
  stationAccess(req.user, n);
  return n;
}
logisticsRouter.get("/pickup-tasks", async (req, res) => {
  const stationId = station(req),
    { page, limit, q } = pagination.parse(req.query),
    filters = logisticsFilters.parse(req.query);
  let where =
    "o.ma_tram_gui=? AND o.trang_thai='pending' AND (o.ma_van_don LIKE ? OR o.dia_chi_nguoi_gui LIKE ? OR o.ten_nguoi_gui LIKE ?)";
  const params = [stationId, ...Array(3).fill("%" + q + "%")];
  if (filters.service_code) {
    where += " AND dv.ma_dinh_danh=?";
    params.push(filters.service_code);
  }
  where += dateFilter(filters, "o.ngay_tao", params);
  const joins =
    " FROM don_hang o JOIN dich_vu dv ON dv.ma_so=o.ma_dich_vu LEFT JOIN tai_khoan e ON e.ma_so=o.ma_nv_lay_hang";
  const [[{ total }]] = await pool.execute(
    "SELECT COUNT(*) AS total" + joins + " WHERE " + where,
    params,
  );
  const [items] = await pool.query(
    `SELECT ${orderSummaryColumns},dv.ten AS service_name,e.ten AS pickup_employee_name ${joins} WHERE ${where} ORDER BY (dv.ma_dinh_danh='express') DESC,o.ngay_tao,o.ma_so LIMIT ? OFFSET ?`,
    [...params, limit, (page - 1) * limit],
  );
  res.json({ items, total, page, limit });
});
logisticsRouter.post(
  "/assign-pickup",
  validate(
    z.object({ station_id: id, employee_id: id, order_ids: ids }).strict(),
  ),
  async (req, res) => {
    const p = req.input;
    stationAccess(req.user, p.station_id);
    await transaction(async (c) => {
      const [[e]] = await c.execute(
        "SELECT * FROM tai_khoan WHERE ma_so=? AND vai_tro='employee' AND dang_hoat_dong=TRUE AND ma_tram=?",
        [p.employee_id, p.station_id],
      );
      if (!e)
        throw new AppError(400, "Chọn nhân viên đang hoạt động thuộc trạm.");
      const [[profile]] = await c.execute(
        "SELECT trang_thai_lam_viec FROM ho_so_nhan_vien WHERE ma_tai_khoan=?",
        [e.id],
      );
      if (profile?.employment_status === "stopped")
        throw new AppError(400, "Nhân viên đã ngừng làm việc.");
      const ids = [...p.order_ids].sort((a, b) => a - b);
      const placeholders = ids.map(() => "?").join(",");
      const [orders] = await c.execute(
        `SELECT * FROM don_hang WHERE ma_so IN (${placeholders}) ORDER BY ma_so FOR UPDATE`,
        ids,
      );
      const map = new Map(orders.map((o) => [o.id, o]));
      for (const orderId of ids) {
        const o = map.get(orderId);
        if (
          !o ||
          o.origin_station_id !== p.station_id ||
          o.status !== "pending" ||
          o.employee_id ||
          o.pickup_station_distance_meters == null
        )
          throw new AppError(
            409,
            "Chỉ phân công đơn chờ nhận thuộc trạm, đã xác định tuyến lấy hàng.",
          );
        if (o.pickup_employee_id === e.id) continue;
        await c.execute("UPDATE don_hang SET ma_nv_lay_hang=? WHERE ma_so=?", [
          e.id,
          o.id,
        ]);
        await event(
          c,
          o,
          req.user,
          "pending",
          "Quản lý phân công lấy hàng: " + e.name + ". Chờ nhân viên xác nhận.",
        );
        await notify(
          c,
          e.id,
          o.id,
          "new_order",
          "Nhiệm vụ lấy hàng mới",
          o.tracking_code +
            ": xác nhận nhiệm vụ hoặc báo lý do không thể nhận.",
        );
      }
    });
    res.json({ message: "Đã phân công lấy hàng. Chờ nhân viên xác nhận." });
  },
);
logisticsRouter.get("/inventory", async (req, res) => {
  const stationId = station(req),
    { page, limit, q } = pagination.parse(req.query);
  let where =
    "o.ma_tram_hien_tai=? AND (o.ma_van_don LIKE ? OR o.ten_nguoi_nhan LIKE ?)";
  const params = [stationId, "%" + q + "%", "%" + q + "%"];
  if (req.query.destination_station_id) {
    where += " AND o.ma_tram_dich=?";
    params.push(id.parse(req.query.destination_station_id));
  }
  const filters = logisticsFilters.parse(req.query);
  if (filters.service_code) {
    where +=
      " AND o.ma_dich_vu IN (SELECT ma_so FROM dich_vu WHERE ma_dinh_danh=?)";
    params.push(filters.service_code);
  }
  where += dateFilter(filters, "o.ngay_nhan_don", params);
  const [[{ total }]] = await pool.execute(
    "SELECT COUNT(*) AS total FROM don_hang o WHERE " + where,
    params,
  );
  const [items] = await pool.query(
    `SELECT ${orderSummaryColumns},dv.ten AS service_name,s.ten AS destination_station_name,p.ten AS province_name,e.ten AS delivery_employee_name FROM don_hang o JOIN dich_vu dv ON dv.ma_so=o.ma_dich_vu JOIN tram_chuyen_phat s ON s.ma_so=o.ma_tram_dich JOIN tinh_thanh p ON p.ma_dinh_danh=s.ma_tinh_thanh LEFT JOIN tai_khoan e ON e.ma_so=o.ma_nv_giao_hang WHERE ${where} ORDER BY o.ma_so LIMIT ? OFFSET ?`,
    [...params, limit, (page - 1) * limit],
  );
  const [groups] = await pool.execute(
    "SELECT s.ma_so AS destination_station_id,s.ten AS destination_station_name,p.ten AS province_name,COUNT(*) AS count,SUM(o.ma_chuyen_hien_tai IS NULL AND o.trang_thai='at_origin') AS available FROM don_hang o JOIN tram_chuyen_phat s ON s.ma_so=o.ma_tram_dich JOIN tinh_thanh p ON p.ma_dinh_danh=s.ma_tinh_thanh WHERE o.ma_tram_hien_tai=? GROUP BY s.ma_so,s.ten,p.ten",
    [stationId],
  );
  const [awaiting] = await pool.execute(
    "SELECT ma_so,ma_van_don,noi_dung_hang_hoa FROM don_hang WHERE ma_tram_gui=? AND trang_thai='picked_up' ORDER BY ma_so",
    [stationId],
  );
  res.json({ items, total, page, limit, groups, awaiting });
});
logisticsRouter.get("/ledger", async (req, res) => {
  const stationId = station(req),
    { page, limit } = pagination.parse(req.query);
  const [items] = await pool.query(
    "SELECT l.*,o.ma_van_don,u.ten AS actor_name FROM nhat_ky_kho l JOIN don_hang o ON o.ma_so=l.ma_don_hang JOIN tai_khoan u ON u.ma_so=l.ma_nguoi_thuc_hien WHERE l.ma_tram=? ORDER BY l.ma_so DESC LIMIT ? OFFSET ?",
    [stationId, limit, (page - 1) * limit],
  );
  res.json({ items, page, limit });
});
logisticsRouter.post("/orders/:id/receive-pickup", async (req, res) => {
  await transaction(async (c) => {
    const [[o]] = await c.execute(
      "SELECT * FROM don_hang WHERE ma_so=? FOR UPDATE",
      [id.parse(req.params.id)],
    );
    if (!o || !o.origin_station_id)
      throw new AppError(404, "Không tìm thấy đơn qua trạm.");
    stationAccess(req.user, o.origin_station_id);
    if (o.status !== "picked_up")
      throw new AppError(
        409,
        "Chỉ nhập kho khi nhân viên đã lấy hàng; không nhập lại kiện đã nhận.",
      );
    const next =
      o.origin_station_id === o.destination_station_id
        ? "at_destination"
        : "at_origin";
    await c.execute(
      "UPDATE don_hang SET ma_tram_hien_tai=ma_tram_gui,trang_thai=?,ma_nhan_vien=NULL WHERE ma_so=?",
      [next, o.id],
    );
    await warehouseLog(
      c,
      o.origin_station_id,
      o.id,
      req.user,
      "pickup_received",
    );
    await event(
      c,
      o,
      req.user,
      next,
      "Trạm đã kiểm nhận hàng từ nhân viên lấy hàng.",
    );
  });
  res.json({ message: "Đã xác nhận hàng về kho." });
});
logisticsRouter.get("/batches", async (req, res) => {
  const stationId = station(req),
    { page, limit, q } = pagination.parse(req.query),
    filters = logisticsFilters.parse(req.query);
  let where = "(b.ma_tram_gui=? OR b.ma_tram_dich=?)";
  const params = [stationId, stationId];
  if (filters.direction) {
    where +=
      filters.direction === "outgoing"
        ? " AND b.ma_tram_gui=?"
        : " AND b.ma_tram_dich=?";
    params.push(stationId);
  }
  if (filters.status) {
    where += " AND b.trang_thai=?";
    params.push(filters.status);
  }
  where += " AND (b.ma_dinh_danh LIKE ? OR s.ten LIKE ? OR d.ten LIKE ?)";
  params.push(...Array(3).fill("%" + q + "%"));
  where += dateFilter(filters, "b.ngay_xuat_kho", params);
  if (filters.service_code) {
    where +=
      " AND EXISTS(SELECT 1 FROM kien_trung_chuyen k JOIN don_hang o ON o.ma_so=k.ma_don_hang JOIN dich_vu dv ON dv.ma_so=o.ma_dich_vu WHERE k.ma_chuyen=b.ma_so AND dv.ma_dinh_danh=?)";
    params.push(filters.service_code);
  }
  const joins =
    " FROM chuyen_trung_chuyen b JOIN tram_chuyen_phat s ON s.ma_so=b.ma_tram_gui JOIN tram_chuyen_phat d ON d.ma_so=b.ma_tram_dich JOIN tram_chuyen_phat f ON f.ma_so=b.ma_tram_giao_cuoi";
  const [[{ total }]] = await pool.execute(
    "SELECT COUNT(*) AS total" + joins + " WHERE " + where,
    params,
  );
  const [items] = await pool.query(
    `SELECT b.*,s.ten AS origin_name,d.ten AS destination_name,f.ten AS final_station_name,(SELECT COUNT(*) FROM kien_trung_chuyen k WHERE k.ma_chuyen=b.ma_so) AS parcel_count,(SELECT COUNT(*) FROM kien_trung_chuyen k WHERE k.ma_chuyen=b.ma_so AND k.ngay_nhap_kho IS NOT NULL) AS received_count ${joins} WHERE ${where} ORDER BY b.ma_so DESC LIMIT ? OFFSET ?`,
    [...params, limit, (page - 1) * limit],
  );
  res.json({ items, page, limit, total });
});
logisticsRouter.get("/batches/:id", async (req, res) => {
  const [[batch]] = await pool.execute(
    "SELECT * FROM chuyen_trung_chuyen WHERE ma_so=?",
    [id.parse(req.params.id)],
  );
  if (!batch) throw new AppError(404, "Không tìm thấy chuyến.");
  if (
    req.user.role !== "admin" &&
    ![batch.origin_station_id, batch.destination_station_id].includes(
      req.user.station_id,
    )
  )
    throw new AppError(403, "Chuyến không thuộc trạm.");
  const [items] = await pool.execute(
    "SELECT k.*,o.ma_van_don,o.noi_dung_hang_hoa,o.trang_thai,o.ngay_nhan_don,dv.ten AS service_name FROM kien_trung_chuyen k JOIN don_hang o ON o.ma_so=k.ma_don_hang JOIN dich_vu dv ON dv.ma_so=o.ma_dich_vu WHERE k.ma_chuyen=? ORDER BY dv.ma_dinh_danh,o.ngay_nhan_don,o.ma_so",
    [batch.id],
  );
  res.json({ batch, items });
});
logisticsRouter.post(
  "/batches",
  validate(
    z
      .object({ station_id: id, destination_station_id: id, order_ids: ids })
      .strict(),
  ),
  async (req, res) => {
    const input = req.input;
    stationAccess(req.user, input.station_id);
    const batchId = await transaction(async (c) => {
      const [[destination]] = await c.execute(
        "SELECT ma_so FROM tram_chuyen_phat WHERE ma_so=? AND dang_hoat_dong=TRUE",
        [input.destination_station_id],
      );
      if (!destination || input.station_id === input.destination_station_id)
        throw new AppError(400, "Chọn trạm đến khác trạm gửi.");
      const orders = [];
      for (const orderId of [...input.order_ids].sort((a, b) => a - b)) {
        const [[o]] = await c.execute(
          "SELECT * FROM don_hang WHERE ma_so=? FOR UPDATE",
          [orderId],
        );
        if (
          !o ||
          o.current_station_id !== input.station_id ||
          o.status !== "at_origin" ||
          o.current_batch_id
        )
          throw new AppError(
            409,
            "Đơn chưa về kho, đã nằm trong chuyến khác hoặc chưa sẵn sàng trung chuyển.",
          );
        orders.push(o);
      }
      if (
        orders.some(
          (o) => o.destination_station_id !== orders[0].destination_station_id,
        )
      )
        throw new AppError(
          400,
          "Chỉ gom các đơn cùng tỉnh/trạm giao cuối vào một chuyến.",
        );
      const [r] = await c.execute(
        "INSERT INTO chuyen_trung_chuyen(ma_dinh_danh,ma_tram_gui,ma_tram_dich,ma_tram_giao_cuoi,ma_nguoi_thuc_hien) VALUES (?,?,?,?,?)",
        [
          "TC" + randomBytes(6).toString("hex").toUpperCase(),
          input.station_id,
          input.destination_station_id,
          orders[0].destination_station_id,
          req.user.id,
        ],
      );
      for (const o of orders) {
        await c.execute(
          "INSERT INTO kien_trung_chuyen(ma_chuyen,ma_don_hang) VALUES (?,?)",
          [r.insertId, o.id],
        );
        await c.execute(
          "UPDATE don_hang SET ma_chuyen_hien_tai=? WHERE ma_so=?",
          [r.insertId, o.id],
        );
      }
      return r.insertId;
    });
    res
      .status(201)
      .json({
        id: batchId,
        message: "Đã gom chuyến. Hàng vẫn trong kho cho đến khi xuất chuyến.",
      });
  },
);
logisticsRouter.post("/batches/:id/dispatch", async (req, res) => {
  await transaction(async (c) => {
    const [[b]] = await c.execute(
      "SELECT * FROM chuyen_trung_chuyen WHERE ma_so=? FOR UPDATE",
      [id.parse(req.params.id)],
    );
    if (!b) throw new AppError(404, "Không tìm thấy chuyến.");
    stationAccess(req.user, b.origin_station_id);
    if (b.status !== "planned")
      throw new AppError(409, "Chuyến không còn ở trạng thái chờ xuất.");
    const [items] = await c.execute(
      "SELECT o.ma_so,o.ma_van_don,o.ma_khach_hang,o.ma_chuyen_hien_tai,o.ma_tram_hien_tai,o.trang_thai FROM kien_trung_chuyen k JOIN don_hang o ON o.ma_so=k.ma_don_hang WHERE k.ma_chuyen=? ORDER BY o.ma_so FOR UPDATE",
      [b.id],
    );
    for (const o of items) {
      if (
        o.current_batch_id !== b.id ||
        o.current_station_id !== b.origin_station_id ||
        o.status !== "at_origin"
      )
        throw new AppError(409, "Kiện hàng không còn ở kho.");
      await c.execute(
        "UPDATE don_hang SET trang_thai='in_transit',ma_tram_hien_tai=NULL WHERE ma_so=?",
        [o.id],
      );
      await warehouseLog(
        c,
        b.origin_station_id,
        o.id,
        req.user,
        "transfer_out",
        b.id,
      );
      await event(
        c,
        o,
        req.user,
        "in_transit",
        "Đã xuất kho theo chuyến " + b.code + ".",
      );
    }
    await c.execute(
      "UPDATE chuyen_trung_chuyen SET trang_thai='dispatched',ngay_xuat_kho=UTC_TIMESTAMP() WHERE ma_so=?",
      [b.id],
    );
    await notifyManagers(c,b.destination_station_id,null,'batch_in:'+b.id,'Có chuyến đang đến kho',b.code+': '+items.length+' kiện đã xuất kho. Chuẩn bị kiểm nhận từng kiện khi hàng đến.');
  });
  res.json({ message: "Đã xuất chuyến." });
});
logisticsRouter.post(
  "/batches/:id/receive",
  validate(z.object({ order_ids: ids }).strict()),
  async (req, res) => {
    await transaction(async (c) => {
      const [[b]] = await c.execute(
        "SELECT * FROM chuyen_trung_chuyen WHERE ma_so=? FOR UPDATE",
        [id.parse(req.params.id)],
      );
      if (!b) throw new AppError(404, "Không tìm thấy chuyến.");
      stationAccess(req.user, b.destination_station_id);
      if (b.status !== "dispatched")
        throw new AppError(409, "Chuyến chưa xuất hoặc đã nhận đủ.");
      for (const orderId of [...req.input.order_ids].sort((a, b) => a - b)) {
        const [[item]] = await c.execute(
          "SELECT * FROM kien_trung_chuyen WHERE ma_chuyen=? AND ma_don_hang=? FOR UPDATE",
          [b.id, orderId],
        );
        if (!item || item.received_at)
          throw new AppError(409, "Kiện không thuộc chuyến hoặc đã nhập kho.");
        const [[o]] = await c.execute(
          "SELECT * FROM don_hang WHERE ma_so=? FOR UPDATE",
          [orderId],
        );
        if (o.status !== "in_transit" || o.current_batch_id !== b.id)
          throw new AppError(409, "Đơn không đang trong chuyến này.");
        const next =
          b.destination_station_id === o.destination_station_id
            ? "at_destination"
            : "at_origin";
        await c.execute(
          "UPDATE don_hang SET trang_thai=?,ma_tram_hien_tai=?,ma_chuyen_hien_tai=NULL WHERE ma_so=?",
          [next, b.destination_station_id, o.id],
        );
        await c.execute(
          "UPDATE kien_trung_chuyen SET ngay_nhap_kho=UTC_TIMESTAMP() WHERE ma_chuyen=? AND ma_don_hang=?",
          [b.id, o.id],
        );
        await warehouseLog(
          c,
          b.destination_station_id,
          o.id,
          req.user,
          "transfer_received",
          b.id,
        );
        await event(
          c,
          o,
          req.user,
          next,
          "Trạm đến đã kiểm nhận kiện từ chuyến " + b.code + ".",
        );
      }
      const [[{ remaining }]] = await c.execute(
        "SELECT COUNT(*) AS remaining FROM kien_trung_chuyen WHERE ma_chuyen=? AND ngay_nhap_kho IS NULL",
        [b.id],
      );
      if (!remaining)
        await c.execute(
          "UPDATE chuyen_trung_chuyen SET trang_thai='received',ngay_nhan_du=UTC_TIMESTAMP() WHERE ma_so=?",
          [b.id],
        );
    });
    res.json({
      message:
        "Đã nhập kho các kiện được chọn. Kiện chưa xác nhận vẫn đang trung chuyển.",
    });
  },
);
logisticsRouter.post("/batches/:id/cancel", async (req, res) => {
  await transaction(async (c) => {
    const [[b]] = await c.execute(
      "SELECT * FROM chuyen_trung_chuyen WHERE ma_so=? FOR UPDATE",
      [id.parse(req.params.id)],
    );
    if (!b) throw new AppError(404, "Không tìm thấy chuyến.");
    stationAccess(req.user, b.origin_station_id);
    if (b.status !== "planned")
      throw new AppError(409, "Chỉ hủy chuyến chưa xuất.");
    await c.execute(
      "UPDATE don_hang SET ma_chuyen_hien_tai=NULL WHERE ma_chuyen_hien_tai=?",
      [b.id],
    );
    await c.execute(
      "UPDATE chuyen_trung_chuyen SET trang_thai='cancelled' WHERE ma_so=?",
      [b.id],
    );
  });
  res.json({ message: "Đã hủy chuyến, các kiện vẫn ở kho." });
});
logisticsRouter.post(
  "/assign-delivery",
  validate(
    z.object({ station_id: id, employee_id: id, order_ids: ids }).strict(),
  ),
  async (req, res) => {
    const p = req.input;
    stationAccess(req.user, p.station_id);
    await transaction(async (c) => {
      const [[e]] = await c.execute(
        "SELECT * FROM tai_khoan WHERE ma_so=? AND vai_tro='employee' AND dang_hoat_dong=TRUE AND ma_tram=?",
        [p.employee_id, p.station_id],
      );
      if (!e)
        throw new AppError(
          400,
          "Chọn nhân viên đang hoạt động thuộc trạm này.",
        );
      const ids = [...p.order_ids].sort((a, b) => a - b);
      const placeholders = ids.map(() => "?").join(",");
      const [orders] = await c.execute(
        `SELECT * FROM don_hang WHERE ma_so IN (${placeholders}) ORDER BY ma_so FOR UPDATE`,
        ids,
      );
      const map = new Map(orders.map((o) => [o.id, o]));
      for (const orderId of ids) {
        const o = map.get(orderId);
        if (
          !o ||
          o.current_station_id !== p.station_id ||
          o.destination_station_id !== p.station_id ||
          !["at_destination", "ready_delivery"].includes(o.status)
        )
          throw new AppError(
            409,
            "Chỉ phân công kiện đã về đúng trạm giao và chưa xuất giao.",
          );
        await c.execute(
          "UPDATE don_hang SET ma_nv_giao_hang=?,ma_nhan_vien=?,trang_thai='ready_delivery' WHERE ma_so=?",
          [e.id, e.id, o.id],
        );
        await event(
          c,
          o,
          req.user,
          "ready_delivery",
          "Đã phân công nhân viên giao: " + e.name,
        );
        await notify(
          c,
          e.id,
          o.id,
          "assigned",
          "Có đơn giao từ kho",
          o.tracking_code + ": nhận kiện tại trạm để giao.",
        );
      }
    });
    res.json({
      message:
        "Đã phân công người giao. Nhân viên có thể nhận nhiều đơn trong một lượt.",
    });
  },
);

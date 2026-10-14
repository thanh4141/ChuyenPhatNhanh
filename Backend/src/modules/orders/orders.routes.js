import { orderSummaryColumns } from "./order.columns.js";
import { dbColumn } from "../../config/database-names.js";
import { Router } from "express";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { pool, transaction } from "../../config/database.js";
import { authorize } from "../../common/auth.js";
import { AppError } from "../../common/errors.js";
import {
  id,
  text,
  pagination,
  optionalNote,
  validate,
} from "../../common/validation.js";
import {
  assertTransition,
  canAccess,
  canReadOrder,
  statusLabels,
  isDirectLocalPickup,
  calculateFee,
} from "./order.domain.js";
import { emitRealtimeEvent } from "../../common/events.js";
import { attachMedia } from "../media/media.routes.js";
import {
  notify,
  notifyManagers,
} from "../notifications/notifications.routes.js";
import {
  nearestPickupStation,
  verifyStationSelection,
} from "../logistics/station-routing.js";
import {
  orderStationScope,
  warehouseLog,
} from "../logistics/logistics.service.js";
export const ordersRouter = Router();
const select =
  "SELECT o.*,s.ten AS service_name,c.ten AS customer_name,e.ten AS employee_name,pe.ten AS pickup_employee_name,de.ten AS delivery_employee_name,os.ten AS origin_station_name,ds.ten AS destination_station_name,cs.ten AS current_station_name,cs.vi_do AS current_station_latitude,cs.kinh_do AS current_station_longitude,b.ma_tram_dich AS next_station_id FROM don_hang o JOIN dich_vu s ON s.ma_so=o.ma_dich_vu JOIN tai_khoan c ON c.ma_so=o.ma_khach_hang LEFT JOIN tai_khoan e ON e.ma_so=o.ma_nhan_vien LEFT JOIN tai_khoan pe ON pe.ma_so=o.ma_nv_lay_hang LEFT JOIN tai_khoan de ON de.ma_so=o.ma_nv_giao_hang LEFT JOIN tram_chuyen_phat os ON os.ma_so=o.ma_tram_gui LEFT JOIN tram_chuyen_phat ds ON ds.ma_so=o.ma_tram_dich LEFT JOIN tram_chuyen_phat cs ON cs.ma_so=o.ma_tram_hien_tai LEFT JOIN chuyen_trung_chuyen b ON b.ma_so=o.ma_chuyen_hien_tai";
ordersRouter.get("/", async (req, res) => {
  const { page, limit, q, status, scope, task } = pagination
    .extend({
      task: z.enum(["pickup", "delivery"]).optional(),
      status: z.enum(Object.keys(statusLabels)).optional(),
      scope: z.enum(["mine", "waiting"]).default("mine"),
    })
    .parse(req.query);
  const where = ["1=1"],
    values = [];
  if (scope === "waiting") {
    if (req.user.role !== "employee")
      throw new AppError(403, "Chỉ nhân viên được xem đơn chờ nhận.");
    where.push(
      "o.trang_thai='pending' AND o.ma_nhan_vien IS NULL AND o.quang_duong_tram_lay_met IS NOT NULL AND o.ma_tram_gui=? AND o.ma_nv_lay_hang=?",
    );
    values.push(req.user.station_id || 0, req.user.id);
  } else if (req.user.role === "station_manager") {
    where.push(orderStationScope);
    values.push(...Array(5).fill(req.user.station_id || 0));
  } else if (req.user.role === "customer") {
    where.push("o.ma_khach_hang=?");
    values.push(req.user.id);
  } else if (req.user.role === "employee") {
    where.push(
      "(o.ma_nhan_vien=? OR o.ma_nv_lay_hang=? OR o.ma_nv_giao_hang=?)",
    );
    values.push(req.user.id, req.user.id, req.user.id);
    where.push("o.trang_thai<>'pending'");
  }
  if (task) {
    if (req.user.role !== "employee")
      throw new AppError(403, "Bộ lọc nhiệm vụ chỉ dành cho nhân viên.");
    where.push(
      task === "pickup" ? "o.ma_nv_lay_hang=?" : "o.ma_nv_giao_hang=?",
    );
    values.push(req.user.id);
  }
  if (status) {
    where.push("o.trang_thai=?");
    values.push(status);
  }
  if (q) {
    where.push(
      "(o.ma_van_don LIKE ? OR o.ten_nguoi_nhan LIKE ? OR o.sdt_nguoi_nhan LIKE ?)",
    );
    values.push(...Array(3).fill(`%${q}%`));
  }
  const clause = where.join(" AND ");
  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) AS total FROM don_hang o WHERE ${clause}`,
    values,
  );
  const [items] = await pool.query(
    `${select.replace("o.*", orderSummaryColumns)} WHERE ${clause} ORDER BY o.ma_so DESC LIMIT ? OFFSET ?`,
    [...values, limit, (page - 1) * limit],
  );
  res.json({ items, total, page, limit });
});
ordersRouter.post(
  "/",
  authorize("customer"),
  validate(
    z
      .object({
        quote_id: z.uuid(),
        package_name: text(200),
        parcel_photo_id: z.uuid(),
        note: optionalNote,
        is_fragile: z.boolean().optional(),
        payer: z.enum(["sender", "receiver"]).optional(),
      })
      .strict(),
  ),
  async (req, res) => {
    const result = await transaction(async (c) => {
      const [[user]] = await c.execute(
        "SELECT dang_hoat_dong FROM tai_khoan WHERE ma_so=? FOR UPDATE",
        [req.user.id],
      );
      if (!user.active) throw new AppError(401, "Tài khoản đã bị khóa.");
      const [[quote]] = await c.execute(
        "SELECT * FROM bao_gia_van_chuyen WHERE ma_so=? AND ma_khach_hang=? FOR UPDATE",
        [req.input.quote_id, req.user.id],
      );
      if (!quote) throw new AppError(404, "Không tìm thấy báo giá.");
      const [[existing]] = await c.execute(
        "SELECT ma_so FROM don_hang WHERE ma_bao_gia=?",
        [quote.id],
      );
      if (existing) return { id: existing.id, reused: true };
      if (new Date(quote.expires_at) <= new Date())
        throw new AppError(409, "Báo giá đã hết hạn. Vui lòng tính lại cước.");
      const q =
        typeof quote.snapshot === "string"
          ? JSON.parse(quote.snapshot)
          : quote.snapshot;
      await verifyStationSelection(c, q);
      const stations = {
        origin_station_id: q.origin_station_id,
        destination_station_id: q.destination_station_id,
        pickup_station_distance_meters: q.pickup_station_distance_meters,
      };
      const record = {
        ...stations,
        tracking_code: `CPN${randomBytes(6).toString("hex").toUpperCase()}`,
        customer_id: req.user.id,
        service_id: q.service_id,
        rate_id: quote.rate_id,
        quote_id: quote.id,
        sender_name: q.pickup.contact_name,
        sender_phone: q.pickup.phone,
        sender_address: q.pickup.formatted_address,
        receiver_name: q.delivery.contact_name,
        receiver_phone: q.delivery.phone,
        receiver_address: q.delivery.formatted_address,
        package_name: req.input.package_name,
        weight: q.weight,
        zone: q.route_type === "same_province" ? "same_city" : "domestic",
        route_type: q.route_type,
        cod_amount: q.cod_amount,
        shipping_fee: q.shipping_fee,
        has_cod: q.has_cod,
        has_insurance: q.has_insurance,
        has_packaging: q.has_packaging,
        cod_fee: q.cod_fee,
        insurance_fee: q.insurance_fee,
        packaging_fee: q.packaging_fee,
        total_amount: q.total_amount,
        pickup_snapshot: JSON.stringify(q.pickup),
        delivery_snapshot: JSON.stringify(q.delivery),
        pricing_snapshot: JSON.stringify(q),
        distance_meters: q.distance_meters,
        distance_source: q.source,
        note: req.input.note,
        is_fragile: req.input.is_fragile ? 1 : 0,
        payer: req.input.payer || "sender",
      };
      const [created] = await c.execute(
        `INSERT INTO don_hang(${Object.keys(record).map(dbColumn).join(",")}) VALUES (${Object.keys(
          record,
        )
          .map(() => "?")
          .join(",")})`,
        Object.values(record),
      );
      await attachMedia(
        c,
        req.input.parcel_photo_id,
        req.user.id,
        "parcel",
        created.insertId,
      );
      await c.execute(
        "INSERT INTO lich_su_don_hang(ma_don_hang,ma_nguoi_thuc_hien,trang_thai,ghi_chu) VALUES (?,?,?,?)",
        [
          created.insertId,
          req.user.id,
          "pending",
          "Khách hàng đã ủy thác vận chuyển.",
        ],
      );
      await notify(
        c,
        req.user.id,
        created.insertId,
        "created",
        "Đã tạo đơn hàng",
        `${record.tracking_code} đang chờ nhân viên nhận.`,
      );
      await c.execute(
        "INSERT INTO thong_bao(ma_tai_khoan,ma_don_hang,loai,tieu_de,noi_dung) SELECT ma_so,?,'new_order','Có đơn cần phân công lấy hàng',? FROM tai_khoan WHERE dang_hoat_dong=TRUE AND (vai_tro='admin' OR (vai_tro='station_manager' AND ma_tram=?))",
        [
          created.insertId,
          `${record.tracking_code}: ${record.sender_address} → ${record.receiver_address}`.slice(
            0,
            500,
          ),
          stations.origin_station_id,
        ],
      );
      return { id: created.insertId, reused: false };
    });
    const [[order]] = await pool.execute(`${select} WHERE o.ma_so=?`, [
      result.id,
    ]);
    if (!result.reused) {
      emitRealtimeEvent("ORDER_CREATED", {
        order_id: result.id,
        tracking_code: order?.tracking_code,
        origin_station_id: order?.origin_station_id,
        is_fragile: !!order?.is_fragile,
      });
    }
    res.status(result.reused ? 200 : 201).json({ order });
  },
);
ordersRouter.get("/:id", async (req, res) => {
  const [[order]] = await pool.execute(`${select} WHERE o.ma_so=?`, [
    id.parse(req.params.id),
  ]);
  if (!order || !(await canReadOrder(pool, order, req.user)))
    throw new AppError(404, "Không tìm thấy đơn hàng.");
  const [events] = await pool.execute(
    "SELECT ev.*,u.ten AS actor_name FROM lich_su_don_hang ev JOIN tai_khoan u ON u.ma_so=ev.ma_nguoi_thuc_hien WHERE ev.ma_don_hang=? ORDER BY ev.ma_so DESC",
    [order.id],
  );
  const [media] = await pool.execute(
    "SELECT m.ma_tep_tai_len AS ma_so,m.ma_lich_su,u.muc_dich,u.dung_luong_byte FROM anh_don_hang m JOIN tep_tai_len u ON u.ma_so=m.ma_tep_tai_len WHERE m.ma_don_hang=? ORDER BY m.ma_so",
    [order.id],
  );
  const [[review]] = await pool.execute(
    "SELECT r.*,u.ten AS customer_name FROM danh_gia r JOIN tai_khoan u ON u.ma_so=r.ma_khach_hang WHERE r.ma_don_hang=?",
    [order.id],
  );
  // Loading the order must not depend on an external routing service.
  order.delivery_route_available =
    !!order.destination_station_id &&
    ["ready_delivery", "delivering"].includes(order.status) &&
    events.some((event) => event.status === "ready_delivery");
  if (order.pricing_snapshot) {
    const p =
      typeof order.pricing_snapshot === "string"
        ? JSON.parse(order.pricing_snapshot)
        : { ...order.pricing_snapshot };
    if (
      p.weight_adjusted_at &&
      (p.initial_weight == null || p.initial_weight === "")
    ) {
      p.initial_weight = p.old_weight ?? p.weight;
    }
    order.pricing_snapshot = p;
  }
  res.json({ order, events, media, review: review || null });
});
ordersRouter.get("/:id/delivery-route", async (req, res) => {
  const [[order]] = await pool.execute(
    `SELECT o.*,s.ten AS station_name,s.vi_do AS station_latitude,s.kinh_do AS station_longitude,EXISTS(SELECT 1 FROM nhat_ky_kho k WHERE k.ma_don_hang=o.ma_so AND k.ma_tram=o.ma_tram_dich AND k.loai='delivery_out') AS left_delivery_station FROM don_hang o LEFT JOIN tram_chuyen_phat s ON s.ma_so=o.ma_tram_dich WHERE o.ma_so=?`,
    [id.parse(req.params.id)],
  );
  if (!order || !(await canReadOrder(pool, order, req.user)))
    throw new AppError(404, "Không tìm thấy đơn hàng.");
  if (
    !order.destination_station_id ||
    (order.current_station_id !== order.destination_station_id &&
      !order.left_delivery_station) ||
    order.station_latitude == null ||
    order.station_longitude == null
  )
    throw new AppError(409, "Đơn chưa được nhập tại trạm giao cuối.");
  const delivery =
    typeof order.delivery_snapshot === "string"
      ? JSON.parse(order.delivery_snapshot)
      : order.delivery_snapshot;
  if (
    !delivery ||
    delivery.latitude == null ||
    delivery.longitude == null ||
    !Number.isFinite(Number(delivery.latitude)) ||
    !Number.isFinite(Number(delivery.longitude))
  )
    throw new AppError(409, "Đơn chưa có tọa độ điểm giao.");
  const route = await req.app.locals.maps.route(
    {
      latitude: Number(order.station_latitude),
      longitude: Number(order.station_longitude),
    },
    delivery,
  );
  res.json({
    ...route,
    from: {
      name: order.station_name,
      latitude: Number(order.station_latitude),
      longitude: Number(order.station_longitude),
    },
    to: delivery,
  });
});
ordersRouter.post("/:id/route-pickup", authorize("admin"), async (req, res) => {
  const orderId = id.parse(req.params.id);
  const [[original]] = await pool.execute(
    "SELECT * FROM don_hang WHERE ma_so=?",
    [orderId],
  );
  if (!original) throw new AppError(404, "Không tìm thấy đơn hàng.");
  if (
    original.status !== "pending" ||
    original.employee_id ||
    original.pickup_employee_id
  )
    throw new AppError(409, "Chỉ xác định lại trạm lấy khi đơn còn chờ nhận.");
  const parse = (v) => (typeof v === "string" ? JSON.parse(v) : v);
  const pickup = parse(original.pickup_snapshot),
    delivery = parse(original.delivery_snapshot);
  if (!pickup || !delivery)
    throw new AppError(
      409,
      "Đơn lịch sử chưa lưu vị trí bản đồ. Không thể tự xác định trạm lấy.",
    );
  // Map I/O happens before acquiring row locks.
  const selection = await nearestPickupStation(
    pool,
    req.app.locals.maps,
    pickup,
    delivery,
  );
  await transaction(async (c) => {
    const [[o]] = await c.execute(
      "SELECT ma_so,trang_thai,ma_nhan_vien,ma_nv_lay_hang FROM don_hang WHERE ma_so=? FOR UPDATE",
      [orderId],
    );
    if (o.status !== "pending" || o.employee_id || o.pickup_employee_id)
      throw new AppError(
        409,
        "Đơn vừa được nhận hoặc hủy. Không thể đổi trạm.",
      );
    await verifyStationSelection(c, selection);
    await c.execute(
      "UPDATE don_hang SET ma_tram_gui=?,ma_tram_dich=?,quang_duong_tram_lay_met=? WHERE ma_so=?",
      [
        selection.origin_station_id,
        original.destination_station_id || selection.destination_station_id,
        selection.pickup_station_distance_meters,
        orderId,
      ],
    );
    await c.execute(
      "INSERT INTO lich_su_don_hang(ma_don_hang,ma_nguoi_thuc_hien,trang_thai,ghi_chu) VALUES (?,?,'pending',?)",
      [
        orderId,
        req.user.id,
        "Đã xác định trạm lấy theo đường bộ: " + selection.pickup_station_name,
      ],
    );
    await c.execute(
      "INSERT INTO thong_bao(ma_tai_khoan,ma_don_hang,loai,tieu_de,noi_dung) SELECT ma_so,?,'new_order','Có đơn cần phân công lấy hàng',? FROM tai_khoan WHERE dang_hoat_dong=TRUE AND (vai_tro='admin' OR (vai_tro='station_manager' AND ma_tram=?))",
      [
        orderId,
        original.tracking_code + ": Đơn lấy hàng tại trạm của bạn.",
        selection.origin_station_id,
      ],
    );
    await notify(
      c,
      original.customer_id,
      orderId,
      "status",
      "Đã xác định trạm lấy hàng",
      original.tracking_code + ": " + selection.pickup_station_name,
    );
  });
  res.json({
    message: "Đã cập nhật trạm lấy gần nhất theo tuyến đường bộ.",
    ...selection,
  });
});
ordersRouter.post(
  "/:id/decline-pickup",
  authorize("employee"),
  validate(z.object({ note: z.string().trim().min(3).max(1000) }).strict()),
  async (req, res) => {
    await transaction(async (c) => {
      const [[o]] = await c.execute(
        "SELECT * FROM don_hang WHERE ma_so=? FOR UPDATE",
        [id.parse(req.params.id)],
      );
      if (
        !o ||
        o.pickup_employee_id !== req.user.id ||
        o.origin_station_id !== req.user.station_id
      )
        throw new AppError(404, "Không tìm thấy nhiệm vụ của bạn.");
      if (o.status !== "pending" || o.employee_id)
        throw new AppError(409, "Nhiệm vụ đã xác nhận hoặc đơn đã hủy.");
      await c.execute("UPDATE don_hang SET ma_nv_lay_hang=NULL WHERE ma_so=?", [
        o.id,
      ]);
      await c.execute(
        "INSERT INTO lich_su_don_hang(ma_don_hang,ma_nguoi_thuc_hien,trang_thai,ghi_chu) VALUES (?,?,'pending',?)",
        [
          o.id,
          req.user.id,
          "Nhân viên không thể nhận nhiệm vụ: " + req.input.note,
        ],
      );
      await c.execute(
        "INSERT INTO thong_bao(ma_tai_khoan,ma_don_hang,loai,tieu_de,noi_dung) SELECT ma_so,?,'status','Cần phân công lại lấy hàng',? FROM tai_khoan WHERE dang_hoat_dong=TRUE AND (vai_tro='admin' OR (vai_tro='station_manager' AND ma_tram=?))",
        [o.id, o.tracking_code + ": " + req.input.note, o.origin_station_id],
      );
    });
    emitRealtimeEvent("ORDER_DECLINED", { order_id: id.parse(req.params.id) });
    res.json({ message: "Đã báo quản lý để phân công lại." });
  },
);
ordersRouter.post("/:id/accept", authorize("employee"), async (req, res) => {
  await transaction(async (c) => {
    const [[employee]] = await c.execute(
      "SELECT dang_hoat_dong,ma_tram FROM tai_khoan WHERE ma_so=? FOR UPDATE",
      [req.user.id],
    );
    if (!employee.active) throw new AppError(401, "Tài khoản đã bị khóa.");
    const [[profile]] = await c.execute(
      "SELECT trang_thai_lam_viec FROM ho_so_nhan_vien WHERE ma_tai_khoan=?",
      [req.user.id],
    );
    if (profile?.employment_status === "stopped")
      throw new AppError(403, "Nhân viên đã ngừng làm việc.");
    const [[order]] = await c.execute(
      "SELECT * FROM don_hang WHERE ma_so=? FOR UPDATE",
      [id.parse(req.params.id)],
    );
    if (!order) throw new AppError(404, "Không tìm thấy đơn hàng.");
    if (
      !order.origin_station_id ||
      order.pickup_station_distance_meters == null
    )
      throw new AppError(
        409,
        "Đơn chưa có trạm lấy hàng. Quản lý cần kiểm tra và gán trạm trước khi nhân viên nhận.",
      );
    if (!employee.station_id || order.origin_station_id !== employee.station_id)
      throw new AppError(403, "Chỉ nhân viên trạm lấy hàng được nhận đơn.");
    if (order.pickup_employee_id !== req.user.id)
      throw new AppError(
        403,
        "Chỉ nhân viên được quản lý phân công mới được xác nhận nhiệm vụ.",
      );
    if (order.status !== "pending" || order.employee_id)
      throw new AppError(
        409,
        "Đơn đã có người nhận hoặc đã bị hủy. Hãy tải lại danh sách.",
      );
    await c.execute(
      "UPDATE don_hang SET ma_nhan_vien=?,ma_nv_lay_hang=?,trang_thai='accepted',ngay_nhan_don=UTC_TIMESTAMP() WHERE ma_so=?",
      [req.user.id, req.user.id, order.id],
    );
    await c.execute(
      "INSERT INTO lich_su_don_hang(ma_don_hang,ma_nguoi_thuc_hien,trang_thai,ghi_chu) VALUES (?,?,?,?)",
      [
        order.id,
        req.user.id,
        "accepted",
        `${req.user.name} đã nhận vận chuyển.`,
      ],
    );
    await notify(
      c,
      order.customer_id,
      order.id,
      "status",
      "Nhân viên đã nhận đơn",
      `${order.tracking_code}: ${req.user.name} đã nhận vận chuyển.`,
    );
    await notify(
      c,
      req.user.id,
      order.id,
      "assigned",
      "Bạn đã nhận đơn",
      `Tiếp tục xử lý ${order.tracking_code} trong Đơn đã nhận.`,
    );
  });
  emitRealtimeEvent("ORDER_ACCEPTED", { order_id: id.parse(req.params.id) });
  res.json({ message: "Đã nhận đơn hàng." });
});
ordersRouter.patch(
  "/:id/status",
  authorize("customer", "employee"),
  validate(
    z
      .object({
        status: z.enum(Object.keys(statusLabels)),
        note: optionalNote,
        incident_photo_id: z.uuid().nullable().optional(),
        delivery_photo_id: z.uuid().nullable().optional(),
      })
      .strict(),
  ),
  async (req, res) => {
    await transaction(async (c) => {
      const [[order]] = await c.execute(
        "SELECT * FROM don_hang WHERE ma_so=? FOR UPDATE",
        [id.parse(req.params.id)],
      );
      if (!order || !canAccess(order, req.user))
        throw new AppError(404, "Không tìm thấy đơn hàng.");
      assertTransition(
        order,
        req.input.status,
        req.user,
        req.input.note,
        req.input.incident_photo_id,
        req.input.delivery_photo_id,
      );
      await c.execute(
        "UPDATE don_hang SET trang_thai=?,ngay_giao_xong=? WHERE ma_so=?",
        [
          req.input.status,
          req.input.status === "completed" ? new Date() : null,
          order.id,
        ],
      );
      if (order.origin_station_id && req.input.status === "delivering") {
        if (isDirectLocalPickup(order)) {
          await c.execute(
            "UPDATE don_hang SET ma_nv_giao_hang=?,ma_nhan_vien=? WHERE ma_so=?",
            [req.user.id, req.user.id, order.id],
          );
        } else {
          if (order.current_station_id !== order.destination_station_id)
            throw new AppError(409, "Kiện chưa ở trạm giao.");
          await c.execute(
            "UPDATE don_hang SET ma_tram_hien_tai=NULL WHERE ma_so=?",
            [order.id],
          );
          await warehouseLog(
            c,
            order.destination_station_id,
            order.id,
            req.user,
            "delivery_out",
          );
        }
      }
      const [event] = await c.execute(
        "INSERT INTO lich_su_don_hang(ma_don_hang,ma_nguoi_thuc_hien,trang_thai,ghi_chu) VALUES (?,?,?,?)",
        [
          order.id,
          req.user.id,
          req.input.status,
          req.input.note || statusLabels[req.input.status],
        ],
      );
      if (req.input.status === "completed")
        await attachMedia(
          c,
          req.input.delivery_photo_id,
          req.user.id,
          "delivery",
          order.id,
          event.insertId,
        );
      if (req.input.status === "incomplete")
        await attachMedia(
          c,
          req.input.incident_photo_id,
          req.user.id,
          "incident",
          order.id,
          event.insertId,
        );
      await notify(
        c,
        order.customer_id,
        order.id,
        req.input.status === "completed" ? "review_invite" : "status",
        req.input.status === "completed"
          ? "Đơn hoàn thành — đánh giá nhân viên"
          : "Cập nhật đơn hàng",
        `${order.tracking_code}: ${statusLabels[req.input.status]}.`,
      );
      if (
        ["picked_up", "incomplete", "completed", "cancelled"].includes(
          req.input.status,
        )
      ) {
        const stationId =
          ["picked_up", "cancelled"].includes(req.input.status) ||
          order.status === "awaiting_pickup"
            ? order.origin_station_id
            : order.destination_station_id;
        if (stationId)
          await notifyManagers(
            c,
            stationId,
            order.id,
            "status",
            req.input.status === "picked_up"
              ? "Nhân viên đã lấy hàng — chờ bàn giao"
              : statusLabels[req.input.status],
            `${order.tracking_code}: ${statusLabels[req.input.status]}. ${req.input.note || ""}`.slice(
              0,
              500,
            ),
          );
      }
      if (req.input.status === "cancelled" && order.employee_id)
        await notify(
          c,
          order.employee_id,
          order.id,
          "cancelled",
          "Khách hàng đã hủy đơn",
          `${order.tracking_code}: ${req.input.note}`.slice(0, 500),
        );
    });
    emitRealtimeEvent("ORDER_STATUS_CHANGED", {
      order_id: id.parse(req.params.id),
      status: req.input.status,
    });
    res.json({ message: "Đã cập nhật trạng thái." });
  },
);
ordersRouter.patch(
  "/:id/weight",
  authorize("station_manager", "admin"),
  validate(
    z
      .object({
        weight: z
          .number()
          .min(0.01)
          .max(1000)
          .refine(
            (v) => Math.abs(v * 100 - Math.round(v * 100)) < 0.00001,
            "Khối lượng tối đa 2 chữ số thập phân.",
          ),
        reason: text(500).min(3),
        photo_id: z.uuid(),
      })
      .strict(),
  ),
  async (req, res) => {
    let updatedOrder;
    await transaction(async (c) => {
      const orderId = id.parse(req.params.id);
      const [[order]] = await c.execute(
        "SELECT * FROM don_hang WHERE ma_so=? FOR UPDATE",
        [orderId],
      );
      if (!order) throw new AppError(404, "Không tìm thấy đơn hàng.");
      if (order.status !== "at_origin")
        throw new AppError(
          409,
          "Chỉ có thể chỉnh sửa cân nặng khi đơn hàng ở trạng thái Đã về kho / Chờ trung chuyển.",
        );

      if (req.user.role === "station_manager") {
        const canEdit =
          req.user.station_id &&
          [
            order.origin_station_id,
            order.current_station_id,
            order.destination_station_id,
          ].includes(req.user.station_id);
        if (!canEdit)
          throw new AppError(
            403,
            "Chỉ quản lý trạm liên quan đến đơn hàng mới có quyền chỉnh sửa cân nặng.",
          );
      }

      const [[rate]] = await c.execute(
        "SELECT * FROM bang_cuoc WHERE ma_so=?",
        [order.rate_id],
      );
      if (!rate)
        throw new AppError(422, "Không tìm thấy bảng cước gốc của đơn hàng.");

      const pricing =
        typeof order.pricing_snapshot === "string"
          ? JSON.parse(order.pricing_snapshot)
          : order.pricing_snapshot || {};
      const extras = {
        has_cod: !!order.has_cod,
        cod_amount: order.cod_amount,
        has_insurance: !!order.has_insurance,
        has_packaging: !!order.has_packaging,
      };

      const newFees = calculateFee(
        rate,
        req.input.weight,
        order.distance_meters,
        extras,
      );
      const oldWeight = order.weight;
      const newWeight = req.input.weight;
      const initialWeight =
        pricing.initial_weight ??
        pricing.old_weight ??
        pricing.weight ??
        oldWeight;

      const updatedPricing = {
        ...pricing,
        ...newFees,
        weight: newWeight,
        initial_weight: initialWeight,
        old_weight: oldWeight,
        weight_adjusted_at: new Date().toISOString(),
        weight_adjusted_by: req.user.name,
        weight_adjustment_reason: req.input.reason,
        weight_photo_id: req.input.photo_id,
      };

      await c.execute(
        "UPDATE don_hang SET khoi_luong=?,cuoc_van_chuyen=?,tong_thanh_toan=?,chi_tiet_cuoc=? WHERE ma_so=?",
        [
          newWeight,
          newFees.shipping_fee,
          newFees.total_amount,
          JSON.stringify(updatedPricing),
          order.id,
        ],
      );

      const [event] = await c.execute(
        "INSERT INTO lich_su_don_hang(ma_don_hang,ma_nguoi_thuc_hien,trang_thai,ghi_chu) VALUES (?,?,?,?)",
        [
          order.id,
          req.user.id,
          order.status,
          `Quản lý trạm ${req.user.name} đã điều chỉnh cân nặng từ ${oldWeight}kg sang ${newWeight}kg. Lý do: ${req.input.reason}`,
        ],
      );

      await attachMedia(
        c,
        req.input.photo_id,
        req.user.id,
        ["weight", "parcel"],
        order.id,
        event.insertId,
      );

      const nowFormatted = new Date().toLocaleString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
      });
      const notifContent = `Vào lúc ${nowFormatted}, khối lượng đơn ${order.tracking_code} đã được điều chỉnh từ ${oldWeight}kg thành ${newWeight}kg (Cước mới: ${newFees.total_amount.toLocaleString("vi-VN")}đ). Lý do: ${req.input.reason}`;
      await notify(
        c,
        order.customer_id,
        order.id,
        "weight_adjusted",
        `Điều chỉnh cân nặng đơn #${order.tracking_code}`,
        notifContent,
      );

      emitRealtimeEvent("ORDER_WEIGHT_UPDATED", {
        order_id: order.id,
        customer_id: order.customer_id,
        tracking_code: order.tracking_code,
        initial_weight: initialWeight,
        old_weight: oldWeight,
        new_weight: newWeight,
        reason: req.input.reason,
        photo_id: req.input.photo_id,
      });

      updatedOrder = {
        id: order.id,
        weight: newWeight,
        shipping_fee: newFees.shipping_fee,
        total_amount: newFees.total_amount,
      };
    });

    res.json({
      message: "Đã cập nhật cân nặng đơn hàng và gửi thông báo tới khách hàng.",
      order: updatedOrder,
    });
  },
);
ordersRouter.post(
  "/:id/review",
  authorize("customer"),
  validate(
    z
      .object({ stars: z.number().int().min(1).max(5), comment: text(1000) })
      .strict(),
  ),
  async (req, res) => {
    await transaction(async (c) => {
      const [[order]] = await c.execute(
        "SELECT * FROM don_hang WHERE ma_so=? AND ma_khach_hang=? FOR UPDATE",
        [id.parse(req.params.id), req.user.id],
      );
      if (!order) throw new AppError(404, "Không tìm thấy đơn hàng.");
      if (order.status !== "completed" || !order.employee_id)
        throw new AppError(
          409,
          "Chỉ đánh giá đơn đã hoàn thành có nhân viên vận chuyển.",
        );
      const [[existing]] = await c.execute(
        "SELECT ma_so FROM danh_gia WHERE ma_don_hang=?",
        [order.id],
      );
      if (existing) throw new AppError(409, "Bạn đã đánh giá đơn này.");
      await c.execute(
        "INSERT INTO danh_gia(ma_don_hang,ma_khach_hang,ma_nhan_vien,so_sao,binh_luan) VALUES (?,?,?,?,?)",
        [
          order.id,
          req.user.id,
          order.employee_id,
          req.input.stars,
          req.input.comment,
        ],
      );
      await notify(
        c,
        order.employee_id,
        order.id,
        "review",
        "Bạn có đánh giá mới",
        `${order.tracking_code}: ${req.input.stars}/5 sao.`,
      );
    });
    res.status(201).json({ message: "Cảm ơn bạn đã đánh giá." });
  },
);

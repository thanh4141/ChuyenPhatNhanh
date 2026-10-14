import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { pool } from "../../config/database.js";
import { authorize } from "../../common/auth.js";
import {
  id,
  text,
  email,
  password,
  phone,
  validate,
} from "../../common/validation.js";
import { AppError } from "../../common/errors.js";
import { verifyLocation } from "../maps/maps.service.js";
import { emitRealtimeEvent } from "../../common/events.js";

export const stationsRouter = Router();
stationsRouter.use(authorize("admin", "station_manager"));

stationsRouter.get("/", async (req, res) => {
  const [items] = await pool.query(
    "SELECT s.*, p.ten AS province_name FROM tram_chuyen_phat s JOIN tinh_thanh p ON p.ma_dinh_danh=s.ma_tinh_thanh ORDER BY p.ten",
  );
  res.json({ items });
});

const coordinates = {
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
};

async function verifyStationPoint(req, province_code, lat, lng) {
  const point = { latitude: lat, longitude: lng, province_code };
  await verifyLocation(req.app.locals.maps, point);
  const [distance] = await req.app.locals.maps.stationDistances([point], point);
  if (distance === null)
    throw new AppError(
      422,
      "Không có đường bộ tại vị trí trạm. Hãy đặt ghim gần lối vào kho.",
    );
}

stationsRouter.post(
  "/",
  authorize("admin"),
  validate(
    z
      .object({
        name: text(120),
        province_code: z.string().regex(/^\d{2}$/),
        address: text(500),
        ...coordinates,
      })
      .strict(),
  ),
  async (req, res) => {
    const { name, province_code, address, latitude, longitude } = req.input;
    const [[province]] = await pool.execute(
      "SELECT ma_dinh_danh FROM tinh_thanh WHERE ma_dinh_danh=?",
      [province_code],
    );
    if (!province) throw new AppError(400, "Tỉnh/thành không hợp lệ.");
    await verifyStationPoint(req, province_code, latitude, longitude);
    const [r] = await pool.execute(
      "INSERT INTO tram_chuyen_phat(ten, ma_tinh_thanh, dia_chi_lien_he, vi_do, kinh_do) VALUES (?,?,?,?,?)",
      [name, province_code, address, latitude, longitude],
    );
    emitRealtimeEvent("STATION_CREATED", { station_id: r.insertId });
    res
      .status(201)
      .json({ id: r.insertId, message: "Đã thêm trạm chuyển phát mới." });
  },
);

stationsRouter.patch(
  "/:id",
  authorize("admin"),
  validate(
    z
      .object({
        name: text(120).optional(),
        province_code: z
          .string()
          .regex(/^\d{2}$/)
          .optional(),
        address: text(500).optional(),
        latitude: z.number().min(-90).max(90).optional(),
        longitude: z.number().min(-180).max(180).optional(),
        active: z.boolean().optional(),
      })
      .strict(),
  ),
  async (req, res) => {
    const stationId = id.parse(req.params.id);
    const [[station]] = await pool.execute(
      "SELECT * FROM tram_chuyen_phat WHERE ma_so=?",
      [stationId],
    );
    if (!station) throw new AppError(404, "Không tìm thấy trạm.");

    const provinceCode = req.input.province_code || station.province_code;
    if (req.input.province_code) {
      const [[province]] = await pool.execute(
        "SELECT ma_dinh_danh FROM tinh_thanh WHERE ma_dinh_danh=?",
        [provinceCode],
      );
      if (!province) throw new AppError(400, "Tỉnh/thành không hợp lệ.");
    }

    const lat = req.input.latitude ?? station.latitude;
    const lng = req.input.longitude ?? station.longitude;

    if (
      (req.input.latitude != null ||
        req.input.longitude != null ||
        req.input.province_code) &&
      lat != null &&
      lng != null
    ) {
      await verifyStationPoint(req, provinceCode, lat, lng);
    }

    const updates = [];
    const values = [];

    if (req.input.name !== undefined) {
      updates.push("ten=?");
      values.push(req.input.name);
    }
    if (req.input.province_code !== undefined) {
      updates.push("ma_tinh_thanh=?");
      values.push(req.input.province_code);
    }
    if (req.input.address !== undefined) {
      updates.push("dia_chi_lien_he=?");
      values.push(req.input.address);
    }
    if (req.input.latitude !== undefined) {
      updates.push("vi_do=?");
      values.push(req.input.latitude);
    }
    if (req.input.longitude !== undefined) {
      updates.push("kinh_do=?");
      values.push(req.input.longitude);
    }
    if (req.input.active !== undefined) {
      updates.push("dang_hoat_dong=?");
      values.push(req.input.active ? 1 : 0);
    }

    if (updates.length > 0) {
      values.push(stationId);
      await pool.execute(
        `UPDATE tram_chuyen_phat SET ${updates.join(", ")} WHERE ma_so=?`,
        values,
      );
      emitRealtimeEvent("STATION_UPDATED", { station_id: stationId });
    }

    res.json({ message: "Đã cập nhật thông tin trạm thành công." });
  },
);

stationsRouter.delete("/:id", authorize("admin"), async (req, res) => {
  const stationId = id.parse(req.params.id);
  const [[station]] = await pool.execute(
    "SELECT * FROM tram_chuyen_phat WHERE ma_so=?",
    [stationId],
  );
  if (!station) throw new AppError(404, "Không tìm thấy trạm.");

  // Check if there are active orders at this station
  const [[orders]] = await pool.execute(
    "SELECT COUNT(*) AS total FROM don_hang WHERE (ma_tram_gui=? OR ma_tram_dich=? OR ma_tram_hien_tai=?) AND trang_thai NOT IN ('completed','cancelled','incomplete')",
    [stationId, stationId, stationId],
  );
  if (orders.total > 0) {
    throw new AppError(
      409,
      `Trạm đang có ${orders.total} đơn hàng đang xử lý. Không thể xóa trạm.`,
    );
  }

  // Check if there are historical dependencies
  const [[history]] = await pool.execute(
    "SELECT COUNT(*) AS total FROM don_hang WHERE ma_tram_gui=? OR ma_tram_dich=? OR ma_tram_hien_tai=?",
    [stationId, stationId, stationId],
  );
  const [[batches]] = await pool.execute(
    "SELECT COUNT(*) AS total FROM chuyen_trung_chuyen WHERE ma_tram_gui=? OR ma_tram_dich=? OR ma_tram_giao_cuoi=?",
    [stationId, stationId, stationId],
  );

  if (history.total > 0 || batches.total > 0) {
    // Soft delete to maintain foreign key integrity
    await pool.execute(
      "UPDATE tram_chuyen_phat SET dang_hoat_dong=FALSE WHERE ma_so=?",
      [stationId],
    );
    emitRealtimeEvent("STATION_UPDATED", {
      station_id: stationId,
      active: false,
    });
    return res.json({
      message:
        "Trạm đã có dữ liệu lịch sử vận hành nên đã được vô hiệu hóa ngừng hoạt động.",
    });
  }

  // Safe to hard delete
  await pool.execute(
    "UPDATE ho_so_nhan_vien SET ma_tram=NULL WHERE ma_tram=?",
    [stationId],
  );
  await pool.execute("UPDATE tai_khoan SET ma_tram=NULL WHERE ma_tram=?", [
    stationId,
  ]);
  await pool.execute("DELETE FROM tram_chuyen_phat WHERE ma_so=?", [stationId]);
  emitRealtimeEvent("STATION_DELETED", { station_id: stationId });
  res.json({ message: "Đã xóa trạm chuyển phát thành công." });
});

stationsRouter.patch(
  "/:id/location",
  authorize("admin"),
  validate(z.object(coordinates).strict()),
  async (req, res) => {
    const stationId = id.parse(req.params.id);
    const [[station]] = await pool.execute(
      "SELECT ma_tinh_thanh FROM tram_chuyen_phat WHERE ma_so=?",
      [stationId],
    );
    if (!station) throw new AppError(404, "Không tìm thấy trạm.");
    await verifyStationPoint(
      req,
      station.province_code,
      req.input.latitude,
      req.input.longitude,
    );
    await pool.execute(
      "UPDATE tram_chuyen_phat SET vi_do=?, kinh_do=? WHERE ma_so=?",
      [req.input.latitude, req.input.longitude, stationId],
    );
    emitRealtimeEvent("STATION_UPDATED", { station_id: stationId });
    res.json({
      message:
        "Đã lưu vị trí trạm. Có thể xác định lại trạm lấy cho các đơn chờ chưa nhận.",
    });
  },
);

stationsRouter.post(
  "/:id/managers",
  authorize("admin"),
  validate(z.object({ name: text(120), email, password, phone }).strict()),
  async (req, res) => {
    const stationId = id.parse(req.params.id);
    const [[s]] = await pool.execute(
      "SELECT * FROM tram_chuyen_phat WHERE ma_so=? AND dang_hoat_dong=TRUE",
      [stationId],
    );
    if (!s) throw new AppError(404, "Không tìm thấy trạm.");
    const p = req.input;
    const [r] = await pool.execute(
      "INSERT INTO tai_khoan(ten, thu_dien_tu, mat_khau_bam, so_dien_thoai, vai_tro, ma_tram) VALUES (?,?,?,?,'station_manager',?)",
      [p.name, p.email, await bcrypt.hash(p.password, 12), p.phone, stationId],
    );
    emitRealtimeEvent("MANAGER_CREATED", {
      station_id: stationId,
      manager_id: r.insertId,
    });
    res
      .status(201)
      .json({ id: r.insertId, message: "Đã tạo tài khoản quản lý trạm." });
  },
);

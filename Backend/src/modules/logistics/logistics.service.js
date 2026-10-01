import { AppError } from "../../common/errors.js";
import { notify } from "../notifications/notifications.routes.js";
export function stationAccess(user, stationId) {
  if (user.role === "admin") return;
  const safeStationId = Number(stationId);
  const userStationId = Number(user.station_id);
  if (
    user.role !== "station_manager" ||
    !userStationId ||
    userStationId !== safeStationId
  )
    throw new AppError(403, "Bạn chỉ được quản lý trạm của mình.");
}
export async function event(c, o, user, status, note) {
  const [[latest]] = await c.execute(
    "SELECT trang_thai FROM lich_su_don_hang WHERE ma_don_hang=? ORDER BY ma_so DESC LIMIT 1",
    [o.id],
  );
  if (latest && latest.status === status) return;
  await c.execute(
    "INSERT INTO lich_su_don_hang(ma_don_hang,ma_nguoi_thuc_hien,trang_thai,ghi_chu) VALUES (?,?,?,?)",
    [o.id, user.id, status, note],
  );
  await notify(
    c,
    o.customer_id,
    o.id,
    "status",
    "Hành trình qua trạm",
    o.tracking_code + ": " + note,
  );
}
export async function warehouseLog(
  c,
  stationId,
  orderId,
  user,
  type,
  batchId = null,
) {
  await c.execute(
    "INSERT INTO nhat_ky_kho(ma_tram,ma_don_hang,ma_chuyen,loai,ma_nguoi_thuc_hien) VALUES (?,?,?,?,?)",
    [stationId, orderId, batchId, type, user.id],
  );
}
export const orderStationScope = `(o.ma_tram_gui=? OR o.ma_tram_dich=? OR o.ma_tram_hien_tai=? OR EXISTS(SELECT 1 FROM kien_trung_chuyen kt JOIN chuyen_trung_chuyen ct ON ct.ma_so=kt.ma_chuyen WHERE kt.ma_don_hang=o.ma_so AND (ct.ma_tram_gui=? OR ct.ma_tram_dich=?)))`;

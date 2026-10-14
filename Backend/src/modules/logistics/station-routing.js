import { createHash } from "node:crypto";
import { AppError } from "../../common/errors.js";

export async function stationNetwork(c, lock = false) {
  const [stations] = await c.query(
    "SELECT ma_so,ten,ma_tinh_thanh,vi_do,kinh_do,dang_hoat_dong FROM tram_chuyen_phat ORDER BY ma_so" +
      (lock ? " FOR SHARE" : ""),
  );
  return {
    stations: stations.filter((s) => s.active),
    signature: createHash("sha256")
      .update("nearest-road-both-ends-v2:" + JSON.stringify(stations))
      .digest("hex"),
  };
}
export async function nearestPickupStation(c, maps, pickup, delivery) {
  const { stations, signature } = await stationNetwork(c);
  if (!stations.length)
    throw new AppError(
      409,
      "Chưa có trạm hoạt động. Vui lòng liên hệ quản lý.",
    );
  if (stations.some((s) => s.latitude === null || s.longitude === null))
    throw new AppError(
      409,
      "Quản lý cần ghim vị trí bản đồ cho tất cả trạm đang hoạt động trước khi xác định trạm lấy hàng gần nhất.",
    );
  if (
    !pickup ||
    !Number.isFinite(Number(pickup.latitude)) ||
    !Number.isFinite(Number(pickup.longitude)) ||
    pickup.latitude == null ||
    pickup.longitude == null
  )
    throw new AppError(
      409,
      "Đơn chưa có tọa độ điểm lấy. Không thể xác định trạm bằng khoảng cách đường bộ.",
    );
  if (
    !delivery ||
    delivery.latitude == null ||
    delivery.longitude == null ||
    !Number.isFinite(Number(delivery.latitude)) ||
    !Number.isFinite(Number(delivery.longitude))
  )
    throw new AppError(
      409,
      "Đơn chưa có tọa độ điểm giao. Không thể xác định trạm bằng khoảng cách đường bộ.",
    );
  const [distances, deliveryDistances] = await Promise.all([
    maps.stationDistances(stations, pickup),
    maps.stationDistances(stations, delivery),
  ]);
  const candidates = stations
    .map((s, i) => ({ ...s, distance: distances[i] }))
    .filter((s) => Number.isFinite(s.distance) && s.distance >= 0)
    .sort((a, b) => a.distance - b.distance || a.id - b.id);
  if (!candidates.length)
    throw new AppError(
      422,
      "Không có tuyến đường bộ từ các trạm tới điểm lấy hàng. Hãy kiểm tra vị trí.",
    );
  const closest = candidates[0];
  const destination = stations
    .map((s, i) => ({ ...s, distance: deliveryDistances[i] }))
    .filter((s) => Number.isFinite(s.distance) && s.distance >= 0)
    .sort((a, b) => a.distance - b.distance || a.id - b.id)[0];
  if (!destination)
    throw new AppError(
      422,
      "Không có tuyến đường bộ từ các trạm tới điểm giao hàng. Hãy kiểm tra vị trí.",
    );
  return {
    origin_station_id: closest.id,
    destination_station_id: destination.id,
    pickup_station_distance_meters: Math.round(closest.distance),
    pickup_station_name: closest.name,
    delivery_station_distance_meters: Math.round(destination.distance),
    delivery_station_name: destination.name,
    station_network_signature: signature,
    station_selection_source: "osrm",
    station_selected_at: new Date().toISOString(),
  };
}
export async function verifyStationSelection(c, selection) {
  if (
    !selection?.station_network_signature ||
    !Number.isFinite(selection.pickup_station_distance_meters)
  )
    throw new AppError(
      409,
      "Vui lòng tính lại báo giá để xác định trạm lấy hàng gần nhất.",
    );
  const { signature } = await stationNetwork(c, true);
  if (signature !== selection.station_network_signature)
    throw new AppError(
      409,
      "Vị trí/cấu hình trạm vừa thay đổi. Vui lòng tính lại báo giá.",
    );
}

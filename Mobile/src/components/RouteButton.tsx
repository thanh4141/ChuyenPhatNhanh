import React, { useState } from "react";
import { Text, View } from "react-native";
import { MapRoute, Quote, RouteGeometry } from "../types";
import { Button, ErrorText, errorMessage, styles } from "./ui";
import { api } from "../services/api";
import MapPicker from "./MapPicker";
export default function RouteButton({
  quote,
  deliveryOrderId,
}: {
  quote: Quote;
  deliveryOrderId?: number;
}) {
  const [route, setRoute] = useState<MapRoute | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function loadDeliveryRoute() {
    if (busy || !deliveryOrderId) return;
    setBusy(true);
    setError("");
    try {
      const result = await api<{
        route_geometry: RouteGeometry;
        distance_meters: number;
        route_data_version?: string | null;
      }>("/orders/" + deliveryOrderId + "/delivery-route");
      setRoute({
        geometry: result.route_geometry,
        distance_meters: result.distance_meters,
        data_version: result.route_data_version,
      });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  if (!quote.route_geometry) return null;
  const fullRoute = {
    geometry: quote.route_geometry,
    distance_meters: quote.distance_meters,
    data_version: quote.route_data_version,
  };
  return (
    <View style={{ gap: 8 }}>
      <Button
        title="Xem toàn bộ đường đi trên bản đồ"
        variant="secondary"
        onPress={() => setRoute(fullRoute)}
      />
      <Text style={styles.muted}>
        Tuyến đường bộ ô tô từ điểm lấy đến điểm giao.{" "}
        {quote.route_data_version
          ? "Ngày dữ liệu: " +
            new Date(quote.route_data_version).toLocaleDateString("vi-VN") +
            "."
          : "Máy chủ không công bố ngày dữ liệu tuyến."}
      </Text>
      {!!deliveryOrderId && (
        <>
          <Button
            title="Xem tuyến từ trạm giao đến điểm giao"
            variant="secondary"
            busy={busy}
            onPress={() => void loadDeliveryRoute()}
          />
          <Text style={styles.muted}>
            Tuyến giao hàng từ trạm giao cuối đến người nhận, kể cả khi đã xuất
            kho.
          </Text>
        </>
      )}
      <ErrorText message={error} />
      {route && (
        <MapPicker
          route={route}
          onSelect={() => {}}
          onClose={() => setRoute(null)}
        />
      )}
    </View>
  );
}

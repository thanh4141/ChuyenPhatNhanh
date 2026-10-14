import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { OrderDetail, Status } from "../types";
import {
  Badge,
  Button,
  Card,
  Chips,
  ErrorText,
  Field,
  colors,
  date,
  errorMessage,
  money,
  styles,
  statusLabels,
  routeLabels,
} from "../components/ui";
import OrderComplaint from "../components/OrderComplaint";
import PhotoInput from "../components/PhotoInput";
import MediaImage from "../components/MediaImage";
import RouteButton from "../components/RouteButton";
import FeeBreakdown from "../components/FeeBreakdown";
const nextStatuses: Partial<Record<Status, Status[]>> = {
  accepted: ["awaiting_pickup"],
  awaiting_pickup: ["picked_up", "incomplete"],
  picked_up: ["delivering"],
  delivering: ["completed", "incomplete"],
};
export default function OrderDetailScreen({
  id,
  onBack,
}: {
  id: number;
  onBack: () => void;
}) {
  const { user } = useAuth();
  const [data, setData] = useState<OrderDetail | null>(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [note, setNote] = useState(""),
    [next, setNext] = useState<Status | null>(null),
    [success, setSuccess] = useState(""),
    [photo, setPhoto] = useState(""),
    [uploading, setUploading] = useState(false),
    [stars, setStars] = useState("5"),
    [complaintPrefill, setComplaintPrefill] = useState<{
      title: string;
      message: string;
    } | null>(null),
    [comment, setComment] = useState("");
  async function load() {
    setLoading(true);
    try {
      setData(await api("/orders/" + id));
      setError("");
    } catch (e) {
      setError(errorMessage(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [id]);
  async function act(kind: "accept" | "status" | "review" | "decline") {
    if (busy || uploading) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      if (kind === "decline") {
        if (note.trim().length < 3)
          throw new Error("Nhập lý do không thể nhận ít nhất 3 ký tự.");
        await api("/orders/" + id + "/decline-pickup", "POST", { note });
        onBack();
        return;
      }
      if (kind === "accept") await api("/orders/" + id + "/accept", "POST");
      if (kind === "status") {
        if (!next) return;
        if (
          ["incomplete", "cancelled"].includes(next) &&
          note.trim().length < 3
        )
          throw new Error("Nhập lý do ít nhất 3 ký tự.");
        if (next === "incomplete" && !photo)
          throw new Error("Cần chụp hoặc chọn ảnh sự cố.");
        if (next === "completed" && !photo)
          throw new Error("Phải chụp ảnh bằng chứng giao hàng.");
        await api("/orders/" + id + "/status", "PATCH", {
          status: next,
          note,
          ...(next === "incomplete"
            ? { incident_photo_id: photo }
            : next === "completed"
              ? { delivery_photo_id: photo }
              : {}),
        });
        setNext(null);
        setNote("");
        setPhoto("");
      }
      if (kind === "review") {
        await api("/orders/" + id + "/review", "POST", {
          stars: Number(stars),
          comment,
        });
      }
      await load();
      setSuccess(
        kind === "accept"
          ? "Đã nhận đơn hàng."
          : kind === "review"
            ? "Cảm ơn bạn đã đánh giá."
            : "Đã cập nhật trạng thái đơn hàng.",
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const o = data?.order,
    employee = user?.role === "employee",
    mine = o?.employee_id === user?.id;
  const directLocal =
    !!o?.origin_station_id &&
    !!o.destination_station_id &&
    o.route_type === "same_province" &&
    o.status === "picked_up" &&
    !o.current_station_id &&
    !o.current_batch_id &&
    o.pickup_employee_id === user?.id;
  const stageMine = o?.origin_station_id
    ? (o.pickup_employee_id === user?.id &&
        (["accepted", "awaiting_pickup"].includes(o.status) || directLocal)) ||
      (o.delivery_employee_id === user?.id &&
        ["ready_delivery", "delivering"].includes(o.status))
    : mine;
  const stationSteps: Partial<Record<Status, Status[]>> = {
    picked_up: directLocal ? ["delivering"] : [],
    accepted: ["awaiting_pickup"],
    awaiting_pickup: ["picked_up", "incomplete"],
    ready_delivery: ["delivering"],
    delivering: ["completed", "incomplete"],
  };
  const available: Status[] = o
    ? employee && stageMine
      ? (o.origin_station_id ? stationSteps : nextStatuses)[o.status] || []
      : !employee &&
          ["pending", "accepted", "awaiting_pickup"].includes(o.status)
        ? ["cancelled"]
        : []
    : [];
  return (
    <ScrollView
      style={styles.screen}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={() => void load()} />
      }
    >
      <Button
        title="← Quay lại đơn hàng"
        variant="secondary"
        onPress={onBack}
      />
      <Text style={styles.title}>Chi tiết vận đơn</Text>
      <ErrorText message={error} />
      {!!error && (
        <Button
          title="Tải lại thông tin"
          variant="secondary"
          onPress={() => void load()}
        />
      )}
      {!!success && <Text style={styles.success}>{success}</Text>}
      {!o || !data ? (
        loading ? (
          <ActivityIndicator color={colors.green} />
        ) : null
      ) : (
        <>
          <Card>
            <Text selectable style={styles.link}>
              {o.tracking_code}
            </Text>
            <Badge status={o.status} />
            <Text style={styles.muted}>Tạo lúc {date(o.created_at)}</Text>
          </Card>
          <Card>
            {[
              ["NGƯỜI GỬI", o.sender_name, o.sender_phone, o.sender_address],
              [
                "NGƯỜI NHẬN",
                o.receiver_name,
                o.receiver_phone,
                o.receiver_address,
              ],
            ].map(([title, name, phone, address]) => (
              <View key={title} style={{ gap: 8 }}>
                <Text style={styles.sectionTitle}>{title}</Text>
                <Text style={styles.subtitle}>{name}</Text>
                <Text style={styles.muted}>{phone}</Text>
                <Text style={styles.muted}>{address}</Text>
              </View>
            ))}
            {employee && mine && (
              <>
                <Button
                  title="Gọi người gửi"
                  variant="secondary"
                  onPress={() =>
                    void Linking.openURL("tel:" + o.sender_phone).catch(() =>
                      setError("Thiết bị chưa hỗ trợ gọi điện."),
                    )
                  }
                />
                <Button
                  title="Gọi người nhận"
                  variant="secondary"
                  onPress={() =>
                    void Linking.openURL("tel:" + o.receiver_phone).catch(() =>
                      setError("Thiết bị chưa hỗ trợ gọi điện."),
                    )
                  }
                />
                {o.delivery_snapshot && (
                  <Button
                    title="Mở vị trí người nhận trên OpenStreetMap"
                    variant="secondary"
                    onPress={() =>
                      void Linking.openURL(
                        "https://www.openstreetmap.org/?mlat=" +
                          o.delivery_snapshot!.latitude +
                          "&mlon=" +
                          o.delivery_snapshot!.longitude +
                          "#map=17/" +
                          o.delivery_snapshot!.latitude +
                          "/" +
                          o.delivery_snapshot!.longitude,
                      ).catch(() => setError("Không mở được ứng dụng bản đồ."))
                    }
                  />
                )}
              </>
            )}
          </Card>
          <Card>
            <Text style={styles.subtitle}>{o.package_name}</Text>
            {!!o.hang_de_vo && (
              <View
                style={{
                  backgroundColor: "#fef3c7",
                  padding: 8,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: "#f59e0b",
                  marginVertical: 4,
                }}
              >
                <Text
                  style={{ color: "#92400e", fontWeight: "700", fontSize: 13 }}
                >
                  ⚠️ Hàng dễ vỡ — Cần cẩn trọng khi vận chuyển
                </Text>
              </View>
            )}
            <Text style={styles.muted}>
              {o.service_name} · {o.weight} kg ·{" "}
              {o.route_type ? routeLabels[o.route_type] : "Đơn cũ"}
            </Text>
            <Text style={styles.muted}>
              Người thanh toán:{" "}
              {o.payer === "receiver"
                ? "Người nhận thanh toán"
                : "Người gửi thanh toán"}
            </Text>
            <Text style={styles.muted}>
              {["osrm", "google_routes"].includes(o.distance_source)
                ? (Number(o.distance_meters) / 1000).toLocaleString("vi-VN") +
                  " km theo đường bộ"
                : "Đơn cũ chưa lưu quãng đường đường bộ."}
            </Text>
            {o.pricing_snapshot ? (
              <>
                <RouteButton
                  quote={o.pricing_snapshot}
                  deliveryOrderId={
                    employee &&
                    o.delivery_employee_id === user?.id &&
                    o.delivery_route_available
                      ? o.id
                      : undefined
                  }
                />
                <FeeBreakdown fees={o.pricing_snapshot} cod={o.cod_amount} />
                <Text style={styles.muted}>
                  Dự kiến {o.pricing_snapshot.rate.min_days}–
                  {o.pricing_snapshot.rate.max_days} ngày.
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.label}>
                  Tổng thanh toán: {money(o.total_amount ?? o.shipping_fee)}
                </Text>
                <Text style={styles.muted}>
                  Thu hộ COD: {money(o.cod_amount)}
                </Text>
              </>
            )}
            {o.origin_station_id ? (
              <>
                <Text style={styles.label}>
                  Nhân viên lấy: {o.pickup_employee_name || "Chưa nhận"}
                </Text>
                <Text style={styles.label}>
                  Nhân viên giao: {o.delivery_employee_name || "Chưa phân công"}
                </Text>
                <Text style={styles.muted}>
                  Trạm lấy: {o.origin_station_name} → Trạm giao:{" "}
                  {o.destination_station_name}
                </Text>
                <Text style={styles.muted}>
                  Kho hiện tại:{" "}
                  {o.current_station_name || "Chưa ở kho / đang vận chuyển"}
                </Text>
                {employee &&
                  o.status === "picked_up" &&
                  o.pickup_employee_id === user?.id &&
                  (directLocal ? (
                    <Text style={styles.success}>
                      Đơn nội tỉnh: bạn có thể giao thẳng đến người nhận. Chọn
                      Đang giao để bắt đầu.
                    </Text>
                  ) : (
                    <Text style={styles.success}>
                      Mang hàng về {o.origin_station_name} để quản lý trạm kiểm
                      nhận. Bạn có thể nhận thêm các đơn lấy hàng trong khu vực.
                    </Text>
                  ))}
              </>
            ) : (
              <Text style={styles.muted}>
                Nhân viên: {o.employee_name || "Chờ nhân viên nhận"}
              </Text>
            )}
            <Text style={styles.muted}>Ghi chú: {o.note || "Không có"}</Text>
            {data.media.map((m) => (
              <MediaImage
                key={m.id}
                id={m.id}
                label={
                  m.purpose === "parcel"
                    ? "Ảnh hàng hóa"
                    : m.purpose === "delivery"
                      ? "Bằng chứng giao hàng"
                      : m.purpose === "weight"
                        ? "Ảnh cân nặng tại trạm"
                        : "Ảnh sự cố"
                }
              />
            ))}
          </Card>
          {o.pricing_snapshot?.weight_adjusted_at && (
            <Card
              style={{ borderColor: "#f59e0b", backgroundColor: "#fffbeb" }}
            >
              <Text style={[styles.subtitle, { color: "#b45309" }]}>
                ⚖️ Trạm đã điều chỉnh cân nặng
              </Text>
              <Text style={styles.muted}>
                Thời gian sửa: {date(o.pricing_snapshot.weight_adjusted_at)}
              </Text>
              <Text style={styles.muted}>
                Khối lượng ban đầu:{" "}
                {o.pricing_snapshot.initial_weight ??
                  o.pricing_snapshot.old_weight}{" "}
                kg → Cân nặng mới:{" "}
                <Text style={{ fontWeight: "700", color: "#b45309" }}>
                  {o.weight} kg
                </Text>
              </Text>
              <Text style={styles.muted}>
                Lý do điều chỉnh: {o.pricing_snapshot.weight_adjustment_reason}
              </Text>
              {o.pricing_snapshot.weight_photo_id && (
                <MediaImage
                  id={o.pricing_snapshot.weight_photo_id}
                  label="Ảnh chụp cân nặng thực tế tại trạm"
                />
              )}
              {!employee && (
                <Button
                  title="Khiếu nại cân nặng lên Admin"
                  variant="danger"
                  onPress={() => {
                    const prevKg =
                      o.pricing_snapshot?.initial_weight ??
                      o.pricing_snapshot?.old_weight ??
                      "";
                    setComplaintPrefill({
                      title: `Khiếu nại cân nặng đơn ${o.tracking_code}`,
                      message: `Tôi muốn khiếu nại việc trạm chuyển phát điều chỉnh khối lượng từ ${prevKg} kg lên ${o.weight} kg. Lý do trạm báo: ${o.pricing_snapshot?.weight_adjustment_reason}.`,
                    });
                  }}
                />
              )}
            </Card>
          )}
          {employee &&
            o.status === "pending" &&
            !o.employee_id &&
            o.pickup_employee_id === user?.id && (
              <Card>
                <Button
                  title="Xác nhận nhiệm vụ"
                  busy={busy}
                  onPress={() => void act("accept")}
                />
                <Field
                  label="Lý do không thể nhận nhiệm vụ"
                  value={note}
                  onChangeText={setNote}
                  multiline
                />
                <Button
                  title="Báo không thể nhận"
                  variant="secondary"
                  busy={busy}
                  onPress={() => void act("decline")}
                />
              </Card>
            )}
          {available.length > 0 && (
            <Card>
              <Text style={styles.subtitle}>
                {employee
                  ? o.status === "awaiting_pickup"
                    ? "Thực hiện lấy hàng tại điểm"
                    : "Cập nhật hành trình"
                  : "Hủy yêu cầu vận chuyển"}
              </Text>
              <Chips
                items={available.map((s) => ({
                  value: s,
                  label:
                    o.status === "awaiting_pickup" && s === "picked_up"
                      ? "Đã lấy hàng"
                      : o.status === "awaiting_pickup" && s === "incomplete"
                        ? "Hủy lấy hàng"
                        : statusLabels[s],
                }))}
                value={next || ""}
                onChange={(v) => {
                  if (!uploading && !busy) {
                    setNext(v as Status);
                    setPhoto("");
                    setError("");
                  }
                }}
              />
              {next && (
                <>
                  <Field
                    label={
                      ["incomplete", "cancelled"].includes(next)
                        ? "Lý do (bắt buộc)"
                        : "Ghi chú"
                    }
                    value={note}
                    onChangeText={setNote}
                    multiline
                    maxLength={1000}
                  />
                  {["incomplete", "completed"].includes(next) && (
                    <PhotoInput
                      key={next}
                      purpose={next === "completed" ? "delivery" : "incident"}
                      value={photo}
                      onChange={setPhoto}
                      onBusy={setUploading}
                    />
                  )}
                  <Button
                    title={
                      o.status === "awaiting_pickup" && next === "incomplete"
                        ? "Xác nhận: Hủy lấy hàng"
                        : o.status === "awaiting_pickup" && next === "picked_up"
                          ? "Xác nhận: Đã lấy hàng"
                          : "Xác nhận: " + statusLabels[next]
                    }
                    variant={
                      ["cancelled", "incomplete"].includes(next)
                        ? "danger"
                        : "primary"
                    }
                    busy={busy}
                    disabled={
                      uploading ||
                      (next === "completed" && !photo) ||
                      (next === "incomplete" &&
                        (!photo || note.trim().length < 3))
                    }
                    onPress={() => void act("status")}
                  />
                </>
              )}
            </Card>
          )}
          {data.review ? (
            <Card>
              <Text style={styles.subtitle}>Đánh giá nhân viên</Text>
              <Text style={styles.link}>
                {"★".repeat(data.review.stars)} · {data.review.stars}/5
              </Text>
              <Text style={styles.muted}>{data.review.comment}</Text>
            </Card>
          ) : !employee && o.status === "completed" && o.employee_id ? (
            <Card>
              <Text style={styles.subtitle}>Đánh giá nhân viên vận chuyển</Text>
              <Chips
                items={[1, 2, 3, 4, 5].map((n) => ({
                  value: String(n),
                  label: n + " ★",
                }))}
                value={stars}
                onChange={setStars}
              />
              <Field
                label="Bình luận đánh giá"
                value={comment}
                onChangeText={setComment}
                multiline
                maxLength={1000}
              />
              <Button
                title="Gửi đánh giá"
                busy={busy}
                onPress={() => void act("review")}
              />
            </Card>
          ) : null}
          {!employee && (
            <OrderComplaint
              orderId={o.id}
              revision={o.status + success}
              prefill={complaintPrefill}
            />
          )}
          <Card>
            <Text style={styles.subtitle}>Lịch sử vận chuyển</Text>
            {data.events.map((e, i) => (
              <View
                key={e.id}
                style={{
                  paddingLeft: 17,
                  borderLeftWidth: 2,
                  borderColor: i === 0 ? colors.green : colors.line,
                  gap: 5,
                  paddingBottom: 10,
                }}
              >
                <Text style={styles.label}>{statusLabels[e.status]}</Text>
                <Text style={styles.muted}>
                  {date(e.created_at)} · {e.actor_name}
                </Text>
                <Text style={styles.muted}>{e.note}</Text>
              </View>
            ))}
          </Card>
        </>
      )}
    </ScrollView>
  );
}

import { api } from "./api.js";
import { esc, date, heading, empty } from "./ui.js";
let timer,
  revision = 0;
export function stopNotifications() {
  clearInterval(timer);
  revision++;
  document.getElementById("notification-count")?.replaceChildren();
}
export function startNotifications() {
  stopNotifications();
  void refreshNotificationCount();
  timer = setInterval(() => {
    if (!document.hidden) void refreshNotificationCount();
  }, 30000);
}
export async function refreshNotificationCount() {
  const current = revision;
  try {
    const d = await api("/notifications?limit=1");
    if (current !== revision) return;
    const el = document.getElementById("notification-count");
    if (el) el.textContent = d.unread_count ? String(d.unread_count) : "";
  } catch {
    /* The page exposes errors and the API handles session expiry. */
  }
}
export async function notificationsPage(state) {
  const d = await api("/notifications?page=" + state.index + "&limit=20");
  state.notifications = d.items;
  return (
    heading(
      "Thông báo",
      "Đơn mới, bàn giao hàng và chuyến đến kho. Tự cập nhật số chưa đọc mỗi 30 giây.",
    ) +
    `<section class="panel"><div class="filter-row"><strong>${d.unread_count} chưa đọc</strong><button class="button" data-action="notifications-read-all">Đánh dấu tất cả đã đọc</button><button class="button" data-action="reload">Làm mới</button></div>${d.items.map((n) => `<button class="notification-card ${n.read_at ? "" : "unread"}" data-action="notification-open" data-id="${n.id}"><strong>${n.read_at ? "" : "● "}${esc(n.title)}</strong><span>${esc(n.message)}</span><small>${date(n.created_at, true)} · ${n.read_at ? "Đã đọc" : "Chưa đọc"}</small></button>`).join("") || empty("Chưa có thông báo")}<div class="table-bottom"><span>${d.total} thông báo · Trang ${d.page}</span><button class="button" data-action="prev" ${d.page <= 1 ? "disabled" : ""}>Trước</button><button class="button" data-action="next" ${d.page * 20 >= d.total ? "disabled" : ""}>Sau</button></div></section>`
  );
}
export async function notificationAction(
  action,
  id,
  state,
  navigate,
  orderDetail,
  logisticsClick,
) {
  if (action === "notifications-read-all") {
    await api("/notifications/read-all", { method: "PATCH" });
    await refreshNotificationCount();
    await navigate();
    return true;
  }
  if (action !== "notification-open") return false;
  const n = state.notifications?.find((n) => n.id === id);
  if (!n) return true;
  const batch = /^batch_in:(\d+)$/.exec(n.type);
  if (batch) {
    const { batch: b } = await api("/logistics/batches/" + batch[1]);
    state.stationId = Number(b.destination_station_id);
    state.batchFilters = { q: b.code };
    state.batchPage = 1;
    history.replaceState(null, "", "#warehouse");
    await navigate();
    await logisticsClick("batch-detail", Number(batch[1]), state, navigate);
  } else if (n.order_id) {
    const { order: o } = await api("/orders/" + n.order_id);
    if (o.status === "pending" || o.status === "picked_up") {
      state.stationId = Number(o.origin_station_id);
      state.pickupFilters = { q: o.tracking_code };
      state.pickupPage = 1;
      state.q = o.tracking_code;
      state.index = 1;
      history.replaceState(null, "", "#warehouse");
      await navigate();
    } else await orderDetail(n.order_id);
  }
  await api("/notifications/" + id + "/read", { method: "PATCH" });
  await refreshNotificationCount();
  return true;
}

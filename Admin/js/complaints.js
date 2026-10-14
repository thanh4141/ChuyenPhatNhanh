import { api } from "./api.js";
import {
  esc,
  heading,
  empty,
  date,
  options,
  modal,
  formError,
  closeModal,
  toast,
} from "./ui.js";
const labels = {
  open: "Chờ xử lý",
  processing: "Đang xử lý",
  resolved: "Đã giải quyết",
  rejected: "Từ chối",
};
export async function complaintsPage(state) {
  const data = await api(
    "/complaints?" +
      new URLSearchParams({
        page: state.index,
        limit: 20,
        q: state.q,
        ...(state.status ? { status: state.status } : {}),
      }),
  );
  state.complaints = data.items;
  return (
    heading(
      "Khiếu nại khách hàng",
      "Xem nội dung và phản hồi. Khách hàng nhận thông báo sau mỗi lần cập nhật.",
    ) +
    `<form id="filter-form" class="filter-row"><input name="q" placeholder="Mã vận đơn hoặc tiêu đề" aria-label="Tìm khiếu nại" value="${esc(state.q)}"><select name="status" aria-label="Trạng thái khiếu nại">${options([["", "Tất cả trạng thái"], ...Object.entries(labels)], state.status)}</select><button class="button primary">Tìm kiếm</button></form>` +
    `<section class="panel">${data.items.length ? `<div class="table-scroll"><table><thead><tr><th>Vận đơn / Khách hàng</th><th>Khiếu nại</th><th>Trạng thái</th><th>Ngày gửi</th><th></th></tr></thead><tbody>${data.items.map((k) => `<tr><td><button class="code-link" data-action="order-detail" data-id="${k.order_id}">${esc(k.tracking_code)}</button><small>${esc(k.customer_name)}</small></td><td>${esc(k.title)}</td><td>${labels[k.status]}</td><td>${date(k.created_at, true)}</td><td><button class="button small" data-action="complaint-detail" data-id="${k.id}">Xem / Phản hồi</button></td></tr>`).join("")}</tbody></table></div>` : empty("Chưa có khiếu nại")}<div class="form-actions"><span>${data.total} khiếu nại · Trang ${data.page}</span><button class="button" data-action="prev" ${data.page <= 1 ? "disabled" : ""}>Trang trước</button><button class="button" data-action="next" ${data.page * data.limit >= data.total ? "disabled" : ""}>Trang sau</button></div></section>`
  );
}
export function complaintDetail(id, state) {
  const k = state.complaints.find((k) => k.id === id);
  if (!k) return;
  const ended = ["resolved", "rejected"].includes(k.status);
  modal(
    "Khiếu nại · " + k.tracking_code,
    `<h3>${esc(k.title)}</h3><p class="muted">${esc(k.customer_name)} · ${date(k.created_at, true)} · ${labels[k.status]}</p><p style="white-space:pre-wrap">${esc(k.message)}</p>` +
      (ended
        ? `<h3>Phản hồi</h3><p style="white-space:pre-wrap">${esc(k.response)}</p><p class="muted">${esc(k.handler_name || "")} · ${date(k.handled_at, true)}</p>`
        : `<form id="complaint-form" data-id="${k.id}"><label>Trạng thái xử lý<select name="status">${options(
            Object.entries(labels).filter(([v]) => v !== "open"),
            k.status === "open" ? "processing" : k.status,
          )}</select></label><label>Phản hồi cho khách hàng<textarea name="response" required minlength="3" maxlength="2000" rows="5">${esc(k.response)}</textarea></label><p class="form-hint">Đã giải quyết hoặc Từ chối sẽ kết thúc khiếu nại. Cần ghi rõ kết quả xử lý.</p>${formError("complaint-form")}<div class="form-actions"><button class="button primary">Gửi phản hồi</button></div></form>`),
  );
}
export async function complaintSubmit(f, data, navigate) {
  if (f.id !== "complaint-form") return false;
  await api("/complaints/" + f.dataset.id, { method: "PATCH", body: data });
  closeModal();
  await navigate();
  toast("Đã phản hồi và thông báo cho khách hàng.");
  return true;
}

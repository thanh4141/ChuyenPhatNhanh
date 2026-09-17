export const labels = { pending:'Chờ xác nhận', assigned:'Chờ lấy hàng', picked_up:'Đã lấy hàng', in_transit:'Đang vận chuyển', out_for_delivery:'Đang giao hàng', delivered:'Giao thành công', failed:'Giao thất bại', cancelled:'Đã hủy' };
export const transitions = { pending:['cancelled'], assigned:['picked_up','cancelled'], picked_up:['in_transit'], in_transit:['out_for_delivery'], out_for_delivery:['delivered','failed'], failed:['out_for_delivery','cancelled'], delivered:[], cancelled:[] };
export const esc = value => String(value ?? '').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
export const money = value => new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0}).format(Number(value || 0));
export const number = value => new Intl.NumberFormat('vi-VN').format(Number(value || 0));
export const date = (value, time = false) => value ? new Date(value).toLocaleString('vi-VN',time ? {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'} : {day:'2-digit',month:'2-digit',year:'numeric'}) : '—';
const paths = {
 grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
 box:'<path d="m3 7 9-4 9 4v10l-9 4-9-4V7Zm0 0 9 5 9-5M12 12v9M7 5l9 5v4"/>',
 truck:'<path d="M2 5h12v12H2zM14 9h4l4 4v4h-8"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
 users:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5"/>',
 wallet:'<path d="M20 8V5H4a2 2 0 0 0 0 4h17v11H4a2 2 0 0 1-2-2V7m19 6h-6v4h6"/><path d="M17 15h.01"/>',
 search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
 check:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18"/>',
 logout:'<path d="M9 4H4v16h5m6-13 5 5-5 5M9 12h11"/>',
 download:'<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',
 arrow:'<path d="M4 12h16m-5-5 5 5-5 5"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
};
export const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.box}</svg>`;
export const badge = status => `<span class="badge ${esc(status)}">${esc(labels[status] || status)}</span>`;
export const empty = (title = 'Chưa có dữ liệu', description = 'Dữ liệu sẽ xuất hiện tại đây khi bạn bắt đầu sử dụng.') => `<div class="empty">${icon('box')}<strong>${esc(title)}</strong><p>${esc(description)}</p></div>`;
export const heading = (title, subtitle, actions = '') => `<div class="page-heading"><div><h1>${title}</h1><p>${subtitle}</p></div><div class="heading-actions">${actions}</div></div>`;
export const createButton = () => `<button class="button primary" data-action="create-order">${icon('plus')}Tạo đơn hàng</button>`;
export function orderTable(items) {
  if (!items.length) return empty('Chưa có đơn hàng','Tạo đơn mới hoặc thay đổi bộ lọc để xem kết quả.');
  return `<div class="table-scroll"><table><thead><tr><th>Mã vận đơn</th><th>Người nhận</th><th>Dịch vụ</th><th>Trạng thái</th><th>Cước phí / COD</th><th>Nhân viên</th><th></th></tr></thead><tbody>${items.map(o => `<tr><td><button class="code-link" data-action="order-detail" data-id="${o.id}">${esc(o.tracking_code)}</button><small>${date(o.created_at)}</small></td><td><strong>${esc(o.receiver_name)}</strong><small>${esc(o.receiver_phone)}</small></td><td>${esc(o.service_name)}<small>${number(o.weight)} kg · ${o.zone === 'domestic' ? 'Liên tỉnh' : 'Nội tỉnh'}</small></td><td>${badge(o.status)}</td><td><strong>${money(o.shipping_fee)}</strong><small>COD: ${money(o.cod_amount)}</small></td><td>${esc(o.employee_name || 'Chưa phân công')}</td><td><button class="icon-button" aria-label="Chi tiết ${esc(o.tracking_code)}" data-action="order-detail" data-id="${o.id}">${icon('arrow')}</button></td></tr>`).join('')}</tbody></table></div>`;
}
let toastTimer;
export function toast(message, error = false) { const el = document.getElementById('toast'); el.textContent = message; el.className = `toast${error?' error':''}`; el.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => el.hidden = true, 4500); }
export function modal(title, html) { document.getElementById('modal-title').textContent = title; document.getElementById('modal-body').innerHTML = html; const el = document.getElementById('modal'); if (!el.open) el.showModal(); }
export function closeModal() { document.getElementById('modal').close(); }
export const formError = form => `<p class="error-message span-2" data-form-error="${form}" role="alert"></p>`;
export const options = (items, selected) => items.map(([value,label]) => `<option value="${esc(value)}" ${String(value)===String(selected)?'selected':''}>${esc(label)}</option>`).join('');

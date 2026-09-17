import { api, allUsers, setToken, hasToken } from './api.js';
import { labels, transitions, esc, money, number, date, icon, badge, empty, heading, createButton, orderTable, toast, modal, closeModal, formError, options } from './ui.js';

const $ = selector => document.querySelector(selector);
const titles = { dashboard:'Tổng quan', orders:'Đơn hàng', employees:'Nhân viên', customers:'Khách hàng', services:'Bảng cước', tracking:'Tra cứu vận đơn' };
const state = { user:null, page:'dashboard', index:1, q:'', status:'', items:[], services:[], revision:0 };
document.querySelectorAll('[data-icon]').forEach(el => el.innerHTML = icon(el.dataset.icon));

function showLogin(message = '') { state.user = null; state.revision++; setToken(null); closeModal(); $('#app-view').hidden = true; $('#login-view').hidden = false; $('#login-error').textContent = message; }
async function boot() {
  if (!hasToken()) return showLogin();
  try { const { user } = await api('/auth/me'); if (user.role !== 'admin') return showLogin('Tài khoản này sử dụng ứng dụng CPN Mobile.'); state.user = user; $('#login-view').hidden = true; $('#app-view').hidden = false; $('#profile-name').textContent = user.name; await navigate(); await checkHealth(); }
  catch (error) { showLogin(error.message); }
}
window.addEventListener('session-expired', () => showLogin('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.'));
window.addEventListener('hashchange', () => { state.index=1; state.q=''; state.status=''; navigate(); });
async function checkHealth() { try { await api('/health'); $('#connection-text').textContent='Hệ thống đang hoạt động'; $('#connection-dot').classList.remove('offline'); } catch { $('#connection-text').textContent='Mất kết nối máy chủ'; $('#connection-dot').classList.add('offline'); } }

async function navigate() {
  if (!state.user) return;
  const page = location.hash.slice(1).split('?')[0] || 'dashboard'; state.page = titles[page] ? page : 'dashboard';
  const revision = ++state.revision;
  $('#breadcrumb').textContent = titles[state.page]; document.title = `${titles[state.page]} · CPN`;
  document.querySelectorAll('[data-page]').forEach(el => el.classList.toggle('active',el.dataset.page === state.page));
  $('#sidebar').classList.remove('open'); $('#content').innerHTML = '<div class="loading">Đang tải dữ liệu…</div>';
  try { const html = await ({dashboard:dashboardPage,orders:ordersPage,employees:usersPage,customers:usersPage,services:servicesPage,tracking:trackingPage}[state.page])(); if (revision === state.revision && state.user) $('#content').innerHTML = html; }
  catch (error) { if (revision === state.revision && state.user) $('#content').innerHTML = `${empty('Không tải được dữ liệu',error.message)}<div style="text-align:center"><button class="button" data-action="reload">Thử lại</button></div>`; }
}

async function dashboardPage() {
  const data = await api('/dashboard'); const s = data.summary;
  const stats = [ ['Tổng đơn hàng',number(s.total),'box',`${number(s.customers)} khách hàng đang sử dụng`], ['Đang vận chuyển',number(s.shipping),'truck',`${number(s.pending)} đơn chờ xác nhận`], ['Giao thành công',number(s.delivered),'check',`${s.total?Math.round(s.delivered/s.total*100):0}% tổng số đơn hàng`], ['Doanh thu cước',money(s.revenue),'wallet','Từ các đơn giao thành công'] ];
  const days = Array.from({length:7},(_,i) => { const d=new Date(Date.now()+7*3600000); d.setUTCDate(d.getUTCDate()-6+i); const key=d.toISOString().slice(0,10); return {label:key.slice(8)+'/'+key.slice(5,7),count:data.daily.find(x=>x.date===key)?.count||0}; });
  const max = Math.max(4,...days.map(d=>Number(d.count))); const graph = `<svg viewBox="0 0 560 200" role="img" aria-label="Số đơn tạo trong 7 ngày gần đây: ${days.map(d=>`${d.label}: ${d.count}`).join(', ')}">${[0,1,2,3,4].map(i=>`<line x1="30" y1="${15+i*37}" x2="548" y2="${15+i*37}" stroke="#edf1ef" stroke-dasharray="3 4"/><text x="14" y="${19+i*37}" text-anchor="end">${Math.round(max*(4-i)/4)}</text>`).join('')}${days.map((d,i)=>{const h=Number(d.count)/max*140;return `<rect x="${49+i*73}" y="${163-h}" width="32" height="${h}" rx="4" fill="${i===6?'#155d4b':'#cadfd3'}"><title>${d.label}: ${d.count} đơn</title></rect><text x="${65+i*73}" y="187" text-anchor="middle">${d.label}</text>`;}).join('')}</svg>`;
  const groups = [ ['Giao thành công',Number(s.delivered),'#26765d'],['Đang xử lý',Number(s.shipping),'#a8c4b6'],['Chờ xác nhận',Number(s.pending),'#e3c487'],['Đã hủy',Number(s.total)-Number(s.delivered)-Number(s.shipping)-Number(s.pending),'#e7ebed'] ];
  let degree=0; const gradient=groups.map(([,count,color])=>{const start=degree;degree+=s.total?count/s.total*360:0;return `${color} ${start}deg ${degree}deg`;}).join(',');
  return `${heading('Tổng quan vận hành','Chào '+esc(state.user.name)+', cùng theo dõi những hành trình hôm nay.',`<span class="date-pill">${icon('calendar')}${date(new Date())}</span>${createButton()}`)}
    <div class="stats-grid">${stats.map(([label,value,ico,foot])=>`<section class="stat-card"><div class="stat-top">${label}<span class="stat-icon">${icon(ico)}</span></div><div class="stat-number">${value}</div><div class="stat-foot">${foot}</div></section>`).join('')}</div>
    <div class="analytics-grid"><section class="panel"><div class="panel-header"><div><h3>Hoạt động vận chuyển</h3><p>Đơn hàng được tạo trong 7 ngày gần nhất</p></div><span class="subtle-pill">7 ngày qua</span></div><div class="chart-area">${graph}</div><div class="chart-footer"><span><i class="legend-dot"></i>Đơn hàng mới</span><span>Tổng cộng <strong>${number(days.reduce((sum,d)=>sum+Number(d.count),0))}</strong> đơn</span></div></section>
    <section class="panel"><div class="panel-header"><div><h3>Trạng thái đơn hàng</h3><p>Toàn bộ hành trình của bạn</p></div></div><div class="distribution"><div class="donut" style="background:conic-gradient(${s.total?gradient:'#e7ebed 0deg 360deg'})"><div class="donut-label"><strong>${number(s.total)}</strong><span>Tổng đơn hàng</span></div></div><div class="legend">${groups.map(([label,count,color])=>`<div class="legend-row"><i class="legend-dot" style="background:${color}"></i>${label}<strong>${number(count)}</strong></div>`).join('')}</div></div><div class="info-strip">${icon('truck')}<span>${number(s.employees)} nhân viên đang hoạt động · ${number(s.failed)} đơn cần giao lại</span></div></section></div>
    <section class="panel"><div class="table-toolbar"><div><h3>Đơn hàng gần đây</h3><small class="muted">Những yêu cầu vận chuyển mới nhất</small></div><a class="button ghost" href="#orders">Xem tất cả ${icon('arrow')}</a></div>${orderTable(data.recent)}<div class="table-bottom"><span>Hiển thị ${data.recent.length} đơn hàng gần nhất</span><span>Dữ liệu cập nhật khi mở trang</span></div></section>`;
}
function pager(data) { return `<div class="table-bottom"><span>${number(data.total)} kết quả · Trang ${data.page}/${Math.max(1,Math.ceil(data.total/data.limit))}</span><div class="pagination"><button data-action="prev" ${data.page<=1?'disabled':''} aria-label="Trang trước">‹</button><span>${data.page}</span><button data-action="next" ${data.page*data.limit>=data.total?'disabled':''} aria-label="Trang sau">›</button></div></div>`; }
async function ordersPage() {
  const data = await api(`/orders?${new URLSearchParams({page:state.index,limit:10,q:state.q,...(state.status?{status:state.status}:{})})}`); state.items=data.items;
  return `${heading('Quản lí đơn hàng','Theo dõi, điều phối và quản lí từng hành trình.',createButton())}<section class="panel"><form id="filter-form" class="filter-row"><div class="search-input">${icon('search')}<input name="q" placeholder="Tìm mã vận đơn, người nhận, số điện thoại…" aria-label="Tìm đơn hàng" value="${esc(state.q)}"></div><select name="status" aria-label="Trạng thái">${options([['','Tất cả trạng thái'],...Object.entries(labels)],state.status)}</select><button class="button">Tìm kiếm</button><button class="button" type="button" data-action="export">${icon('download')}Xuất trang này</button></form>${orderTable(data.items)}${pager(data)}</section>`;
}
async function usersPage() {
  const role=state.page==='employees'?'employee':'customer';
  const data=await api(`/users?${new URLSearchParams({role,page:state.index,limit:10,q:state.q})}`); state.items=data.items;
  return `${heading(role==='employee'?'Đội ngũ vận chuyển':'Khách hàng',role==='employee'?'Quản lí nhân viên và trạng thái hoạt động.':'Kết nối và quản lí thông tin người gửi.',`<button class="button primary" data-action="create-user">${icon('plus')}Thêm ${role==='employee'?'nhân viên':'khách hàng'}</button>`)}<section class="panel"><form id="filter-form" class="filter-row"><div class="search-input">${icon('search')}<input name="q" aria-label="Tìm người dùng" placeholder="Tìm tên, email, số điện thoại…" value="${esc(state.q)}"></div><button class="button">Tìm kiếm</button></form>${data.items.length?`<div class="table-scroll"><table><thead><tr><th>Họ và tên</th><th>Liên hệ</th><th>Ngày tham gia</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>${data.items.map(u=>`<tr><td><strong>${esc(u.name)}</strong><small>#${u.id}</small></td><td>${esc(u.email)}<small>${esc(u.phone)}</small></td><td>${date(u.created_at)}</td><td><span class="badge ${u.active?'active':'cancelled'}">${u.active?'Đang hoạt động':'Đã khóa'}</span></td><td><button class="button small" data-action="edit-user" data-id="${u.id}">Chỉnh sửa</button></td></tr>`).join('')}</tbody></table></div>`:empty()}${pager(data)}</section>`;
}
async function servicesPage() {
  const {items}=await api('/services'); state.services=items;
  return `${heading('Bảng cước vận chuyển','Mức phí cấu hình của hệ thống. Thay đổi chỉ áp dụng cho đơn mới.')}<div class="service-grid">${items.map(s=>`<section class="panel service-card"><div class="service-symbol">${icon(s.code==='express'?'truck':'box')}</div><h2>${esc(s.name)}</h2><p>${esc(s.description)}</p><div class="service-price">${money(s.base_fee)}</div><small class="muted">Cước cơ bản cho 1 kg đầu tiên · Nội tỉnh</small><div class="service-facts"><p>Mỗi 0,5 kg tiếp theo<strong>+ ${money(s.extra_half_kg)}</strong></p><p>Phụ phí liên tỉnh<strong>+ ${money(s.domestic_surcharge)}</strong></p><p>Thời gian dự kiến<strong>${esc(s.estimated_days)}</strong></p><p>Trạng thái<strong>${s.active?'Đang áp dụng':'Tạm ngưng'}</strong></p></div><button class="button" data-action="edit-service" data-id="${s.id}">Chỉnh sửa bảng cước</button></section>`).join('')}</div><p class="form-hint" style="margin-top:20px">Khối lượng vượt 1 kg được làm tròn lên theo mỗi 0,5 kg. COD là khoản thu hộ, được thống kê riêng với doanh thu cước.</p>`;
}
function trackingPage() { return `${heading('Tra cứu vận đơn','Cập nhật hành trình qua mã vận đơn.')}<section class="panel tracking-panel"><div class="tracking-hero"><div class="service-symbol">${icon('search')}</div><h2>Kiện hàng đang ở đâu?</h2><p>Nhập mã vận đơn để xem trạng thái và lịch sử vận chuyển.</p></div><form id="tracking-form" class="tracking-form"><input name="code" aria-label="Mã vận đơn" placeholder="VD: CPNDEMO000001" required maxlength="30"><button class="button primary">Tra cứu ${icon('arrow')}</button></form><div id="tracking-result"></div></section>`; }

const field = (name,label,type='text',value='',extra='') => `<label>${label}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;
async function createOrder() {
  const [customers,{items:services}] = await Promise.all([allUsers('customer',true),api('/services')]);
  const activeServices=services.filter(s=>s.active);
  if (!customers.length) return toast('Hãy thêm khách hàng trước khi tạo đơn.',true);
  if (!activeServices.length) return toast('Cần bật ít nhất một dịch vụ vận chuyển.',true);
  modal('Tạo đơn hàng mới',`<form id="order-form"><div class="form-grid"><label class="span-2">Khách hàng<select name="customer_id" required><option value="">Chọn khách hàng</option>${options(customers.map(c=>[c.id,`${c.name} · ${c.phone}`]))}</select></label><div class="form-section span-2">01 · Thông tin người gửi</div>${field('sender_name','Họ tên người gửi','text','','required maxlength="120"')}${field('sender_phone','Số điện thoại','tel','','required maxlength="20"')}<label class="span-2">Địa chỉ lấy hàng<input name="sender_address" required maxlength="500" placeholder="Số nhà, đường, phường/xã, tỉnh/thành"></label><div class="form-section span-2">02 · Thông tin người nhận</div>${field('receiver_name','Họ tên người nhận','text','','required maxlength="120"')}${field('receiver_phone','Số điện thoại','tel','','required maxlength="20"')}<label class="span-2">Địa chỉ giao hàng<input name="receiver_address" required maxlength="500"></label><div class="form-section span-2">03 · Kiện hàng & dịch vụ</div>${field('package_name','Tên hàng hóa','text','','required maxlength="200"')}${field('weight','Khối lượng (kg)','number',1,'required min="0.01" max="1000" step="0.01"')}<label>Dịch vụ<select name="service_id">${options(activeServices.map(s=>[s.id,s.name]))}</select></label><label>Tuyến vận chuyển<select name="zone">${options([['same_city','Nội tỉnh / cùng thành phố'],['domestic','Liên tỉnh']])}</select></label>${field('cod_amount','Tiền thu hộ COD (đ)','number',0,'required min="0" max="100000000" step="1"')}<label>Người trả cước<select name="payer">${options([['sender','Người gửi'],['receiver','Người nhận']])}</select></label><label class="span-2">Ghi chú<textarea name="note" maxlength="1000" placeholder="Hướng dẫn lấy hoặc giao hàng…"></textarea></label><div class="quote-box span-2"><span>Cước vận chuyển dự kiến</span><strong id="quote">Đang tính…</strong></div>${formError('order-form')}</div><div class="form-actions"><button type="button" class="button" data-action="close-modal">Đóng</button><button class="button primary">Tạo đơn hàng</button></div></form>`);
  const form=$('#order-form'); form.elements.customer_id.addEventListener('change',()=>{const user=customers.find(c=>c.id===Number(form.elements.customer_id.value)); if(user){['name','phone','address'].forEach(key=>form.elements['sender_'+key].value=user[key]||'');}});
  let quoteRevision=0;
  const quote = async () => { const revision=++quoteRevision; try { const data=await api('/services/quote',{method:'POST',body:{service_id:Number(form.elements.service_id.value),weight:Number(form.elements.weight.value),zone:form.elements.zone.value}}); if(revision===quoteRevision && $('#quote')) $('#quote').textContent=money(data.shipping_fee); } catch { if(revision===quoteRevision && $('#quote')) $('#quote').textContent='Kiểm tra khối lượng'; } };
  ['weight','service_id','zone'].forEach(name=>form.elements[name].addEventListener('change',quote)); await quote();
}

async function orderDetail(id) {
  const [{order:o,events},employees] = await Promise.all([api(`/orders/${id}`),allUsers('employee',true)]);
  const next=transitions[o.status]||[];
  modal('Chi tiết vận đơn',`<div class="detail-top"><strong class="code-link">${esc(o.tracking_code)}</strong>${badge(o.status)}</div><div class="detail-grid"><div class="detail-card"><h3>Người gửi</h3><strong>${esc(o.sender_name)}</strong><p>${esc(o.sender_phone)}</p><p>${esc(o.sender_address)}</p></div><div class="detail-card"><h3>Người nhận</h3><strong>${esc(o.receiver_name)}</strong><p>${esc(o.receiver_phone)}</p><p>${esc(o.receiver_address)}</p></div></div><div class="detail-facts"><div><span>Hàng hóa</span>${esc(o.package_name)}</div><div><span>Dịch vụ</span>${esc(o.service_name)} · ${number(o.weight)} kg</div><div><span>Tuyến vận chuyển</span>${o.zone==='domestic'?'Liên tỉnh':'Nội tỉnh'}</div><div><span>Cước vận chuyển</span>${money(o.shipping_fee)}</div><div><span>Thu hộ COD</span>${money(o.cod_amount)}</div><div><span>Người trả cước</span>${o.payer==='sender'?'Người gửi':'Người nhận'}</div></div>${o.note?`<p class="form-hint">Ghi chú: ${esc(o.note)}</p>`:''}
    <h3>Điều phối giao hàng</h3><p class="form-hint">Nhân viên phụ trách: ${esc(o.employee_name||'Chưa phân công')}</p>${!['delivered','cancelled'].includes(o.status)?`<form id="assign-form" class="inline-form" data-id="${o.id}"><label>Nhân viên vận chuyển<select name="employee_id" required><option value="">Chọn nhân viên</option>${options(employees.map(e=>[e.id,e.name]),o.employee_id)}</select></label><button class="button primary">Phân công</button></form>`:''}
    ${next.length?`<form id="status-form" data-id="${o.id}"><div class="inline-form"><label>Trạng thái tiếp theo<select name="status">${options(next.map(s=>[s,labels[s]]))}</select></label><button class="button">Cập nhật</button></div><textarea name="note" placeholder="Ghi chú / lý do (bắt buộc khi hủy hoặc giao thất bại)" maxlength="1000"></textarea>${formError('status-form')}</form>`:''}<p class="error-message" data-form-error="assign-form"></p><h3 style="margin-top:26px">Lịch sử vận chuyển</h3><ol class="timeline">${events.map(e=>`<li><strong>${esc(labels[e.status]||e.status)}</strong><small>${date(e.created_at,true)} · ${esc(e.actor_name)}</small><p>${esc(e.note)}</p></li>`).join('')}</ol>`);
}
function userForm(existing) {
  const role=state.page==='employees'?'employee':'customer'; const u=existing||{};
  modal(existing?'Chỉnh sửa người dùng':`Thêm ${role==='employee'?'nhân viên':'khách hàng'}`,`<form id="user-form" data-id="${u.id||''}" data-role="${role}"><div class="form-grid">${field('name','Họ và tên','text',u.name||'','required maxlength="120"')}${field('phone','Số điện thoại','tel',u.phone||'','required maxlength="20"')}${existing?'':`${field('email','Email đăng nhập','email','','required maxlength="190"')}${field('password','Mật khẩu ban đầu','password','','required minlength="8" autocomplete="new-password"')}`}<label class="span-2">Địa chỉ<textarea name="address" maxlength="500">${esc(u.address||'')}</textarea></label>${existing?`<label class="span-2">Trạng thái tài khoản<select name="active">${options([['1','Đang hoạt động'],['0','Khóa tài khoản']],u.active?'1':'0')}</select></label>`:''}${formError('user-form')}</div><div class="form-actions"><button class="button primary">Lưu thông tin</button></div></form>`);
}
function serviceForm(id) {
  const s=state.services.find(x=>x.id===id); if(!s)return;
  modal('Cập nhật bảng cước',`<form id="service-form" data-id="${id}"><div class="form-grid">${field('name','Tên dịch vụ','text',s.name,'required maxlength="100"')}${field('estimated_days','Thời gian dự kiến','text',s.estimated_days,'required maxlength="30"')}<label class="span-2">Mô tả<input name="description" value="${esc(s.description)}" required maxlength="255"></label>${field('base_fee','Cước 1 kg đầu (đ)','number',s.base_fee,'required min="0" max="10000000"')}${field('extra_half_kg','Mỗi 0,5 kg thêm (đ)','number',s.extra_half_kg,'required min="0" max="1000000"')}${field('domestic_surcharge','Phụ phí liên tỉnh (đ)','number',s.domestic_surcharge,'required min="0" max="10000000"')}<label>Trạng thái<select name="active">${options([['1','Đang áp dụng'],['0','Tạm ngưng']],s.active?'1':'0')}</select></label>${formError('service-form')}</div><div class="form-actions"><button class="button primary">Lưu bảng cước</button></div></form>`);
}
function profileForm() { const u=state.user; modal('Tài khoản của bạn',`<form id="profile-form"><div class="form-grid">${field('name','Họ và tên','text',u.name,'required maxlength="120"')}${field('phone','Số điện thoại','tel',u.phone,'required')}<label class="span-2">Địa chỉ<textarea name="address" maxlength="500">${esc(u.address)}</textarea></label>${formError('profile-form')}</div><div class="form-actions"><button class="button primary">Lưu thông tin</button></div></form><form id="password-form"><h3 style="margin-top:25px">Đổi mật khẩu</h3><div class="form-grid">${field('current_password','Mật khẩu hiện tại','password','','required autocomplete="current-password"')}${field('new_password','Mật khẩu mới','password','','required minlength="8" autocomplete="new-password"')}${formError('password-form')}</div><div class="form-actions"><button class="button">Đổi mật khẩu</button></div></form>`); }
function exportCsv() {
  if(!state.items.length)return toast('Không có dữ liệu để xuất.',true);
  const cell=v=>`"${String(v??'').replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')}"`;
  const rows=[['Mã vận đơn','Người nhận','Số điện thoại','Trạng thái','Cước','COD','Nhân viên'],...state.items.map(o=>[o.tracking_code,o.receiver_name,o.receiver_phone,labels[o.status],o.shipping_fee,o.cod_amount,o.employee_name||''])];
  const url=URL.createObjectURL(new Blob(['\uFEFF'+rows.map(r=>r.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'})); const a=document.createElement('a');a.href=url;a.download=`don-hang-trang-${state.index}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-action]');if(!button)return;const action=button.dataset.action;const id=Number(button.dataset.id);
  try {
    if(action==='menu')return $('#sidebar').classList.toggle('open');
    if(action==='close-modal')return closeModal();
    if(action==='logout'){await api('/auth/logout',{method:'POST'});return showLogin();}
    if(action==='reload')return navigate();
    if(action==='prev'||action==='next'){state.index+=action==='prev'?-1:1;return navigate();}
    if(action==='create-order')return await createOrder();
    if(action==='order-detail')return await orderDetail(id);
    if(action==='create-user')return userForm();
    if(action==='edit-user')return userForm(state.items.find(u=>u.id===id));
    if(action==='edit-service')return serviceForm(id);
    if(action==='profile')return profileForm();
    if(action==='export')return exportCsv();
  } catch(error){toast(error.message,true);}
});
document.addEventListener('submit',async event=>{
  const form=event.target;if(!(form instanceof HTMLFormElement))return;event.preventDefault();
  const data=Object.fromEntries(new FormData(form));const button=form.querySelector('button[type="submit"],button:not([type])');if(button?.disabled)return;
  if(button)button.disabled=true; const errorEl=$(`[data-form-error="${form.id}"]`);if(errorEl)errorEl.textContent='';
  try {
    if(form.id==='login-form'){const result=await api('/auth/login',{method:'POST',body:data});if(result.user.role!=='admin')throw new Error('Vui lòng dùng ứng dụng CPN Mobile cho tài khoản này.');setToken(result.token);form.reset();await boot();return;}
    if(form.id==='filter-form'){state.q=data.q;state.status=data.status||'';state.index=1;await navigate();return;}
    if(form.id==='tracking-form'){const result=await api(`/tracking/${encodeURIComponent(data.code.trim().toUpperCase())}`);$('#tracking-result').innerHTML=`<div class="detail-top"><strong>${esc(result.order.tracking_code)}</strong>${badge(result.order.status)}</div><ol class="timeline">${result.events.map(e=>`<li><strong>${esc(e.label)}</strong><small>${date(e.created_at,true)}</small></li>`).join('')}</ol>`;return;}
    if(form.id==='order-form'){['customer_id','service_id','weight','cod_amount'].forEach(key=>data[key]=Number(data[key]));const result=await api('/orders',{method:'POST',body:data});closeModal();toast(`Đã tạo ${result.order.tracking_code}`);await navigate();return;}
    if(form.id==='assign-form'||form.id==='status-form'){const assign=form.id==='assign-form';if(assign)data.employee_id=Number(data.employee_id);await api(`/orders/${form.dataset.id}/${assign?'assign':'status'}`,{method:'PATCH',body:data});toast(assign?'Đã phân công nhân viên.':'Đã cập nhật trạng thái.');await orderDetail(Number(form.dataset.id));await navigate();return;}
    if(form.id==='user-form'){const edit=Boolean(form.dataset.id);if(edit)data.active=data.active==='1';else data.role=form.dataset.role;await api('/users'+(edit?'/'+form.dataset.id:''),{method:edit?'PATCH':'POST',body:data});toast('Đã lưu người dùng.');closeModal();await navigate();return;}
    if(form.id==='service-form'){['base_fee','extra_half_kg','domestic_surcharge'].forEach(key=>data[key]=Number(data[key]));data.active=data.active==='1';await api(`/services/${form.dataset.id}`,{method:'PATCH',body:data});toast('Đã lưu bảng cước.');closeModal();await navigate();return;}
    if(form.id==='profile-form'){const {user}=await api('/auth/me',{method:'PATCH',body:data});state.user=user;$('#profile-name').textContent=user.name;toast('Đã cập nhật thông tin.');closeModal();await navigate();return;}
    if(form.id==='password-form'){await api('/auth/change-password',{method:'POST',body:data});showLogin('Đã đổi mật khẩu. Vui lòng đăng nhập lại.');return;}
  } catch(error) { if(form.id==='login-form')$('#login-error').textContent=error.message;else if(errorEl)errorEl.textContent=error.message;else if(form.id==='tracking-form')$('#tracking-result').innerHTML=empty('Không có kết quả',error.message);else toast(error.message,true); }
  finally { if(button)button.disabled=false; }
});
boot();

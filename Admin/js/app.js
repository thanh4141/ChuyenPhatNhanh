import { api, allUsers, setToken, hasToken, mediaUrl } from './api.js';
import { labels, routes, esc, money, number, date, icon, badge, empty, heading, orderTable, toast, modal, closeModal, formError, options } from './ui.js';
const $=s=>document.querySelector(s);
const titles={dashboard:'Tổng quan',orders:'Đơn hàng',accounts:'Tài khoản',profiles:'Hồ sơ nhân viên',services:'Bảng cước'};
const state={user:null,page:'dashboard',index:1,q:'',status:'',items:[],services:[],users:[],revision:0,accounts:{customer:{q:'',page:1},employee:{q:'',page:1}}};
let imageUrls=[];
function releaseImages(){imageUrls.forEach(URL.revokeObjectURL);imageUrls=[];}
document.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));
function showLogin(message=''){state.user=null;state.revision++;setToken(null);closeModal();$('#app-view').hidden=true;$('#login-view').hidden=false;$('#login-error').textContent=message;}
async function boot(){if(!hasToken())return showLogin();try{const {user}=await api('/auth/me');if(user.role!=='admin')return showLogin('Tài khoản này sử dụng ứng dụng CPN Mobile.');state.user=user;$('#login-view').hidden=true;$('#app-view').hidden=false;$('#profile-name').textContent=user.name;await navigate();await api('/health');$('#connection-text').textContent='MySQL · Đang hoạt động';}catch(e){showLogin(e.message);}}
window.addEventListener('session-expired',()=>showLogin('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.'));
window.addEventListener('hashchange',()=>{state.index=1;state.q='';state.status='';navigate();});
async function navigate(){
 if(!state.user)return;state.page=location.hash.slice(1)||'dashboard';if(!titles[state.page])state.page='dashboard';const revision=++state.revision;
 $('#breadcrumb').textContent=titles[state.page];document.title=titles[state.page]+' · CPN';
 document.querySelectorAll('[data-page]').forEach(el=>el.classList.toggle('active',el.dataset.page===state.page));$('#sidebar').classList.remove('open');$('#content').innerHTML='<div class="loading">Đang tải dữ liệu…</div>';
 try{const html=await ({dashboard:dashboardPage,orders:ordersPage,accounts:accountsPage,profiles:profilesPage,services:servicesPage}[state.page])();if(revision===state.revision&&state.user)$('#content').innerHTML=html;}
 catch(e){if(revision===state.revision&&state.user)$('#content').innerHTML=empty('Không tải được dữ liệu',e.message)+'<button class="button" data-action="reload">Thử lại</button>';}
}
async function dashboardPage() {
  const data = await api('/dashboard'); const s = data.summary;
  const stats = [ ['Tổng đơn hàng',number(s.total),'box',`${number(s.customers)} khách hàng đang sử dụng`], ['Đang vận chuyển',number(s.shipping),'truck',`${number(s.pending)} đơn chờ nhận`], ['Giao thành công',number(s.delivered),'check',`${s.total?Math.round(s.delivered/s.total*100):0}% tổng số đơn hàng`], ['Doanh thu cước',money(s.revenue),'wallet','Từ các đơn giao thành công'] ];
  const days = Array.from({length:7},(_,i) => { const d=new Date(Date.now()+7*3600000); d.setUTCDate(d.getUTCDate()-6+i); const key=d.toISOString().slice(0,10); return {label:key.slice(8)+'/'+key.slice(5,7),count:data.daily.find(x=>x.date===key)?.count||0}; });
  const max = Math.max(4,...days.map(d=>Number(d.count))); const graph = `<svg viewBox="0 0 560 200" role="img" aria-label="Số đơn tạo trong 7 ngày gần đây: ${days.map(d=>`${d.label}: ${d.count}`).join(', ')}">${[0,1,2,3,4].map(i=>`<line x1="30" y1="${15+i*37}" x2="548" y2="${15+i*37}" stroke="#edf1ef" stroke-dasharray="3 4"/><text x="14" y="${19+i*37}" text-anchor="end">${Math.round(max*(4-i)/4)}</text>`).join('')}${days.map((d,i)=>{const h=Number(d.count)/max*140;return `<rect x="${49+i*73}" y="${163-h}" width="32" height="${h}" rx="4" fill="${i===6?'#155d4b':'#cadfd3'}"><title>${d.label}: ${d.count} đơn</title></rect><text x="${65+i*73}" y="187" text-anchor="middle">${d.label}</text>`;}).join('')}</svg>`;
  const groups = [ ['Giao thành công',Number(s.delivered),'#26765d'],['Đang xử lý',Number(s.shipping),'#a8c4b6'],['Chờ nhận',Number(s.pending),'#e3c487'],['Hủy / chưa hoàn thành',Number(s.total)-Number(s.delivered)-Number(s.shipping)-Number(s.pending),'#e7ebed'] ];
  let degree=0; const gradient=groups.map(([,count,color])=>{const start=degree;degree+=s.total?count/s.total*360:0;return `${color} ${start}deg ${degree}deg`;}).join(',');
  return `${heading('Tổng quan vận hành','Chào '+esc(state.user.name)+', cùng theo dõi những hành trình hôm nay.',`<span class="date-pill">${icon('calendar')}${date(new Date())}</span>`)}
    <div class="stats-grid">${stats.map(([label,value,ico,foot])=>`<section class="stat-card"><div class="stat-top">${label}<span class="stat-icon">${icon(ico)}</span></div><div class="stat-number">${value}</div><div class="stat-foot">${foot}</div></section>`).join('')}</div>
    <div class="analytics-grid"><section class="panel"><div class="panel-header"><div><h3>Hoạt động vận chuyển</h3><p>Đơn hàng được tạo trong 7 ngày gần nhất</p></div><span class="subtle-pill">7 ngày qua</span></div><div class="chart-area">${graph}</div><div class="chart-footer"><span><i class="legend-dot"></i>Đơn hàng mới</span><span>Tổng cộng <strong>${number(days.reduce((sum,d)=>sum+Number(d.count),0))}</strong> đơn</span></div></section>
    <section class="panel"><div class="panel-header"><div><h3>Trạng thái đơn hàng</h3><p>Toàn bộ hành trình của bạn</p></div></div><div class="distribution"><div class="donut" style="background:conic-gradient(${s.total?gradient:'#e7ebed 0deg 360deg'})"><div class="donut-label"><strong>${number(s.total)}</strong><span>Tổng đơn hàng</span></div></div><div class="legend">${groups.map(([label,count,color])=>`<div class="legend-row"><i class="legend-dot" style="background:${color}"></i>${label}<strong>${number(count)}</strong></div>`).join('')}</div></div><div class="info-strip">${icon('truck')}<span>${number(s.employees)} nhân viên đang hoạt động · ${number(s.failed)} đơn chưa hoàn thành</span></div></section></div>
    <section class="panel"><div class="table-toolbar"><div><h3>Đơn hàng gần đây</h3><small class="muted">Những yêu cầu vận chuyển mới nhất</small></div><a class="button ghost" href="#orders">Xem tất cả ${icon('arrow')}</a></div>${orderTable(data.recent)}<div class="table-bottom"><span>Hiển thị ${data.recent.length} đơn hàng gần nhất</span><span>Dữ liệu cập nhật khi mở trang</span></div></section>`;
}
function pager(d,role=''){return `<div class="table-bottom"><span>${number(d.total)} kết quả · ${d.page}/${Math.max(1,Math.ceil(d.total/d.limit))}</span><div class="pagination"><button data-action="prev" data-role="${role}" ${d.page<=1?'disabled':''}>‹</button><button data-action="next" data-role="${role}" ${d.page*d.limit>=d.total?'disabled':''}>›</button></div></div>`;}
async function ordersPage(){
 const d=await api('/orders?'+new URLSearchParams({page:state.index,limit:10,q:state.q,...(state.status?{status:state.status}:{})}));
 return heading('Quản lí đơn hàng','Xem thông tin kiện hàng, chi phí và lịch sử vận chuyển.')+`<section class="panel"><form id="filter-form" class="filter-row"><input name="q" placeholder="Mã đơn, tên hoặc số điện thoại người nhận" aria-label="Tìm đơn hàng" value="${esc(state.q)}"><select name="status" aria-label="Trạng thái">${options([['','Tất cả trạng thái'],...Object.entries(labels)],state.status)}</select><button class="button">Tìm kiếm</button></form>${orderTable(d.items)}${pager(d)}</section>`;
}
async function accountsPage(){
 const lists=await Promise.all(['customer','employee'].map(role=>api('/users?'+new URLSearchParams({role,limit:8,...state.accounts[role]}))));
 state.users=lists.flatMap(d=>d.items);
 return heading('Quản lí tài khoản','Tìm kiếm khách hàng và quản lí tài khoản đội ngũ vận chuyển.')+`<div class="accounts-grid">${lists.map((d,i)=>{const role=i?'employee':'customer';return `<section class="panel"><div class="panel-header"><h3>${i?'Tài khoản nhân viên':'Tài khoản khách hàng'}</h3>${i?'<button class="button primary small" data-action="create-user">Thêm nhân viên</button>':''}</div><form class="filter-row account-filter" data-role="${role}"><input name="q" aria-label="Tìm ${i?'nhân viên':'khách hàng'}" placeholder="Tên, email, số điện thoại" value="${esc(state.accounts[role].q)}"><button class="button">Tìm kiếm</button></form>${d.items.length?`<div class="account-list">${d.items.map(u=>`<article class="account-row"><div><strong>${esc(u.name)}</strong><p>${esc(u.email)}<br>${esc(u.phone)}</p><span class="badge ${u.active?'active':'cancelled'}">${u.active?'Đang hoạt động':'Đã khóa'}</span></div><button class="button small" data-action="${i?'edit-user':'toggle-user'}" data-id="${u.id}">${i?'Sửa':u.active?'Khóa':'Mở khóa'}</button></article>`).join('')}</div>`:empty()}${pager(d,role)}</section>`;}).join('')}</div>`;
}
async function profilesPage(){
 const d=await api('/employees?'+new URLSearchParams({page:state.index,limit:10,q:state.q}));state.items=d.items;
 return heading('Hồ sơ nhân viên','Thông tin công việc và liên hệ của đội ngũ vận chuyển.','<button class="button primary" data-action="create-profile">Thêm hồ sơ</button>')+`<section class="panel"><form id="filter-form" class="filter-row"><input name="q" aria-label="Tìm hồ sơ" placeholder="Mã nhân viên, tên, điện thoại, CCCD" value="${esc(state.q)}"><button class="button">Tìm kiếm</button></form>${d.items.length?`<div class="table-scroll"><table><thead><tr><th>Nhân viên</th><th>Liên hệ</th><th>Quê quán / CCCD</th><th>Ngày vào làm</th><th>Trạng thái</th><th></th></tr></thead><tbody>${d.items.map(p=>`<tr><td><strong>${esc(p.name)}</strong><small>${esc(p.employee_code)}</small></td><td>${esc(p.phone)}<small>${esc(p.email)}</small></td><td>${esc(p.hometown||'—')}<small>${esc(p.identity_number||'Chưa bổ sung CCCD')}</small></td><td>${date(p.hired_at)}</td><td>${p.employment_status==='active'?'Đang làm việc':'Đã ngừng'}</td><td><button class="button small" data-action="edit-profile" data-id="${p.id}">Sửa hồ sơ</button></td></tr>`).join('')}</tbody></table></div>`:empty()}${pager(d)}</section>`;
}
async function servicesPage(){
 const {items}=await api('/services');state.services=items;
 return heading('Bảng cước vận chuyển','3 tuyến · Tiêu chuẩn và hỏa tốc. Giá minh họa có thể chỉnh theo thực tế.')+`<div class="service-grid">${items.map(s=>`<section class="panel service-card"><span class="eyebrow">${esc(routes[s.route_type])}</span><h2>${esc(s.service_name)}</h2><div class="service-price">${money(s.base_fee)}</div><small class="muted">Bao gồm 5 km đầu · ${number(s.included_weight)} kg đầu</small><div class="service-facts"><p>Mỗi km vượt<strong>${money(s.extra_km_fee)}</strong></p><p>Mỗi ${number(s.weight_step)} kg vượt<strong>${money(s.extra_weight_fee)}</strong></p><p>Thời gian dự kiến<strong>${s.min_days}–${s.max_days} ngày</strong></p><p>Phí dịch vụ COD<strong>${money(s.cod_fee)}</strong></p><p>Bảo hiểm / Đóng gói<strong>${money(s.insurance_fee)} / ${money(s.packaging_fee)}</strong></p><p>Trạng thái<strong>${s.active?'Đang áp dụng':'Tạm ngưng'}</strong></p></div><button class="button" data-action="edit-service" data-id="${s.id}">Chỉnh sửa bảng cước</button></section>`).join('')}</div><p class="form-hint">Quãng đường tính từ điểm lấy đến điểm giao theo OpenStreetMap / OSRM. Khối lượng vượt làm tròn lên theo bước cân; phí vượt km tính theo số mét. Tiền thu hộ COD được tách khỏi tổng cước và phụ phí.</p>`;
}
const field=(name,label,type='text',value='',extra='')=>`<label>${label}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;
const actions='<div class="form-actions"><button type="button" class="button" data-action="close-modal">Đóng</button><button class="button primary">Lưu thông tin</button></div>';
function userForm(u={}){
 modal(u.id?'Sửa tài khoản nhân viên':'Thêm tài khoản nhân viên',`<form id="user-form" data-id="${u.id||''}"><div class="form-grid">${field('name','Họ và tên','text',u.name,'required maxlength="120"')}${field('phone','Số điện thoại','tel',u.phone,'required maxlength="20"')}${field('email','Email đăng nhập','email',u.email,'required maxlength="190"')}${field('password',u.id?'Mật khẩu mới (bỏ trống để giữ)':'Mật khẩu ban đầu','password','',`${u.id?'':'required'} minlength="8" maxlength="128" autocomplete="new-password"`)}${field('address','Địa chỉ liên hệ','text',u.address,'maxlength="500"')}${u.id?`<label>Trạng thái<select name="active">${options([['1','Đang hoạt động'],['0','Đã khóa']],u.active?'1':'0')}</select></label>`:''}${formError('user-form')}</div>${actions}</form>`);
}
async function profileForm(p={}){
 const users=await allUsers('employee');if(!users.length)return toast('Hãy thêm tài khoản nhân viên trước.',true);
 modal(p.id?'Sửa hồ sơ nhân viên':'Thêm hồ sơ nhân viên',`<form id="profile-form" data-id="${p.id||''}"><div class="form-grid"><label class="span-2">Tài khoản nhân viên<select name="user_id" ${p.id?'disabled':''} required>${options(users.map(u=>[u.id,u.name+' · '+u.email]),p.user_id)}</select></label>${field('employee_code','Mã nhân viên','text',p.employee_code,'required maxlength="30" pattern="[A-Za-z0-9_-]+"')}${field('identity_number','CCCD (12 chữ số)','text',p.identity_number,'pattern="[0-9]{12}" maxlength="12"')}${field('hometown','Quê quán','text',p.hometown,'maxlength="255"')}${field('hired_at','Ngày vào làm','date',p.hired_at?String(p.hired_at).slice(0,10):new Date().toISOString().slice(0,10),'required')}<label>Trạng thái làm việc<select name="employment_status">${options([['active','Đang làm việc'],['stopped','Ngừng làm việc']],p.employment_status||'active')}</select></label>${formError('profile-form')}</div><p class="form-hint">Ngừng làm việc sẽ khóa tài khoản. Khi làm lại, mở khóa trong Tài khoản sau khi chuyển hồ sơ sang Đang làm việc.</p>${actions}</form>`);
}
function rateForm(s){
 const entries=[['base_fee','Cước cơ bản (đ)'],['extra_km_fee','Mỗi km vượt 5 km (đ)'],['included_weight','Khối lượng ban đầu (kg)'],['weight_step','Bước khối lượng vượt (kg)'],['extra_weight_fee','Phí mỗi bước cân vượt (đ)'],['cod_fee','Phí dịch vụ COD (đ)'],['min_days','Số ngày tối thiểu'],['max_days','Số ngày tối đa']];
 modal(s.service_name+' · '+routes[s.route_type],`<form id="rate-form" data-id="${s.id}"><div class="form-grid">${entries.map(([k,label])=>field(k,label,'number',s[k],`required min="${['weight_step','included_weight'].includes(k)?'.01':'0'}" step="${['weight_step','included_weight'].includes(k)?'.01':'1'}"`)).join('')}<label>Trạng thái<select name="active">${options([['1','Đang áp dụng'],['0','Tạm ngưng']],s.active?'1':'0')}</select></label>${formError('rate-form')}</div><p class="form-hint">Miễn 5 km đầu · Đóng gói 5.000đ · Bảo hiểm 9.900đ. Đơn đã tạo và báo giá còn hiệu lực giữ nguyên mức phí.</p>${actions}</form>`);
}
async function orderDetail(id){
 releaseImages();const {order:o,events,media,review}=await api('/orders/'+id);
 const q=typeof o.pricing_snapshot==='string'?JSON.parse(o.pricing_snapshot):o.pricing_snapshot;
 modal('Chi tiết vận đơn',`<div class="detail-top"><strong class="code-link">${esc(o.tracking_code)}</strong>${badge(o.status)}</div><div class="detail-grid">${[['Người gửi',o.sender_name,o.sender_phone,o.sender_address],['Người nhận',o.receiver_name,o.receiver_phone,o.receiver_address]].map(([title,name,phone,address])=>`<div class="detail-card"><h3>${title}</h3><strong>${esc(name)}</strong><p>${esc(phone)}</p><p>${esc(address)}</p></div>`).join('')}</div><div class="detail-facts">${[['Hàng hóa',o.package_name],['Dịch vụ',o.service_name+' · '+number(o.weight)+' kg'],['Nhân viên',o.employee_name||'Chưa có người nhận'],['Tuyến',routes[o.route_type]||'Dữ liệu cũ'],['Quãng đường',['osrm','google_routes'].includes(o.distance_source)?number(o.distance_meters/1000)+' km (OpenStreetMap / OSRM)':'Đơn cũ chưa có quãng đường'],['Cước vận chuyển',money(o.shipping_fee)],['Phí thu hộ / bảo hiểm / đóng gói',money(o.cod_fee)+' / '+money(o.insurance_fee)+' / '+money(o.packaging_fee)],['Tổng thanh toán',money(o.total_amount)],['Tiền thu hộ COD',money(o.cod_amount)],...(q?[['Dự kiến',q.rate.min_days+'–'+q.rate.max_days+' ngày']]:[])].map(([k,v])=>`<div><span>${esc(k)}</span>${esc(v)}</div>`).join('')}</div><p class="form-hint">Ghi chú: ${esc(o.note||'Không có')}</p><div class="media-grid">${media.map(m=>`<figure><img data-media="${m.id}" alt="${m.purpose==='parcel'?'Ảnh hàng hóa':'Ảnh sự cố'}"><figcaption>${m.purpose==='parcel'?'Hàng hóa':'Sự cố'}</figcaption></figure>`).join('')}</div>${review?`<div class="info-strip">${'★'.repeat(review.stars)} · ${esc(review.comment)}</div>`:''}<h3>Lịch sử vận chuyển</h3><ol class="timeline">${events.map(e=>`<li><strong>${esc(labels[e.status]||e.status)}</strong><small>${date(e.created_at,true)} · ${esc(e.actor_name)}</small><p>${esc(e.note)}</p></li>`).join('')}</ol>`);
 await Promise.all(media.map(async m=>{try{const url=await mediaUrl(m.id);const img=document.querySelector('[data-media="'+m.id+'"]');if(img){imageUrls.push(url);img.src=url;}else URL.revokeObjectURL(url);}catch(e){toast(e.message,true);}}));
}
document.addEventListener('click',async e=>{
 const b=e.target.closest('[data-action]');if(!b)return;const a=b.dataset.action,id=Number(b.dataset.id);
 try{
 if(a==='menu')$('#sidebar').classList.toggle('open');
 else if(a==='close-modal'){releaseImages();closeModal();}
 else if(a==='logout'){await api('/auth/logout',{method:'POST'});showLogin();}
 else if(a==='reload')await navigate();
 else if(a==='prev'||a==='next'){if(b.dataset.role)state.accounts[b.dataset.role].page+=a==='next'?1:-1;else state.index+=a==='next'?1:-1;await navigate();}
 else if(a==='order-detail')await orderDetail(id);
 else if(a==='create-user')userForm();
 else if(a==='edit-user')userForm(state.users.find(u=>u.id===id));
 else if(a==='toggle-user'){b.disabled=true;const u=state.users.find(u=>u.id===id);await api('/users/'+id,{method:'PATCH',body:{active:!u.active}});await navigate();toast(u.active?'Đã khóa tài khoản.':'Đã mở khóa tài khoản.');}
 else if(a==='create-profile')await profileForm();
 else if(a==='edit-profile')await profileForm(state.items.find(p=>p.id===id));
 else if(a==='edit-service')rateForm(state.services.find(s=>s.id===id));
 else if(a==='profile')modal('Tài khoản quản trị',`<p>${esc(state.user.name)} · ${esc(state.user.email)}</p><form id="password-form">${field('current_password','Mật khẩu hiện tại','password','','required')}${field('new_password','Mật khẩu mới','password','','required minlength="8" maxlength="128"')}${formError('password-form')}${actions}</form>`);
 }catch(error){toast(error.message,true);b.disabled=false;}
});
document.addEventListener('submit',async e=>{
 e.preventDefault();const f=e.target, data=Object.fromEntries(new FormData(f));const button=f.querySelector('button[type="submit"],button:not([type])');if(button)button.disabled=true;
 const error=f.querySelector('[data-form-error]');if(error)error.textContent='';
 try{
 if(f.id==='login-form'){const r=await api('/auth/login',{method:'POST',body:data});if(r.user.role!=='admin')throw new Error('Vui lòng sử dụng ứng dụng CPN Mobile.');setToken(r.token);await boot();return;}
 if(f.id==='filter-form'){state.q=data.q||'';state.status=data.status||'';state.index=1;return await navigate();}
 if(f.classList.contains('account-filter')){state.accounts[f.dataset.role]={q:data.q,page:1};return await navigate();}
 const id=f.dataset.id;
 if(f.id==='user-form'){if(id){data.active=data.active==='1';if(!data.password)delete data.password;}else data.role='employee';await api('/users'+(id?'/'+id:''),{method:id?'PATCH':'POST',body:data});}
 if(f.id==='profile-form'){data.user_id=Number(f.elements.user_id.value);await api('/employees'+(id?'/'+id:''),{method:id?'PATCH':'POST',body:data});}
 if(f.id==='rate-form'){Object.keys(data).forEach(k=>data[k]=k==='active'?data[k]==='1':Number(data[k]));Object.assign(data,{included_km:5,insurance_fee:9900,packaging_fee:5000});await api('/services/'+id,{method:'PATCH',body:data});}
 if(f.id==='password-form'){await api('/auth/change-password',{method:'POST',body:data});showLogin('Đã đổi mật khẩu. Vui lòng đăng nhập lại.');return;}
 closeModal();await navigate();toast('Đã lưu thông tin.');
 }catch(e){if(f.id==='login-form')$('#login-error').textContent=e.message;else if(error)error.textContent=e.message;else toast(e.message,true);}
 finally{if(button)button.disabled=false;}
});
$('#modal').addEventListener('close',releaseImages);boot();

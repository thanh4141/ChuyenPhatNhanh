import {esc,modal,formError} from './ui.js';

export const stationCoordinateFields=(station={})=>`<label>Vĩ độ trạm<input name="latitude" type="number" step="any" value="${esc(station.latitude??'')}" required readonly></label><label>Kinh độ trạm<input name="longitude" type="number" step="any" value="${esc(station.longitude??'')}" required readonly></label><button type="button" class="button" data-action="pick-station-location">Chọn vị trí kho trên bản đồ</button>`;

export function stationLocationForm(station){
  modal('Vị trí kho · '+station.name,`<form id="station-location-form" data-id="${station.id}"><input type="hidden" name="province_code" value="${esc(station.province_code)}"><p>${esc(station.address)} · ${esc(station.province_name)}</p><div class="form-grid">${stationCoordinateFields(station)}</div><p class="form-hint">Ghim đúng lối vào kho, gần đường bộ. Vị trí này dùng để xác định trạm nhận lấy hàng gần nhất.</p>${formError('station-location-form')}<div class="form-actions"><button class="button primary">Lưu vị trí trạm</button></div></form>`);
}

export function pickStationLocation(form){
  if(!form)return;
  const channel=crypto.randomUUID(),dialog=document.createElement('dialog');
  const lat=form.elements.latitude.value,lng=form.elements.longitude.value;
  const params=new URLSearchParams({channel,parent_origin:location.origin,...(lat&&lng?{lat,lng}:{})});
  dialog.style.cssText='width:min(900px,95vw);max-width:95vw;padding:16px';
  dialog.innerHTML=`<button type="button" class="button" id="close-station-map">Đóng bản đồ trạm</button><p role="alert" class="error-message"></p><iframe title="Bản đồ vị trí trạm" src="/maps/picker.html?${esc(params)}" style="width:100%;height:65vh;border:0"></iframe>`;
  document.body.append(dialog);dialog.showModal();
  const receive=e=>{
    const m=e.data,p=m?.location;
    if(e.origin!==location.origin||e.source!==dialog.querySelector('iframe').contentWindow||m?.channel!==channel||m.type!=='cpn-map-location')return;
    if(!Number.isFinite(p?.latitude)||!Number.isFinite(p?.longitude))return;
    if(p.province_code!==form.elements.province_code.value){dialog.querySelector('[role="alert"]').textContent='Ghim chưa thuộc tỉnh/thành của trạm. Hãy chọn lại vị trí.';return;}
    form.elements.latitude.value=String(p.latitude);form.elements.longitude.value=String(p.longitude);dialog.close();
  };
  window.addEventListener('message',receive);
  dialog.addEventListener('close',()=>{window.removeEventListener('message',receive);dialog.remove();},{once:true});
  dialog.querySelector('#close-station-map').onclick=()=>dialog.close();
}

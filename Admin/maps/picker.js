const params=new URLSearchParams(location.search),message=document.getElementById('message'),confirmButton=document.getElementById('confirm'),results=document.getElementById('results');
let map,marker,selected,revision=0,routeLayer,pendingRoute;
const viewOnly=params.get('view')==='route';
if(viewOnly){document.getElementById('search').hidden=true;confirmButton.hidden=true;}
async function json(path){const response=await fetch('/api/maps'+path);const data=await response.json();if(!response.ok)throw new Error(data.message||'Không tải được bản đồ.');return data;}
async function select(point){
 const current=++revision;selected=null;confirmButton.disabled=true;message.textContent='Đang xác định địa chỉ…';marker.setLatLng(point);
 try{const data=await json('/reverse?'+new URLSearchParams({latitude:point.lat,longitude:point.lng}));if(current!==revision)return;selected={latitude:point.lat,longitude:point.lng,province_code:data.province.code,formatted_address:data.formatted_address};message.textContent=data.formatted_address||data.province.name;confirmButton.disabled=false;}catch(e){if(current===revision)message.textContent=e.message;}
}
function showRoute(route){
 if(!map){pendingRoute=route;return;}if(!route?.geometry||route.geometry.type!=='LineString')return;
 if(routeLayer)routeLayer.remove();routeLayer=L.geoJSON(route.geometry,{style:{color:'#155d4b',weight:5}}).addTo(map);map.fitBounds(routeLayer.getBounds(),{padding:[24,24]});
 const points=route.geometry.coordinates;L.circleMarker([points[0][1],points[0][0]],{radius:7,color:'#155d4b',fillOpacity:1}).bindTooltip('Điểm lấy hàng').addTo(map);L.circleMarker([points.at(-1)[1],points.at(-1)[0]],{radius:7,color:'#b45b50',fillOpacity:1}).bindTooltip('Điểm giao hàng').addTo(map);
 message.textContent=(Number(route.distance_meters)/1000).toLocaleString('vi-VN')+' km · Đường bộ ô tô · '+(route.data_version?'Dữ liệu: '+route.data_version:'Máy chủ không công bố ngày dữ liệu');
}
function receive(event){
 let data=event.data;try{if(typeof data==='string')data=JSON.parse(data);}catch{return;}
 if(!viewOnly||data?.type!=='cpn-map-route'||data.channel!==params.get('channel'))return;
 if(!window.ReactNativeWebView){let expected;try{expected=new URL(params.get('parent_origin')).origin;}catch{return;}if(event.source!==window.parent||event.origin!==expected)return;}
 showRoute(data.route);
}
window.addEventListener('message',receive);document.addEventListener('message',event=>{if(window.ReactNativeWebView)receive(event);});
document.getElementById('search').addEventListener('submit',async event=>{
 event.preventDefault();message.textContent='Đang tìm địa chỉ…';results.replaceChildren();const button=event.target.querySelector('button');button.disabled=true;
 try{const data=await json('/search?'+new URLSearchParams({q:document.getElementById('address').value}));message.textContent=data.items.length?'Chọn một kết quả rồi kiểm tra ghim trên bản đồ.':'Chưa tìm thấy. Nhập thêm tên tỉnh/thành hoặc chọn trực tiếp trên bản đồ.';
 for(const item of data.items){const b=document.createElement('button');b.type='button';b.textContent=item.formatted_address;b.onclick=()=>{results.replaceChildren();map.setView([item.latitude,item.longitude],16);void select({lat:item.latitude,lng:item.longitude});};results.appendChild(b);}
 }catch(e){message.textContent=e.message;}finally{button.disabled=false;}
});
confirmButton.addEventListener('click',()=>{if(!selected)return;const payload={type:'cpn-map-location',channel:params.get('channel'),location:selected};if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify(payload));else{let origin;try{origin=new URL(params.get('parent_origin')).origin;}catch{return;}window.parent.postMessage(payload,origin);}});
json('/config').then(config=>{
 const lat=Number(params.get('lat')),lng=Number(params.get('lng')),hasPoint=params.has('lat')&&params.has('lng')&&Number.isFinite(lat)&&Number.isFinite(lng);
 map=L.map('map').setView(hasPoint?[lat,lng]:[10.7769,106.7009],15);
 L.tileLayer(config.tile_url,{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'}).on('tileerror',()=>{message.textContent='Không tải được một phần nền bản đồ. Kiểm tra kết nối mạng.';}).addTo(map);
 if(viewOnly){message.textContent='Đang tải tuyến đường…';if(pendingRoute)showRoute(pendingRoute);return;}
 marker=L.marker(map.getCenter(),{draggable:true}).addTo(map);map.on('click',e=>void select(e.latlng));marker.on('dragend',()=>void select(marker.getLatLng()));message.textContent='Tìm địa chỉ hoặc chạm bản đồ để đặt ghim.';if(hasPoint)void select({lat,lng});
}).catch(e=>{message.textContent=e.message;});

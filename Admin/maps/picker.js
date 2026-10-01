import * as maplibregl from '/maps/vendor/maplibre-gl.mjs';
maplibregl.setWorkerUrl('/maps/vendor/maplibre-gl-worker.mjs');

const params = new URLSearchParams(location.search);
const message = document.getElementById('message');
const warning = document.getElementById('warning');
const confirmButton = document.getElementById('confirm');
const results = document.getElementById('results');
const viewOnly = params.get('view') === 'route';
let map, marker, selected, pendingRoute, revision = 0;
let routeMarkers = [];
if (viewOnly) {
  document.getElementById('search').hidden = true;
  confirmButton.hidden = true;
}

async function json(path) {
  const response = await fetch('/api/maps' + path);
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Không tải được bản đồ.');
  return data;
}

async function select(point) {
  const current = ++revision;
  selected = null;
  confirmButton.disabled = true;
  message.textContent = 'Đang xác định địa chỉ…';
  marker.setLngLat(point);
  try {
    const data = await json('/reverse?' + new URLSearchParams({latitude: point.lat, longitude: point.lng}));
    if (current !== revision) return;
    selected = {latitude: point.lat, longitude: point.lng, province_code: data.province.code, formatted_address: data.formatted_address};
    message.textContent = data.formatted_address || data.province.name;
    confirmButton.disabled = false;
  } catch (error) {
    if (current === revision) message.textContent = error.message;
  }
}

function showRoute(route) {
  if (route?.geometry?.type !== 'LineString' || route.geometry.coordinates.length < 2) return;
  pendingRoute = route;
  if (!map?.isStyleLoaded()) return;
  const feature = {type: 'Feature', properties: {}, geometry: route.geometry};
  if (map.getSource('delivery-route')) {
    map.getSource('delivery-route').setData(feature);
  } else {
    map.addSource('delivery-route', {type: 'geojson', data: feature});
    map.addLayer({id: 'delivery-route-outline', type: 'line', source: 'delivery-route', layout: {'line-join': 'round', 'line-cap': 'round'}, paint: {'line-color': '#fff', 'line-width': 8}});
    map.addLayer({id: 'delivery-route', type: 'line', source: 'delivery-route', layout: {'line-join': 'round', 'line-cap': 'round'}, paint: {'line-color': '#155d4b', 'line-width': 5}});
  }
  routeMarkers.forEach(item => item.remove());
  const points = route.geometry.coordinates;
  routeMarkers = [[points[0], '#155d4b', 'Điểm lấy hàng'], [points.at(-1), '#b45b50', 'Điểm giao hàng']].map(([point, color, title]) => {
    const item = new maplibregl.Marker({color}).setLngLat(point).addTo(map);
    item.getElement().setAttribute('aria-label', title);
    item.getElement().title = title;
    return item;
  });
  const bounds = points.reduce((value, point) => value.extend(point), new maplibregl.LngLatBounds(points[0], points[0]));
  map.fitBounds(bounds, {padding: 45, maxZoom: 17, duration: 0});
  message.textContent = (Number(route.distance_meters) / 1000).toLocaleString('vi-VN') + ' km · Đường bộ ô tô · ' + (route.data_version ? 'Dữ liệu: ' + route.data_version : 'Máy chủ không công bố ngày dữ liệu');
}

function receive(event) {
  let data = event.data;
  try { if (typeof data === 'string') data = JSON.parse(data); } catch { return; }
  if (!viewOnly || data?.type !== 'cpn-map-route' || data.channel !== params.get('channel')) return;
  if (!window.ReactNativeWebView) {
    let expected;
    try { expected = new URL(params.get('parent_origin')).origin; } catch { return; }
    if (event.source !== window.parent || event.origin !== expected) return;
  }
  showRoute(data.route);
}
window.addEventListener('message', receive);
document.addEventListener('message', event => { if (window.ReactNativeWebView) receive(event); });

document.getElementById('search').addEventListener('submit', async event => {
  event.preventDefault();
  if (!map) return;
  message.textContent = 'Đang tìm địa chỉ…';
  results.replaceChildren();
  const button = event.target.querySelector('button');
  button.disabled = true;
  try {
    const data = await json('/search?' + new URLSearchParams({q: document.getElementById('address').value}));
    message.textContent = data.items.length ? 'Chọn một kết quả rồi kiểm tra ghim trên bản đồ.' : 'Chưa tìm thấy. Nhập thêm tên tỉnh/thành hoặc chọn trực tiếp trên bản đồ.';
    for (const item of data.items) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = item.formatted_address;
      button.onclick = () => {
        results.replaceChildren();
        map.jumpTo({center: [item.longitude, item.latitude], zoom: 16});
        void select({lat: item.latitude, lng: item.longitude});
      };
      results.appendChild(button);
    }
  } catch (error) { message.textContent = error.message; }
  finally { button.disabled = false; }
});

confirmButton.addEventListener('click', () => {
  if (!selected) return;
  const payload = {type: 'cpn-map-location', channel: params.get('channel'), location: selected};
  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(payload));
  else {
    let origin;
    try { origin = new URL(params.get('parent_origin')).origin; } catch { return; }
    window.parent.postMessage(payload, origin);
  }
});

json('/config').then(config => {
  const lat = Number(params.get('lat')), lng = Number(params.get('lng'));
  const hasPoint = params.has('lat') && params.has('lng') && Number.isFinite(lat) && Number.isFinite(lng);
  map = new maplibregl.Map({container: 'map', style: config.style_url, center: hasPoint ? [lng, lat] : [106.7009, 10.7769], zoom: 14, maxZoom: 19, attributionControl: false});
  map.addControl(new maplibregl.NavigationControl({showCompass: false}), 'top-left');
  map.addControl(new maplibregl.AttributionControl({compact: false}), 'bottom-right');
  map.on('error', () => { warning.hidden = false; warning.textContent = 'Không tải được một phần nền bản đồ. Kiểm tra kết nối mạng rồi mở lại bản đồ.'; });
  new ResizeObserver(() => map.resize()).observe(document.getElementById('map'));
  map.on('load', () => { if (viewOnly && pendingRoute) showRoute(pendingRoute); });
  if (viewOnly) {
    message.textContent = 'Đang tải tuyến đường…';
    if (pendingRoute) showRoute(pendingRoute);
    return;
  }
  marker = new maplibregl.Marker({draggable: true, color: '#155d4b'}).setLngLat(map.getCenter()).addTo(map);
  map.on('click', event => void select(event.lngLat));
  marker.on('dragend', () => void select(marker.getLngLat()));
  message.textContent = 'Tìm địa chỉ hoặc chạm bản đồ để đặt ghim.';
  if (hasPoint) void select({lat, lng});
}).catch(error => { message.textContent = 'Không mở được bản đồ. Kiểm tra kết nối và trình duyệt hỗ trợ WebGL. ' + error.message; });

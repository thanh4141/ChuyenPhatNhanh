import {createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {env} from '../../config/env.js';
import {pool} from '../../config/database.js';
import {AppError} from '../../common/errors.js';
import {provinceByName} from '../../config/provinces.js';
import {locateProvince,searchProvinces} from './boundaries.js';

// One outbound request per second per provider; one process for public endpoints.
// Persist responses in MySQL so retries and app restarts do not repeat lookups.
const queues=new Map(),pending=new Map();
async function cachedJson(url,ttl){
 const key=createHash('sha256').update(url).digest('hex');
 const [[cached]]=await pool.execute('SELECT payload FROM map_cache WHERE cache_key=? AND expires_at>UTC_TIMESTAMP()',[key]);
 if(cached)return typeof cached.payload==='string'?JSON.parse(cached.payload):cached.payload;
 if(pending.has(key))return pending.get(key);
 const origin=new URL(url).origin;
 let queue=queues.get(origin);if(!queue){queue={tail:Promise.resolve(),next:0,size:0};queues.set(origin,queue);}
 if(queue.size>=8)throw new AppError(503,'Dịch vụ bản đồ đang bận. Vui lòng thử lại sau ít giây.');
 queue.size++;
 const job=queue.tail.catch(()=>{}).then(async()=>{
  await delay(Math.max(0,queue.next-Date.now()));queue.next=Date.now()+1100;
  let r;try{r=await fetch(url,{headers:{'User-Agent':env.mapUserAgent,Accept:'application/json'},signal:AbortSignal.timeout(15000)});}catch{throw new AppError(502,'Không kết nối được dịch vụ bản đồ. Vui lòng thử lại.');}
  let data;try{data=await r.json();}catch{throw new AppError(502,'Dịch vụ bản đồ trả dữ liệu không hợp lệ.');}
  if(!r.ok&& !['NoRoute','NoSegment'].includes(data.code))throw new AppError(502,'Dịch vụ bản đồ đang giới hạn truy cập hoặc tạm gián đoạn. Vui lòng thử lại.');
  if(data.error)throw new AppError(502,'Chưa tìm được địa chỉ. Hãy chọn lại điểm hoặc thử sau.');
  await pool.execute('INSERT INTO map_cache(cache_key,payload,expires_at) VALUES (?,?,?) ON DUPLICATE KEY UPDATE payload=VALUES(payload),expires_at=VALUES(expires_at)',[key,JSON.stringify(data),new Date(Date.now()+ttl)]);
  return data;
 }).finally(()=>{queue.size--;pending.delete(key);});
 queue.tail=job;pending.set(key,job);return job;
}
export function parsePhotonFeature(feature){
 const p=feature?.properties,coords=feature?.geometry?.coordinates;
 if(!p||String(p.countrycode).toUpperCase()!=='VN'||!Array.isArray(coords)||!coords.every(Number.isFinite))return null;
 const province=[p.state,p.city,p.county].map(v=>v&&provinceByName(v)).find(Boolean);
 if(!province)return null;
 return {province,province_code:province.code,latitude:coords[1],longitude:coords[0],formatted_address:[p.name,p.housenumber,p.street,p.district,p.city,p.state].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(', ')};
}
export function parseOsrmRoute(data){
 if(['NoRoute','NoSegment'].includes(data.code))throw new AppError(422,'Không có tuyến đường bộ đến vị trí đã chọn. Hãy đặt ghim gần đường có thể đi lại.');
 const r=data.routes?.[0],g=r?.geometry;
 if(data.code!=='Ok'||!Number.isFinite(r?.distance)||r.distance<0||!Number.isFinite(r.duration)||!g||g.type!=='LineString'||!Array.isArray(g.coordinates)||g.coordinates.length<2||g.coordinates.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)))throw new AppError(502,'Chưa nhận được tuyến đường đầy đủ từ máy chủ bản đồ.');
 if(data.waypoints?.some(p=>Number(p.distance)>1000))throw new AppError(422,'Vị trí cách đường bộ quá xa. Hãy chọn điểm lấy/giao gần đường hơn.');
 return {distance_meters:Math.round(r.distance),duration_seconds:Math.round(r.duration),source:'osrm',route_geometry:g,route_data_version:data.data_version||null,route_fetched_at:new Date().toISOString(),routing_profile:'car'};
}
export function createOpenMaps({request=cachedJson,photonUrl=env.photonUrl,osrmUrl=env.osrmUrl}={}){
 const url=(base,path,params)=>base.replace(/\/$/,'')+path+'?'+new URLSearchParams(params);
 return {
  async search(q){const local=searchProvinces(q);if(local.length)return local;try{const data=await request(url(photonUrl,'/api/',{q,countrycode:'VN',limit:'5'}),3600000);return (data.features||[]).map(parsePhotonFeature).filter(Boolean);}catch{throw new AppError(502,'Tìm địa chỉ đang gián đoạn. Bạn vẫn có thể tìm tên tỉnh hoặc chạm trực tiếp bản đồ để đặt ghim.');}},
  async reverse(location){const province=locateProvince(location);if(!province)throw new AppError(422,'Điểm này nằm ngoài ranh giới tỉnh Việt Nam đang hỗ trợ. Hãy đặt ghim tại điểm lấy/giao trên đất liền.');return {province,province_code:province.code,latitude:Number(location.latitude),longitude:Number(location.longitude),formatted_address:province.name+' · '+Number(location.latitude).toFixed(6)+', '+Number(location.longitude).toFixed(6)};},
  async route(pickup,delivery){const coordinates=[pickup,delivery].map(p=>Number(p.longitude)+','+Number(p.latitude)).join(';');const data=await request(url(osrmUrl,'/route/v1/driving/'+coordinates,{overview:'full',geometries:'geojson',steps:'false',alternatives:'false',radiuses:'1000;1000'}),300000);return parseOsrmRoute(data);}
 };
}
export const openMaps=createOpenMaps();
export async function verifyLocation(provider,location){const verified=await provider.reverse(location);if(verified.province.code!==location.province_code)throw new AppError(422,`Vị trí trên bản đồ thuộc ${verified.province.name}. Hãy chọn đúng tỉnh/thành cho địa chỉ.`);return verified;}

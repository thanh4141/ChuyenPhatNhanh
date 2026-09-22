import {readFileSync} from 'node:fs';
import {provinceByCode} from '../../config/provinces.js';
const data=JSON.parse(readFileSync(new URL('./data/vietnam-adm1.geojson',import.meta.url),'utf8'));
const normalize=v=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().replace(/^(tinh|thanh pho|tp)\s+/,'').trim();
function inRing(point,ring){
 const [x,y]=point;let inside=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
 const [xi,yi]=ring[i],[xj,yj]=ring[j];
 const cross=(x-xi)*(yj-yi)-(y-yi)*(xj-xi);
 if(Math.abs(cross)<1e-12&&x>=Math.min(xi,xj)&&x<=Math.max(xi,xj)&&y>=Math.min(yi,yj)&&y<=Math.max(yi,yj))return true;
 if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;
 }
 return inside;
}
export function pointInPolygon(point,rings){return inRing(point,rings[0])&&!rings.slice(1).some(r=>inRing(point,r));}
export function locateProvince({latitude,longitude}){
 const x=Number(longitude),y=Number(latitude);
 const f=data.features.find(f=>x>=f.bbox[0]&&x<=f.bbox[2]&&y>=f.bbox[1]&&y<=f.bbox[3]&&f.geometry.coordinates.some(rings=>pointInPolygon([x,y],rings)));
 return f?provinceByCode(f.properties.code):null;
}
export function searchProvinces(query){
 const q=normalize(query);return data.features.filter(f=>normalize(f.properties.name).includes(q)).slice(0,5).map(f=>({province:provinceByCode(f.properties.code),province_code:f.properties.code,latitude:f.properties.center[1],longitude:f.properties.center[0],formatted_address:f.properties.name+' — phóng to và đặt ghim tại địa chỉ của bạn'}));
}

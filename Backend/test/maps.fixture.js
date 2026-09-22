// Deterministic provider for automated tests only. Production always calls Google.
import {provinceByCode} from '../src/config/provinces.js';
export const mapsFixture={
 calls:[],
 async search(){return [];},
 async reverse({latitude,longitude}){return {province:provinceByCode(Number(latitude)>20?'01':Number(longitude)>107?'75':'79'),formatted_address:'Địa chỉ kiểm thử'};},
 async route(from,to){this.calls.push({from,to});return {distance_meters:6321,duration_seconds:900,source:'osrm',route_geometry:{type:'LineString',coordinates:[[106.7,10.78],[106.701,10.781]]},route_data_version:'2026-09-20T00:00:00Z',route_fetched_at:new Date().toISOString()};}
};
export const locationFixture={contact_name:'Người nhận kiểm thử',phone:'0902222222',province_code:'79',ward:'Phường Sài Gòn',village:'',detail:'25 Lê Lợi',latitude:10.78,longitude:106.7};

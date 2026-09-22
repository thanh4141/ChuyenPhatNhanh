import test from 'node:test';
import assert from 'node:assert/strict';
import {createOpenMaps,parseOsrmRoute,parsePhotonFeature} from '../src/modules/maps/maps.service.js';
import {locateProvince,pointInPolygon} from '../src/modules/maps/boundaries.js';
test('Coordinates classify current province locally without calling a paid or public geocoder',async()=>{
 const provider=createOpenMaps({request:()=>{throw new Error('Network should not run');}});
 for(const [latitude,longitude,code] of [[10.7769,106.7009,'79'],[21.0285,105.8542,'01'],[16.0471,108.2068,'48'],[10.9574,106.8427,'75'],[10.98,106.6519,'79']])assert.equal((await provider.reverse({latitude,longitude})).province.code,code);
 assert.equal(locateProvince({latitude:51.5,longitude:0}),null);
 await assert.rejects(()=>provider.reverse({latitude:0,longitude:0}),{status:422});
 assert.ok((await provider.search('Ha Noi')).some(p=>p.province.code==='01'));
});
test('Polygon holes and outside points are excluded',()=>{
 const rings=[[[0,0],[4,0],[4,4],[0,4],[0,0]],[[1,1],[2,1],[2,2],[1,2],[1,1]]];
 assert.equal(pointInPolygon([.5,.5],rings),true);assert.equal(pointInPolygon([1.5,1.5],rings),false);assert.equal(pointInPolygon([5,2],rings),false);
});
test('OSRM request is real road route with full geometry and only pickup/destination',async()=>{
 let requested='';const geometry={type:'LineString',coordinates:[[106.7,10.77],[106.8,10.8]]};
 const provider=createOpenMaps({osrmUrl:'https://example.invalid/routed-car',request:async url=>{requested=url;return {code:'Ok',data_version:'2026-09-20T00:00:00Z',waypoints:[{distance:5},{distance:2}],routes:[{distance:6321.4,duration:901.4,geometry}]};}});
 const r=await provider.route({latitude:10.77,longitude:106.7},{latitude:10.8,longitude:106.8});
 const u=new URL(requested);assert.equal(u.pathname,'/routed-car/route/v1/driving/106.7,10.77;106.8,10.8');assert.equal(u.searchParams.get('overview'),'full');assert.equal(u.searchParams.get('geometries'),'geojson');
 assert.equal(r.distance_meters,6321);assert.equal(r.source,'osrm');assert.deepEqual(r.route_geometry,geometry);assert.equal(r.route_data_version,'2026-09-20T00:00:00Z');
});
test('No road route or invalid response must not become a straight-line quote',()=>{
 assert.throws(()=>parseOsrmRoute({code:'NoRoute'}),{status:422});assert.throws(()=>parseOsrmRoute({code:'NoSegment'}),{status:422});
 assert.throws(()=>parseOsrmRoute({code:'Ok',routes:[{distance:10,duration:2}]}),{status:502});
 assert.throws(()=>parseOsrmRoute({code:'Ok',waypoints:[{distance:1001}],routes:[{distance:10,duration:2,geometry:{type:'LineString',coordinates:[[1,1],[2,2]]}}]}),{status:422});
});
test('Photon results restrict country and map legacy province names',()=>{
 assert.equal(parsePhotonFeature({properties:{countrycode:'US',state:'Texas'},geometry:{coordinates:[-95,29]}}),null);
 const p=parsePhotonFeature({properties:{countrycode:'VN',state:'Bình Dương',name:'Thủ Dầu Một'},geometry:{coordinates:[106.65,10.98]}});assert.equal(p.province.code,'79');
});

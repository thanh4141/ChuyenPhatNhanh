import assert from 'node:assert/strict';
import {mkdir,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium,expect} from '@playwright/test';
import express from 'express';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import sharp from 'sharp';
import request from 'supertest';
import {mapsFixture,locationFixture} from './maps.fixture.js';
process.env.DB_NAME=`cpn_ui_${Date.now()}_${process.pid}`;
process.env.JWT_SECRET='ui-test-only-secret-at-least-32-characters';

const {env}=await import('../src/config/env.js'),{migrate}=await import('../src/scripts/migrate.js'),{pool}=await import('../src/config/database.js'),{createApp}=await import('../src/app.js');
const artifacts=fileURLToPath(new URL('../../.local/review/',import.meta.url)),uploadDirectory=fileURLToPath(new URL('../../.local/test-uploads/'+process.env.DB_NAME+'/',import.meta.url));
await mkdir(artifacts,{recursive:true});
let apiServer,mobileServer,browser,customerPage,staffPage,adminPage;const errors=[];
const listen=(app,port)=>new Promise((resolve,reject)=>{const s=app.listen(port,'127.0.0.1',()=>resolve(s));s.on('error',reject);});
const close=s=>s?new Promise(resolve=>s.close(resolve)):Promise.resolve();
const login=async(p,email)=>{await p.goto('http://localhost:8081');await p.getByLabel('Email',{exact:true}).fill(email);await p.getByLabel('Mật khẩu',{exact:true}).fill('UiTest@123');await p.getByRole('button',{name:'Đăng nhập',exact:true}).click();};
const choosePoint=async p=>{await p.getByRole('button',{name:'Chọn vị trí trên OpenStreetMap',exact:true}).click();await p.frameLocator('iframe[title="Bản đồ OpenStreetMap"]').getByRole('button',{name:'Chọn vị trí kiểm thử'}).click();};
try{
 await migrate();const hash=await bcrypt.hash('UiTest@123',4);
 for(const [name,email,role] of [['Quản trị kiểm thử','admin@ui.vn','admin'],['Nhân viên kiểm thử','employee@ui.vn','employee'],['Khách kiểm thử','customer@ui.vn','customer']])await pool.execute('INSERT INTO users(name,email,password_hash,phone,address,role) VALUES (?,?,?,?,?,?)',[name,email,hash,'0901111111','25 Lê Lợi',role]);
 const serverApp=createApp({mapsProvider:mapsFixture,uploadDirectory});apiServer=await listen(serverApp,3000);
 const mobile=express();mobile.use(express.static(fileURLToPath(new URL('../../Mobile/dist/',import.meta.url))));mobileServer=await listen(mobile,8081);
 browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'chrome',headless:true});
 const adminContext=await browser.newContext({viewport:{width:1440,height:1000},locale:'vi-VN'});adminPage=await adminContext.newPage();adminPage.on('pageerror',e=>errors.push(e.message));const a=adminPage;
 await a.goto('http://localhost:3000');await a.getByLabel('Email quản trị').fill('admin@ui.vn');await a.getByLabel('Mật khẩu',{exact:true}).fill('UiTest@123');await a.getByRole('button',{name:'Đăng nhập'}).click();await expect(a.getByRole('heading',{name:'Tổng quan vận hành'})).toBeVisible();
 await a.getByRole('link',{name:'Tài khoản',exact:true}).click();await expect(a.getByRole('heading',{name:'Tài khoản khách hàng'})).toBeVisible();await expect(a.getByRole('heading',{name:'Tài khoản nhân viên'})).toBeVisible();await expect(a.getByRole('button',{name:'Thêm khách hàng'})).toHaveCount(0);
 await a.getByRole('button',{name:'Khóa',exact:true}).click();await expect(a.getByRole('button',{name:'Mở khóa',exact:true})).toBeVisible();await a.getByRole('button',{name:'Mở khóa',exact:true}).click();
 await a.getByRole('button',{name:'Thêm nhân viên',exact:true}).click();await a.getByLabel('Họ và tên',{exact:true}).fill('Nhân viên mới');await a.getByLabel('Số điện thoại',{exact:true}).fill('0903333333');await a.getByLabel('Email đăng nhập').fill('newemployee@ui.vn');await a.getByLabel('Mật khẩu ban đầu').fill('UiTest@123');await a.getByRole('button',{name:'Lưu thông tin',exact:true}).click();await expect(a.locator('#modal')).not.toBeVisible();await expect(a.getByText('newemployee@ui.vn',{exact:false})).toBeVisible();
 await a.getByRole('link',{name:'Hồ sơ nhân viên',exact:true}).click();await a.getByRole('button',{name:'Thêm hồ sơ'}).click();await a.getByLabel('Tài khoản nhân viên').selectOption('2');await a.getByLabel('Mã nhân viên',{exact:true}).fill('NV002');await a.getByLabel('CCCD (12 chữ số)').fill('012345678901');await a.getByLabel('Quê quán').fill('Hà Nội');await a.getByRole('button',{name:'Lưu thông tin',exact:true}).click();await expect(a.locator('#modal')).not.toBeVisible();await expect(a.getByText('NV002',{exact:true})).toBeVisible();
 await a.getByRole('link',{name:'Bảng cước',exact:true}).click();await expect(a.locator('.service-card')).toHaveCount(6);await a.getByRole('button',{name:'Chỉnh sửa bảng cước'}).first().click();await a.getByLabel('Cước cơ bản (đ)').fill('16000');await a.getByRole('button',{name:'Lưu thông tin'}).click();await expect(a.locator('#modal')).not.toBeVisible();await expect(a.locator('.service-price').first()).toContainText('16.000');await a.screenshot({path:artifacts+'admin-rates.png',fullPage:true});
 console.log('PASS Admin: separate accounts, customer lock/unlock, employee account/profile, six rates.');

 const context=await browser.newContext({viewport:{width:390,height:844},locale:'vi-VN'});
 customerPage=await context.newPage();const c=customerPage;c.on('pageerror',e=>errors.push(e.message));await login(c,'customer@ui.vn');await expect(c.getByText('Lịch sử đơn hàng',{exact:true})).toBeVisible();
 await c.getByRole('tab',{name:'Cá nhân'}).click();await c.getByRole('button',{name:'Địa chỉ lấy hàng của tôi'}).click();await c.getByRole('button',{name:'+ Thêm địa chỉ mới',exact:true}).click();
 await c.getByLabel('Xã / Phường',{exact:true}).fill('Phường Sài Gòn');await c.getByLabel('Địa chỉ chi tiết',{exact:true}).fill('25 Lê Lợi');
 await c.getByRole('button',{name:'Chọn vị trí trên OpenStreetMap',exact:true}).click();
 await expect(c.frameLocator('iframe').locator('.leaflet-container')).toBeVisible();await c.getByRole('button',{name:'Đóng bản đồ'}).click();
 // Replace only the map UI with a deterministic test pin. No geocoding/routing network in automated tests.
 await context.route('**/maps/picker.html?**',route=>{const url=new URL(route.request().url()),channel=url.searchParams.get('channel');return route.fulfill({contentType:'text/html',body:`<!doctype html><meta charset="utf-8"><button id="pick">Chọn vị trí kiểm thử</button><script>document.getElementById('pick').onclick=()=>parent.postMessage({type:'cpn-map-location',channel:${JSON.stringify(channel)},location:{latitude:10.78,longitude:106.7,province_code:'79'}},'http://localhost:8081')</script>`});});
 await choosePoint(c);await c.getByRole('button',{name:'Lưu địa chỉ',exact:true}).click();await expect(c.getByText('Nhà riêng · Mặc định',{exact:true})).toBeVisible();
 await c.getByRole('tab',{name:'Tạo đơn'}).click();
 const png=await sharp({create:{width:40,height:40,channels:3,background:'#155d4b'}}).png().toBuffer();
 const chooser=c.waitForEvent('filechooser');await c.getByRole('button',{name:'Chọn ảnh từ thư viện',exact:true}).click();await (await chooser).setFiles({name:'parcel.png',mimeType:'image/png',buffer:png});await expect(c.getByText('Ảnh đã chọn',{exact:true})).toBeVisible();
 await c.getByLabel('Nội dung mô tả hàng hóa').fill('Kiện hàng tạo từ app');await c.getByLabel('Cân nặng (kg)').fill('1.51');await c.getByLabel('Họ tên người nhận',{exact:true}).fill('Người nhận mobile');await c.getByLabel('Số điện thoại người nhận',{exact:true}).fill('0904444444');await c.getByLabel('Xã / Phường',{exact:true}).fill('Phường Sài Gòn');await c.getByLabel('Địa chỉ chi tiết',{exact:true}).fill('42 Lê Lợi');await choosePoint(c);
 await c.getByRole('switch',{name:'Bảo hiểm hàng hóa · 9.900đ'}).check();await c.getByRole('switch',{name:'Đóng gói đặc biệt · 5.000đ'}).check();
 await c.getByRole('button',{name:'Tính cước đường bộ',exact:true}).click();await expect(c.getByText('39.863',{exact:false})).toBeVisible();await c.getByRole('button',{name:'Xác nhận tạo đơn',exact:true}).click();await expect(c.getByText('Chi tiết vận đơn',{exact:true})).toBeVisible();
 const [[order]]=await pool.query("SELECT id,tracking_code FROM orders WHERE package_name='Kiện hàng tạo từ app'");assert.ok(order);
 await c.screenshot({path:artifacts+'mobile-customer-order.png',fullPage:true});

 const staffContext=await browser.newContext({viewport:{width:390,height:844},locale:'vi-VN'});staffPage=await staffContext.newPage();const s=staffPage;s.on('pageerror',e=>errors.push(e.message));await login(s,'employee@ui.vn');await expect(s.getByText('Đơn đang chờ',{exact:true}).first()).toBeVisible();await expect(s.getByRole('tab',{name:'Tạo đơn'})).toHaveCount(0);
 await s.getByRole('button',{name:'Xem đơn '+order.tracking_code}).click();await s.getByRole('button',{name:'Nhận vận chuyển đơn này'}).click();await expect(s.getByText('Đã nhận đơn hàng.',{exact:true})).toBeVisible();
 for(const label of ['Chờ lấy hàng','Đã lấy hàng','Đang giao','Hoàn thành']){await s.getByRole('button',{name:label,exact:true}).click();await s.getByRole('button',{name:'Xác nhận: '+label,exact:true}).click();await expect(s.getByText('Đã cập nhật trạng thái đơn hàng.',{exact:true})).toBeVisible();}
 await c.getByRole('tab',{name:'Thông báo'}).click();await c.getByRole('button',{name:'Đơn hoàn thành — đánh giá nhân viên',exact:true}).click();await c.getByLabel('Bình luận đánh giá').fill('Giao hàng cẩn thận, đúng hẹn');await c.getByRole('button',{name:'Gửi đánh giá',exact:true}).click();await expect(c.getByText('Cảm ơn bạn đã đánh giá.',{exact:true})).toBeVisible();
 await s.getByRole('tab',{name:'Cá nhân'}).click();await expect(s.getByText('Hoàn thành: 1',{exact:true})).toBeVisible();await expect(s.getByText('Giao hàng cẩn thận, đúng hẹn',{exact:true})).toBeVisible();await s.screenshot({path:artifacts+'mobile-staff-profile.png',fullPage:true});
 await a.getByRole('link',{name:'Đơn hàng',exact:true}).click();await a.locator('button.code-link').first().click();await expect(a.getByRole('heading',{name:'Chi tiết vận đơn'})).toBeVisible();await expect(a.locator('#assign-form,#status-form')).toHaveCount(0);await expect(a.getByText('Giao hàng cẩn thận, đúng hẹn',{exact:false})).toBeVisible();await expect(a.locator('[data-media]')).toBeVisible();assert.equal(await a.locator('[data-media]').evaluate(img=>img.complete&&img.naturalWidth>0),true);await a.getByRole('button',{name:'Đóng',exact:true}).click();

 // A second order exercises the incident form and authenticated incident image on the customer UI.
 const token=(await request(serverApp).post('/api/auth/login').send({email:'customer@ui.vn',password:'UiTest@123'})).body.token;
 const apiCall=(method,path)=>request(serverApp)[method]('/api'+path).set('Authorization','Bearer '+token);
 const [[addr]]=await pool.query('SELECT id FROM addresses WHERE user_id=3');
 const newOrder=async()=>{const q=(await apiCall('post','/services/quote').send({pickup_address_id:addr.id,delivery:locationFixture,service_id:1,weight:1,has_cod:false,cod_amount:0,has_insurance:false,has_packaging:false}).expect(200)).body;const photo=(await apiCall('post','/media/parcel').attach('image',png,'parcel.png').expect(201)).body.id;return (await apiCall('post','/orders').send({quote_id:q.quote_id,parcel_photo_id:photo,package_name:'Kiện hàng phụ'}).expect(201)).body.order;};
 const incident=await newOrder();await s.getByRole('tab',{name:'Đơn đang chờ'}).click();await s.getByRole('button',{name:'Xem đơn '+incident.tracking_code}).click();await s.getByRole('button',{name:'Nhận vận chuyển đơn này'}).click();await expect(s.getByText('Đã nhận đơn hàng.',{exact:true})).toBeVisible();
 for(const label of ['Chờ lấy hàng','Đã lấy hàng','Đang giao']){await s.getByRole('button',{name:label,exact:true}).click();await s.getByRole('button',{name:'Xác nhận: '+label,exact:true}).click();await expect(s.getByText('Đã cập nhật trạng thái đơn hàng.',{exact:true})).toBeVisible();}
 await s.getByRole('button',{name:'Chưa hoàn thành',exact:true}).click();await s.getByLabel('Lý do (bắt buộc)').fill('Người nhận hẹn lại');const incidentChooser=s.waitForEvent('filechooser');await s.getByRole('button',{name:'Chọn ảnh từ thư viện',exact:true}).click();await (await incidentChooser).setFiles({name:'incident.png',mimeType:'image/png',buffer:png});await expect(s.getByText('Ảnh đã chọn',{exact:true})).toBeVisible();await s.getByRole('button',{name:'Xác nhận: Chưa hoàn thành',exact:true}).click();await expect(s.getByText('Đã cập nhật trạng thái đơn hàng.',{exact:true})).toBeVisible();
 await c.getByRole('tab',{name:'Lịch sử'}).click();await c.getByRole('button',{name:'Xem đơn '+incident.tracking_code}).click();await expect(c.getByText('Ảnh sự cố',{exact:true})).toBeVisible();await expect(c.getByText('Người nhận hẹn lại',{exact:true})).toBeVisible();
 const cancelled=await newOrder();await c.getByRole('tab',{name:'Lịch sử'}).click();await c.getByRole('button',{name:'Xem đơn '+cancelled.tracking_code}).click();await c.getByRole('button',{name:'Đã hủy',exact:true}).click();await c.getByLabel('Lý do (bắt buộc)').fill('Đổi kế hoạch gửi');await c.getByRole('button',{name:'Xác nhận: Đã hủy',exact:true}).click();await expect(c.getByText('Đã cập nhật trạng thái đơn hàng.',{exact:true})).toBeVisible();
 await a.setViewportSize({width:390,height:844});await a.getByRole('button',{name:'Mở menu'}).click();await a.getByRole('link',{name:'Tài khoản',exact:true}).click();await expect(a.getByRole('heading',{name:'Quản lí tài khoản'})).toBeVisible();assert.equal(await a.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);await a.screenshot({path:artifacts+'admin-mobile.png',fullPage:true});
 await c.getByRole('tab',{name:'Cá nhân'}).click();await c.getByRole('button',{name:'Đăng xuất trên các thiết bị'}).click();await expect(c.getByText('Chào mừng trở lại',{exact:true})).toBeVisible();
 assert.deepEqual(errors,[]);console.log('PASS Mobile: real MySQL address, upload, quote fixture, create, claim, delivery, notifications, review, incident photo, cancellation, stats, logout. No browser runtime errors.');
}catch(e){console.error(e);for(const [label,p] of [['admin',adminPage],['customer',customerPage],['staff',staffPage]])if(p)await p.screenshot({path:artifacts+'failure-'+label+'.png',fullPage:true}).catch(()=>{});process.exitCode=1;}
finally{
 await browser?.close();await Promise.all([close(apiServer),close(mobileServer)]);await pool.end();assert.match(env.db.database,/^cpn_ui_\d+_\d+$/);
 const conn=await mysql.createConnection({...env.db,database:undefined});try{await conn.query(`DROP DATABASE IF EXISTS \`${env.db.database}\``);}finally{await conn.end();}
 assert.ok(uploadDirectory.includes('test-uploads'));assert.ok(uploadDirectory.includes(env.db.database));await rm(uploadDirectory,{recursive:true,force:true});
}

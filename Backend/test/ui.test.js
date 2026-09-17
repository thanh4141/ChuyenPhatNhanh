import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium,expect } from '@playwright/test';
import express from 'express';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

process.env.DB_NAME=`cpn_ui_${Date.now()}_${process.pid}`;
process.env.JWT_SECRET='ui-test-only-secret-at-least-32-characters';
const {env}=await import('../src/config/env.js');
const {migrate}=await import('../src/scripts/migrate.js');
const {pool}=await import('../src/config/database.js');
const {createApp}=await import('../src/app.js');
const artifacts=fileURLToPath(new URL('../../.local/review/',import.meta.url));
await mkdir(artifacts,{recursive:true});
let apiServer,mobileServer,browser;
const errors=[];
const listen=(app,port)=>new Promise((resolve,reject)=>{const server=app.listen(port,'127.0.0.1',()=>resolve(server));server.on('error',reject);});
const close=server=>server?new Promise(resolve=>server.close(resolve)):Promise.resolve();
try{
  await migrate();const hash=await bcrypt.hash('UiTest@123',4);
  for(const [name,email,role] of [['Quản trị kiểm thử','admin@ui.vn','admin'],['Nhân viên kiểm thử','employee@ui.vn','employee'],['Khách kiểm thử','customer@ui.vn','customer']])await pool.execute('INSERT INTO users (name,email,password_hash,phone,address,role) VALUES (?,?,?,?,?,?)',[name,email,hash,'0901111111','25 Nguyễn Trãi, TP. Hồ Chí Minh',role]);
  apiServer=await listen(createApp(),3000);
  const mobile=express();mobile.use(express.static(fileURLToPath(new URL('../../Mobile/dist/',import.meta.url))));mobileServer=await listen(mobile,8081);
  browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'chrome',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'vi-VN'});
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://localhost:3000');
  await page.getByLabel('Email quản trị').fill('admin@ui.vn');await page.getByLabel('Mật khẩu',{exact:true}).fill('WrongPass');await page.getByRole('button',{name:'Đăng nhập'}).click();await expect(page.locator('#login-error')).toContainText('không đúng');
  await page.getByLabel('Mật khẩu',{exact:true}).fill('UiTest@123');await page.getByRole('button',{name:'Đăng nhập'}).click();await expect(page.getByRole('heading',{name:'Tổng quan vận hành'})).toBeVisible();
  await page.getByRole('link',{name:'Khách hàng',exact:true}).click();await page.getByRole('button',{name:'Thêm khách hàng'}).click();
  await page.getByLabel('Họ và tên',{exact:true}).fill('Khách tạo từ web');await page.getByLabel('Số điện thoại',{exact:true}).fill('0903333333');await page.getByLabel('Email đăng nhập').fill('created@ui.vn');await page.getByLabel('Mật khẩu ban đầu').fill('UiTest@123');await page.getByRole('button',{name:'Lưu thông tin'}).click();await expect(page.getByRole('cell',{name:'created@ui.vn 0903333333'})).toBeVisible();
  await page.getByRole('link',{name:'Đơn hàng',exact:true}).click();await page.getByRole('button',{name:'Tạo đơn hàng',exact:true}).click();
  const form=page.locator('#order-form');await form.locator('[name=customer_id]').selectOption('3');await form.locator('[name=receiver_name]').fill('Người nhận web');await form.locator('[name=receiver_phone]').fill('0902222222');await form.locator('[name=receiver_address]').fill('30 Hai Bà Trưng, Hà Nội');await form.locator('[name=package_name]').fill('Bưu kiện kiểm thử');await form.locator('[name=weight]').fill('1.5');await form.locator('[name=zone]').selectOption('domestic');await form.locator('[name=cod_amount]').fill('200000');await expect(page.locator('#quote')).toContainText('45.000');await form.getByRole('button',{name:'Tạo đơn hàng',exact:true}).click();await expect(page.locator('#modal')).not.toBeVisible();
  await page.locator('button.code-link').first().click();await expect(page.getByRole('heading',{name:'Chi tiết vận đơn'})).toBeVisible();const tracking=await page.locator('.detail-top .code-link').textContent();
  await page.locator('#assign-form select').selectOption('2');await page.locator('#assign-form').getByRole('button',{name:'Phân công'}).click();await expect(page.locator('.detail-top .badge')).toHaveText('Chờ lấy hàng');await page.getByRole('button',{name:'Đóng',exact:true}).click();
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Xuất trang này'}).click();const download=await downloadPromise;assert.match(download.suggestedFilename(),/\.csv$/);
  await page.getByRole('link',{name:'Tra cứu vận đơn',exact:true}).click();await page.getByRole('textbox',{name:'Mã vận đơn',exact:true}).fill(tracking);await page.getByRole('button',{name:'Tra cứu',exact:false}).click();await expect(page.locator('#tracking-result')).toContainText('Chờ lấy hàng');
  await page.getByRole('link',{name:'Tổng quan',exact:true}).click();await expect(page.getByRole('heading',{name:'Tổng quan vận hành'})).toBeVisible();await page.screenshot({path:artifacts+'admin-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});await expect(page.getByRole('button',{name:'Mở menu'})).toBeVisible();await page.getByRole('button',{name:'Mở menu'}).click();await page.getByRole('link',{name:'Đơn hàng',exact:true}).click();await expect(page.getByRole('heading',{name:'Quản lí đơn hàng'})).toBeVisible();const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);assert.equal(overflow,false);await page.screenshot({path:artifacts+'admin-mobile.png',fullPage:true});
  console.log('PASS Admin: login, customer creation, order/quote, assignment, CSV, tracking, responsive layout.');

  const mobileContext=await browser.newContext({viewport:{width:390,height:844},locale:'vi-VN'});const app=await mobileContext.newPage();app.on('pageerror',error=>errors.push(error.message));await app.goto('http://localhost:8081');
  await app.getByLabel('Email',{exact:true}).fill('customer@ui.vn');await app.getByLabel('Mật khẩu',{exact:true}).fill('UiTest@123');await app.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(app.getByText('Đơn hàng của bạn',{exact:true})).toBeVisible();await app.getByRole('button',{name:'+ Tạo đơn hàng mới'}).click();
  await app.getByLabel('Họ tên người nhận',{exact:true}).fill('Người nhận mobile');await app.getByLabel('Số điện thoại người nhận').fill('0904444444');await app.getByLabel('Địa chỉ giao hàng').fill('42 Lê Lợi, TP. Hồ Chí Minh');await app.getByLabel('Tên hàng hóa').fill('Tài liệu mobile');await app.getByRole('button',{name:'Xác nhận tạo đơn'}).click();await expect(app.getByText('Chi tiết vận đơn',{exact:true})).toBeVisible();
  await app.getByRole('button',{name:'Đã hủy',exact:true}).click();await app.getByLabel('Lý do (bắt buộc)').fill('Hủy đơn kiểm thử mobile');await app.getByRole('button',{name:'Xác nhận: Đã hủy'}).click();await expect(app.getByText('Đã cập nhật trạng thái đơn hàng.')).toBeVisible();
  await app.getByRole('tab',{name:'Tài khoản'}).click();await app.getByRole('button',{name:'Đăng xuất trên các thiết bị'}).click();await expect(app.getByText('Chào mừng trở lại',{exact:true})).toBeVisible();
  await app.getByLabel('Email',{exact:true}).fill('employee@ui.vn');await app.getByLabel('Mật khẩu',{exact:true}).fill('UiTest@123');await app.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(app.getByText('Công việc của bạn',{exact:true})).toBeVisible();await expect(app.getByRole('tab',{name:'Tạo đơn'})).toHaveCount(0);await app.getByRole('button',{name:`Xem đơn ${tracking}`}).click();
  for(const label of ['Đã lấy hàng','Đang vận chuyển','Đang giao hàng','Giao thành công']){await app.getByRole('button',{name:label,exact:true}).click();await app.getByRole('button',{name:`Xác nhận: ${label}`,exact:true}).click();await expect(app.getByText('Đã cập nhật trạng thái đơn hàng.')).toBeVisible();}
  await app.screenshot({path:artifacts+'mobile-delivery.png',fullPage:true});
  await app.getByRole('tab',{name:'Tra cứu'}).click();await app.getByLabel('Mã vận đơn',{exact:true}).fill(tracking);await app.getByRole('button',{name:'Tra cứu hành trình'}).click();await expect(app.getByText('Giao thành công').first()).toBeVisible();
  console.log('PASS Mobile (Expo web): customer login/create/cancel; staff login/assigned orders/full delivery; tracking/logout.');
  assert.deepEqual(errors,[]);console.log('PASS No browser runtime errors. Screenshots: .local/review');
}catch(error){console.error(error);process.exitCode=1;}
finally{
  await browser?.close();await Promise.all([close(apiServer),close(mobileServer)]);await pool.end();
  assert.match(env.db.database,/^cpn_ui_\d+_\d+$/);
  const connection=await mysql.createConnection({...env.db,database:undefined});try{await connection.query(`DROP DATABASE IF EXISTS \`${env.db.database}\``);}finally{await connection.end();}
}

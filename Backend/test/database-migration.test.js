import test from 'node:test';
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { env } from '../src/config/env.js';
import { tableNames, columnNames } from '../src/config/database-names.js';
import { migrate } from '../src/scripts/migrate.js';
import { migrateWorkflow } from '../src/scripts/migrations/workflow.js';
import { renameVietnamese } from '../src/scripts/migrations/vietnamese.js';
import { migrateEmployeeProfiles } from '../src/scripts/migrations/employee-profiles.js';
import { migrateServiceLabels } from '../src/scripts/migrations/service-labels.js';

let sequence = 0;
test('Repair damaged service labels preserves prices and custom names and can run twice',()=>database(async(c,config)=>{
 await migrate(config);
 await c.execute("DELETE FROM lich_su_nang_cap WHERE phien_ban='008_ten_dich_vu'");
 await c.execute("UPDATE dich_vu SET ten='Ti?u chu?n',cuoc_co_ban=23456 WHERE ma_dinh_danh='standard'");
 await c.execute("UPDATE dich_vu SET ten='H?a t?c' WHERE ma_dinh_danh='express'");
 await migrateServiceLabels(c);await migrateServiceLabels(c);
 const [rows]=await c.query('SELECT ma_dinh_danh,ten,cuoc_co_ban FROM dich_vu ORDER BY ma_so');
 assert.equal(rows.find(r=>r.ma_dinh_danh==='standard').ten,'Tiêu chuẩn');
 assert.equal(Number(rows.find(r=>r.ma_dinh_danh==='standard').cuoc_co_ban),23456);
 assert.equal(rows.find(r=>r.ma_dinh_danh==='express').ten,'Hỏa tốc');
 const [[saved]]=await c.query("SELECT du_lieu FROM lich_su_nang_cap WHERE phien_ban='008_ten_dich_vu'");
 assert.equal(saved.du_lieu.original_service_labels.length,2);
 await c.execute("DELETE FROM lich_su_nang_cap WHERE phien_ban='008_ten_dich_vu'");
 await c.execute("UPDATE dich_vu SET ten='Dịch vụ riêng' WHERE ma_dinh_danh='standard'");
 await migrateServiceLabels(c);
 const [[custom]]=await c.query("SELECT ten FROM dich_vu WHERE ma_dinh_danh='standard'");assert.equal(custom.ten,'Dịch vụ riêng');
}));
test('Upgrade existing linked employee profiles preserves data and allows profiles without accounts',()=>database(async(c,config)=>{
 await migrate(config);
 await c.query("DELETE FROM lich_su_nang_cap WHERE phien_ban='004_ho_so_truoc_tai_khoan'");
 await c.query('ALTER TABLE ho_so_nhan_vien DROP COLUMN ten,DROP COLUMN so_dien_thoai,DROP COLUMN dia_chi_lien_he,MODIFY ma_tai_khoan BIGINT UNSIGNED NOT NULL');
 await c.query("INSERT INTO tai_khoan(ten,thu_dien_tu,mat_khau_bam,so_dien_thoai,dia_chi_lien_he,vai_tro) VALUES ('Tên cũ','profile@migration.vn','unused','0901111111','Địa chỉ cũ','employee')");
 await c.query("INSERT INTO ho_so_nhan_vien(ma_tai_khoan,ma_nhan_vien_noi_bo,ngay_vao_lam) VALUES (1,'NVCU','2026-01-01')");
 await migrateEmployeeProfiles(c,config.database);await migrateEmployeeProfiles(c,config.database);
 const [[p]]=await c.query('SELECT * FROM ho_so_nhan_vien WHERE ma_so=1');assert.equal(p.ma_tai_khoan,1);assert.equal(p.ten,'Tên cũ');assert.equal(p.so_dien_thoai,'0901111111');assert.equal(p.dia_chi_lien_he,'Địa chỉ cũ');
 await c.query("INSERT INTO ho_so_nhan_vien(ten,so_dien_thoai,ma_nhan_vien_noi_bo,ngay_vao_lam) VALUES ('Chưa có tài khoản','0902222222','NVMOI','2026-01-01')");
 await assert.rejects(c.query('UPDATE ho_so_nhan_vien SET ma_tai_khoan=999 WHERE ma_so=2'),{code:'ER_NO_REFERENCED_ROW_2'});
}));
async function database(work) {
  const config = { ...env.db, database: `cpn_names_${Date.now()}_${process.pid}_${++sequence}` };
  const c = await mysql.createConnection({ ...config, database: undefined });
  try {
    await c.query(`CREATE DATABASE \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await c.changeUser({ database: config.database });
    await work(c, config);
  } finally {
    assert.match(config.database, /^cpn_names_\d+_\d+_\d+$/);
    await c.query(`DROP DATABASE \`${config.database}\``);
    await c.end();
  }
}
async function checkNames(c) {
  const [tables] = await c.query('SHOW TABLES');
  assert.deepEqual(tables.map(row => Object.values(row)[0]).sort(), [...Object.values(tableNames),'tram_chuyen_phat','chuyen_trung_chuyen','kien_trung_chuyen','nhat_ky_kho','khieu_nai'].sort());
  const [columns] = await c.query('SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()');
  for (const row of columns) assert.ok(Object.values(columnNames).includes(row.COLUMN_NAME), row.COLUMN_NAME);
  const [[state]] = await c.query("SELECT COUNT(*) AS count FROM lich_su_nang_cap WHERE phien_ban='003_ten_tieng_viet'");
  assert.equal(state.count, 1);
}
async function legacy(c) {
  const sql = await readFile(new URL('../src/scripts/legacy/schema.sql', import.meta.url), 'utf8');
  for (const s of sql.split(';').map(s => s.trim()).filter(Boolean)) await c.query(s);
  await c.query("INSERT INTO users(name,email,password_hash,phone,role) VALUES ('Khách','migration@test.vn','unused','0901111111','customer')");
  await c.query("INSERT INTO services(code,name,description,base_fee,extra_half_kg,domestic_surcharge,estimated_days) VALUES ('standard','Tiêu chuẩn','Kiểm thử',15000,2500,0,'1 ngày')");
  await migrateWorkflow(c);
  await c.query("INSERT INTO addresses(user_id,label,contact_name,phone,province_code,ward,detail,latitude,longitude,formatted_address,is_default) VALUES (1,'Nhà','Khách','0901111111','79','Sài Gòn','25 Lê Lợi',10.7769,106.7009,'25 Lê Lợi, Sài Gòn',TRUE)");
  await c.query("ALTER TABLE schema_migrations ADD COLUMN payload JSON NULL");
  await c.query("INSERT INTO schema_migrations(version) VALUES ('003_vietnamese_started')");
  const [[{ total }]] = await c.query('SELECT COUNT(*) AS total FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE()');
  return total;
}
async function checkConstraints(c, expectedForeignKeys) {
  const [[{ total }]] = await c.query('SELECT COUNT(*) AS total FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE()');
  assert.equal(total, expectedForeignKeys+22);
  const [[address]] = await c.query('SELECT * FROM dia_chi WHERE ma_so=1');
  assert.equal(address.ma_tai_khoan_mac_dinh, 1);
  assert.equal(address.dia_chi_chi_tiet, '25 Lê Lợi');
  await assert.rejects(c.query('UPDATE dia_chi SET ma_tai_khoan=999 WHERE ma_so=1'), { code: 'ER_NO_REFERENCED_ROW_2' });
  await assert.rejects(c.query('UPDATE dia_chi SET vi_do=100 WHERE ma_so=1'), { code: 'ER_CHECK_CONSTRAINT_VIOLATED' });
  await assert.rejects(c.query("INSERT INTO dia_chi(ma_tai_khoan,nhan_dia_chi,ten_lien_he,so_dien_thoai,ma_tinh_thanh,xa_phuong,dia_chi_chi_tiet,vi_do,kinh_do,dia_chi_day_du,la_mac_dinh) SELECT ma_tai_khoan,'Trùng',ten_lien_he,so_dien_thoai,ma_tinh_thanh,xa_phuong,dia_chi_chi_tiet,vi_do,kinh_do,dia_chi_day_du,TRUE FROM dia_chi WHERE ma_so=1"), { code: 'ER_DUP_ENTRY' });
}

test('Fresh MySQL schema uses only Vietnamese table/column names; repeated migration is safe', () => database(async (c, config) => {
  await migrate(config); await migrate(config); await checkNames(c);
  const [[{ count }]] = await c.query('SELECT COUNT(*) AS count FROM bang_cuoc'); assert.equal(count, 6);
  const runSeed = () => promisify(execFile)(process.execPath, ['src/scripts/seed.js'], {
    cwd: fileURLToPath(new URL('../', import.meta.url)),
    env: { ...process.env, DB_NAME: config.database, SEED_ADMIN_EMAIL: 'admin@seed-test.vn', SEED_ADMIN_PASSWORD: 'SeedOnly@12345', SEED_DEMO: 'true', SEED_DEMO_PASSWORD: 'SeedOnly@12345' },
  });
  await runSeed(); await runSeed();
  const [[totals]] = await c.query('SELECT (SELECT COUNT(*) FROM tai_khoan) AS accounts,(SELECT COUNT(*) FROM don_hang) AS orders,(SELECT COUNT(*) FROM ho_so_nhan_vien) AS profiles');
  assert.deepEqual(totals, { accounts: 5, orders: 12, profiles: 2 });
}));

for (const [label, interruptedSql] of [['column rename', /^ALTER TABLE `users` RENAME COLUMN/], ['atomic table rename', /^RENAME TABLE /]]) {
  test(`Resume after interruption at ${label} restores FK/CHECK/default address without data loss`, () => database(async (c, config) => {
    const total = await legacy(c);
    let interrupted = false;
    const fault = new Proxy(c, { get(target, name) {
      if (name === 'query') return async (...args) => {
        const result = await target.query(...args);
        if (!interrupted && interruptedSql.test(args[0])) { interrupted = true; throw new Error('SIMULATED_INTERRUPTION'); }
        return result;
      };
      const value = target[name]; return typeof value === 'function' ? value.bind(target) : value;
    } });
    await assert.rejects(renameVietnamese(fault), /SIMULATED_INTERRUPTION/);
    assert.equal(interrupted, true);
    await migrate(config); await migrate(config);
    await checkNames(c); await checkConstraints(c, total);
  }));
}

import mysql from "mysql2/promise";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { env } from "../config/env.js";
import { provinces } from "../config/provinces.js";
import { tableNames } from "../config/database-names.js";
import { backupDatabase } from "./backup.js";
import { migrateWorkflow } from "./migrations/workflow.js";
import { renameVietnamese } from "./migrations/vietnamese.js";
import { migrateEmployeeProfiles } from "./migrations/employee-profiles.js";
import { migrateDeliveryComplaints } from "./migrations/delivery-complaints.js";
import { migrateStationLocations } from "./migrations/station-locations.js";
import { migrateStations } from "./migrations/stations.js";
import { migrateServiceLabels } from "./migrations/service-labels.js";
import { migrateFeatureEnhancements } from "./migrations/feature-enhancements.js";

async function runSql(connection, file) {
  const sql = await readFile(new URL(file, import.meta.url), "utf8");
  for (const statement of sql
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean))
    await connection.query(statement);
}
async function seedCatalog(connection) {
  await connection.execute(`INSERT IGNORE INTO dich_vu (ma_dinh_danh,ten,mo_ta,cuoc_co_ban,cuoc_them_nua_kg,phu_phi_ngoai_tinh,thoi_gian_du_kien) VALUES
    ('standard','Tiêu chuẩn','Tiết kiệm cho mọi kiện hàng',25000,5000,15000,'2–4 ngày'),
    ('express','Hỏa tốc','Ưu tiên lấy và giao nhanh',45000,8000,25000,'1–2 ngày')`);
  for (const p of provinces)
    await connection.execute(
      "INSERT IGNORE INTO tinh_thanh(ma_dinh_danh,ten,mien) VALUES (?,?,?)",
      [p.code, p.name, p.region],
    );
  const [services] = await connection.query(
    "SELECT ma_so,ma_dinh_danh FROM dich_vu",
  );
  for (const service of services)
    for (const [route, min, max] of [
      ["same_province", 1, 1],
      ["same_region", 1, 5],
      ["inter_region", 3, 7],
    ]) {
      const express = service.ma_dinh_danh === "express";
      await connection.execute(
        `INSERT IGNORE INTO bang_cuoc(ma_dich_vu,loai_tuyen,cuoc_co_ban,so_km_bao_gom,don_gia_km_vuot,khoi_luong_bao_gom,buoc_khoi_luong,don_gia_khoi_luong_vuot,phi_thu_ho,phi_bao_hiem,phi_dong_goi,so_ngay_toi_thieu,so_ngay_toi_da) VALUES (?,?,?,5,3000,1,0.5,2500,0,9900,5000,?,?)`,
        [
          service.ma_so,
          route,
          express ? 30000 : 15000,
          express ? 1 : min,
          express ? Math.max(1, Math.ceil(max / 2)) : max,
        ],
      );
    }
  await connection.execute(
    "INSERT IGNORE INTO lich_su_nang_cap(phien_ban) VALUES ('002_self_service'),('003_ten_tieng_viet')",
  );
}
export async function migrate(config = env.db) {
  if (!/^[a-zA-Z0-9_]+$/.test(config.database))
    throw new Error("Tên cơ sở dữ liệu không hợp lệ.");
  const connection = await mysql.createConnection({
    ...config,
    database: undefined,
  });
  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    await connection.changeUser({ database: config.database });
    await connection.query("SET time_zone = '+00:00'");
    const [[lock]] = await connection.query(
      "SELECT GET_LOCK(CONCAT(DATABASE(),':migrate'),30) AS acquired",
    );
    if (lock.acquired !== 1)
      throw new Error("Một tiến trình khác đang nâng cấp CSDL.");
    const [rows] = await connection.query(
      "SHOW FULL TABLES WHERE Table_type='BASE TABLE'",
    );
    const tables = new Set(rows.map((row) => Object.values(row)[0]));
    let pending = false;
    if (tables.has("lich_su_nang_cap")) {
      const [[state]] = await connection.query(
        "SELECT COUNT(*) AS done FROM lich_su_nang_cap WHERE phien_ban='003_ten_tieng_viet'",
      );
      pending = state.done === 0;
    }
    if (Object.keys(tableNames).some((name) => tables.has(name)) || pending) {
      // Stop the API while upgrading. Backup must succeed before any DDL changes.
      await backupDatabase(connection, config.database);
      let started = pending;
      if (tables.has("schema_migrations")) {
        const [columns] = await connection.query(
          "SHOW COLUMNS FROM schema_migrations",
        );
        const column = columns.some((c) => c.Field === "version")
          ? "version"
          : "phien_ban";
        const [[row]] = await connection.query(
          `SELECT 1 AS found FROM schema_migrations WHERE ${column}='003_vietnamese_started'`,
        );
        started = !!row;
      }
      if (!started) {
        await runSql(connection, "./legacy/schema.sql");
        await connection.execute(`INSERT IGNORE INTO services (code,name,description,base_fee,extra_half_kg,domestic_surcharge,estimated_days) VALUES
          ('standard','Tiêu chuẩn','Tiết kiệm cho mọi kiện hàng',25000,5000,15000,'2–4 ngày'),
          ('express','Hỏa tốc','Ưu tiên lấy và giao nhanh',45000,8000,25000,'1–2 ngày')`);
        await migrateWorkflow(connection);
        await connection.execute(
          "INSERT IGNORE INTO schema_migrations(version) VALUES ('003_vietnamese_started')",
        );
      }
      const ledger = tables.has("lich_su_nang_cap")
        ? "lich_su_nang_cap"
        : "schema_migrations";
      const [ledgerColumns] = await connection.query(
        `SHOW COLUMNS FROM ${ledger}`,
      );
      if (!ledgerColumns.some((c) => ["payload", "du_lieu"].includes(c.Field)))
        await connection.query(
          `ALTER TABLE ${ledger} ADD COLUMN ${ledgerColumns.some((c) => c.Field === "version") ? "payload" : "du_lieu"} JSON NULL`,
        );
      await renameVietnamese(connection);
    }
    await runSql(connection, "./schema.sql");
    await seedCatalog(connection);
    await migrateEmployeeProfiles(connection, config.database);
    await migrateStations(connection, config.database);
    await migrateDeliveryComplaints(connection, config.database);
    await migrateStationLocations(connection, config.database);
    await migrateServiceLabels(connection);
    await migrateFeatureEnhancements(connection, config.database);
  } finally {
    await connection.end();
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  migrate()
    .then(() => console.log("CSDL MySQL đã dùng tên bảng/cột tiếng Việt."))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}

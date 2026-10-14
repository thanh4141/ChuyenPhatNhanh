import { readFile } from "node:fs/promises";
import { backupDatabase } from "../backup.js";
export async function migrateStations(c, database) {
  const [[done]] = await c.query(
    "SELECT 1 FROM lich_su_nang_cap WHERE phien_ban='005_tram_trung_chuyen'",
  );
  if (done) return;
  await backupDatabase(c, database);
  const sql = await readFile(
    new URL("./stations.sql", import.meta.url),
    "utf8",
  );
  for (const statement of sql
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean))
    await c.query(statement);
  for (const [table, columns] of Object.entries({
    tai_khoan: ["ma_tram"],
    ho_so_nhan_vien: ["ma_tram"],
    don_hang: [
      "ma_tram_gui",
      "ma_tram_dich",
      "ma_tram_hien_tai",
      "ma_nv_lay_hang",
      "ma_nv_giao_hang",
      "ma_chuyen_hien_tai",
    ],
  })) {
    const [existing] = await c.query("SHOW COLUMNS FROM " + table);
    for (const name of columns)
      if (!existing.some((x) => x.Field === name))
        await c.query(
          `ALTER TABLE ${table} ADD COLUMN ${name} BIGINT UNSIGNED NULL`,
        );
    for (const name of columns) {
      const constraint = "fk_" + table + "_" + name;
      const [[present]] = await c.execute(
        "SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME=? AND CONSTRAINT_NAME=?",
        [table, constraint],
      );
      const target = name.startsWith("ma_nv_")
        ? "tai_khoan"
        : name === "ma_chuyen_hien_tai"
          ? "chuyen_trung_chuyen"
          : "tram_chuyen_phat";
      if (!present)
        await c.query(
          `ALTER TABLE ${table} ADD CONSTRAINT ${constraint} FOREIGN KEY(${name}) REFERENCES ${target}(ma_so)`,
        );
    }
  }
  await c.query(
    "ALTER TABLE tai_khoan MODIFY vai_tro ENUM('admin','employee','customer','station_manager') NOT NULL DEFAULT 'customer'",
  );
  for (const table of ["don_hang", "lich_su_don_hang"])
    await c.query(
      `ALTER TABLE ${table} MODIFY trang_thai ENUM('pending','accepted','awaiting_pickup','picked_up','delivering','completed','incomplete','cancelled','at_origin','in_transit','at_destination','ready_delivery') NOT NULL DEFAULT 'pending'`,
    );
  await c.query(
    "INSERT INTO lich_su_nang_cap(phien_ban) VALUES ('005_tram_trung_chuyen')",
  );
}

import { backupDatabase } from "../backup.js";

export async function migrateDeliveryComplaints(c, database) {
  const [[done]] = await c.query(
    "SELECT 1 FROM lich_su_nang_cap WHERE phien_ban='006_bang_chung_khieu_nai'",
  );
  if (done) return;
  await backupDatabase(c, database);
  await c.query(
    "ALTER TABLE tep_tai_len MODIFY muc_dich ENUM('parcel','incident','delivery') NOT NULL",
  );
  await c.query(`CREATE TABLE IF NOT EXISTS khieu_nai (
    ma_so BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    ma_don_hang BIGINT UNSIGNED NOT NULL,
    ma_khach_hang BIGINT UNSIGNED NOT NULL,
    tieu_de VARCHAR(150) NOT NULL,
    noi_dung VARCHAR(2000) NOT NULL,
    trang_thai ENUM('open','processing','resolved','rejected') NOT NULL DEFAULT 'open',
    phan_hoi VARCHAR(2000) NOT NULL DEFAULT '',
    ma_nguoi_xu_ly BIGINT UNSIGNED NULL,
    ngay_xu_ly DATETIME NULL,
    ngay_tao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_khieu_nai_don_khach(ma_don_hang,ma_khach_hang),
    KEY idx_khieu_nai_khach(ma_khach_hang,ma_so),
    KEY idx_khieu_nai_trang_thai(trang_thai,ma_so),
    CONSTRAINT fk_khieu_nai_don FOREIGN KEY(ma_don_hang) REFERENCES don_hang(ma_so),
    CONSTRAINT fk_khieu_nai_khach FOREIGN KEY(ma_khach_hang) REFERENCES tai_khoan(ma_so),
    CONSTRAINT fk_khieu_nai_nguoi_xu_ly FOREIGN KEY(ma_nguoi_xu_ly) REFERENCES tai_khoan(ma_so)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await c.query(
    "INSERT INTO lich_su_nang_cap(phien_ban) VALUES ('006_bang_chung_khieu_nai')",
  );
}

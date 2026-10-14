import { backupDatabase } from "../backup.js";

export async function migrateFeatureEnhancements(c, database) {
  const [[done]] = await c.query(
    "SELECT 1 FROM lich_su_nang_cap WHERE phien_ban='008_bo_sung_tinh_nang'",
  );
  if (done) return;
  if (database) await backupDatabase(c, database);

  // 1. Thêm cột hang_de_vo vào bảng don_hang nếu chưa tồn tại
  const [orderCols] = await c.query("SHOW COLUMNS FROM don_hang");
  if (!orderCols.some((r) => r.Field === "hang_de_vo")) {
    await c.query(
      "ALTER TABLE don_hang ADD COLUMN hang_de_vo TINYINT(1) NOT NULL DEFAULT 0",
    );
  }

  // 2. Cho phép một tỉnh/thành có thể có nhiều trạm bằng cách xóa UNIQUE constraint ma_tinh_thanh nếu có
  const [indexes] = await c.query(
    "SHOW INDEX FROM tram_chuyen_phat WHERE Column_name='ma_tinh_thanh' AND Non_unique=0",
  );
  for (const idx of indexes) {
    if (idx.Key_name !== "PRIMARY") {
      try {
        await c.query(
          `ALTER TABLE tram_chuyen_phat DROP INDEX \`${idx.Key_name}\``,
        );
      } catch {
        // Bỏ qua nếu có lỗi khóa
      }
    }
  }

  // Đảm bảo có index bình thường trên ma_tinh_thanh cho khóa ngoại
  const [hasIdx] = await c.query(
    "SHOW INDEX FROM tram_chuyen_phat WHERE Column_name='ma_tinh_thanh'",
  );
  if (!hasIdx || hasIdx.length === 0) {
    try {
      await c.query(
        "ALTER TABLE tram_chuyen_phat ADD INDEX idx_tram_tinh (ma_tinh_thanh)",
      );
    } catch {
      // Bỏ qua nếu đã tồn tại
    }
  }

  // 3. Mở rộng mục đích tệp tải lên nếu cần
  try {
    await c.query(
      "ALTER TABLE tep_tai_len MODIFY muc_dich ENUM('parcel','incident','delivery','weight') NOT NULL",
    );
  } catch {
    // Giữ nguyên nếu không thể modify
  }

  await c.query(
    "INSERT INTO lich_su_nang_cap(phien_ban) VALUES ('008_bo_sung_tinh_nang')",
  );
}

// Repair only the damaged default labels; preserve custom names and all prices.
export async function migrateServiceLabels(connection) {
  const version = "008_ten_dich_vu";
  const [[done]] = await connection.execute(
    "SELECT phien_ban FROM lich_su_nang_cap WHERE phien_ban=?",
    [version],
  );
  if (done) return;
  await connection.beginTransaction();
  try {
    const [rows] = await connection.query(
      "SELECT ma_so,ma_dinh_danh,ten FROM dich_vu FOR UPDATE",
    );
    const defaults = {
      standard: ["Ti?u chu?n", "Tiêu chuẩn"],
      express: ["H?a t?c", "Hỏa tốc"],
    };
    const repaired = rows.filter(
      (row) => defaults[row.ma_dinh_danh]?.[0] === row.ten,
    );
    for (const row of repaired) {
      await connection.execute("UPDATE dich_vu SET ten=? WHERE ma_so=?", [
        defaults[row.ma_dinh_danh][1],
        row.ma_so,
      ]);
    }
    // Keep the original values with the migration record for traceability.
    await connection.execute(
      "INSERT INTO lich_su_nang_cap(phien_ban,du_lieu) VALUES (?,?)",
      [version, JSON.stringify({ original_service_labels: repaired })],
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

import { backupDatabase } from '../backup.js';

export async function migrateEmployeeProfiles(c, database) {
  const [[done]] = await c.query("SELECT 1 AS done FROM lich_su_nang_cap WHERE phien_ban='004_ho_so_truoc_tai_khoan'");
  if (done) return;
  await backupDatabase(c, database);
  const [columns] = await c.query('SHOW COLUMNS FROM ho_so_nhan_vien');
  const alterations = [];
  if (columns.find(c => c.Field === 'ma_tai_khoan').Null === 'NO') alterations.push('MODIFY ma_tai_khoan BIGINT UNSIGNED NULL');
  for (const [name, size] of [['ten',120],['so_dien_thoai',20],['dia_chi_lien_he',500]]) {
    if (!columns.some(c => c.Field === name)) alterations.push(`ADD COLUMN ${name} VARCHAR(${size}) NOT NULL DEFAULT ''`);
  }
  if (alterations.length) await c.query('ALTER TABLE ho_so_nhan_vien ' + alterations.join(', '));
  await c.query(`UPDATE ho_so_nhan_vien p JOIN tai_khoan u ON u.ma_so=p.ma_tai_khoan
    SET p.ten=u.ten,p.so_dien_thoai=u.so_dien_thoai,p.dia_chi_lien_he=u.dia_chi_lien_he`);
  await c.query("INSERT INTO lich_su_nang_cap(phien_ban) VALUES ('004_ho_so_truoc_tai_khoan')");
}

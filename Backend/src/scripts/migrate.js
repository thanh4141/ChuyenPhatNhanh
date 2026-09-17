import mysql from 'mysql2/promise';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { env } from '../config/env.js';

export async function migrate(config = env.db) {
  if (!/^[a-zA-Z0-9_]+$/.test(config.database)) throw new Error('Tên cơ sở dữ liệu không hợp lệ.');
  const connection = await mysql.createConnection({ ...config, database: undefined });
  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await connection.changeUser({ database: config.database });
    const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
    for (const statement of schema.split(';').map(s => s.trim()).filter(Boolean)) await connection.query(statement);
    await connection.execute(`INSERT IGNORE INTO services (code,name,description,base_fee,extra_half_kg,domestic_surcharge,estimated_days) VALUES
      ('standard','Tiêu chuẩn','Tiết kiệm cho mọi kiện hàng',25000,5000,15000,'2–4 ngày'),
      ('express','Hỏa tốc','Ưu tiên lấy và giao nhanh',45000,8000,25000,'1–2 ngày')`);
  } finally { await connection.end(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  migrate().then(() => console.log('Đã khởi tạo CSDL và bảng giá.')).catch(error => { console.error(error.message); process.exitCode = 1; });
}

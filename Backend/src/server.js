import { createApp } from './app.js';
import { pool } from './config/database.js';
import { env } from './config/env.js';

try {
  const app = createApp();
  await pool.query('SELECT 1');
  const server = app.listen(env.port, env.host, () => console.log(`Chuyển Phát Nhanh • Admin: http://localhost:${env.port} • API: /api`));
  const shutdown = () => server.close(async () => { await pool.end(); process.exit(0); });
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch (error) {
  console.error('Không khởi động được API:', error.message);
  console.error('Kiểm tra Backend/.env và chạy npm run db:migrate.');
  await pool.end();
  process.exitCode = 1;
}

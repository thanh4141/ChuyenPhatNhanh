import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  host: process.env.HOST || '0.0.0.0',
  port: Number(process.env.PORT || 3000),
  jwtSecret: process.env.JWT_SECRET || '',
  osrmUrl: process.env.OSRM_BASE_URL || 'https://routing.openstreetmap.de/routed-car',
  photonUrl: process.env.PHOTON_BASE_URL || 'https://photon.komoot.io',
  mapTileUrl: process.env.MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  mapUserAgent: process.env.MAP_USER_AGENT || 'ChuyenPhatNhanh/1.0 (+https://github.com/thanh4141/ChuyenPhatNhanh)',
  origins: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:8081').split(',').map(s => s.trim()),
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'chuyen_phat_nhanh',
    charset: 'utf8mb4',
    timezone: 'Z',
    decimalNumbers: true,
  },
};

export function validateEnv() {
  if (env.jwtSecret.length < 32 || env.jwtSecret.startsWith('replace-')) {
    throw new Error('Hãy cấu hình JWT_SECRET ngẫu nhiên (ít nhất 32 ký tự) trong Backend/.env.');
  }
  if (!/^[a-zA-Z0-9_]+$/.test(env.db.database)) throw new Error('DB_NAME không hợp lệ.');
}

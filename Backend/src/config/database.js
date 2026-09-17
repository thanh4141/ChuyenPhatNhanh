import mysql from 'mysql2/promise';
import { env } from './env.js';

export const pool = mysql.createPool({ ...env.db, connectionLimit: 10, waitForConnections: true });
// DATETIME values are stored and decoded as UTC, independent of the MySQL host timezone.
pool.on('connection', connection => { connection.query("SET time_zone = '+00:00'"); });

export async function transaction(work) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

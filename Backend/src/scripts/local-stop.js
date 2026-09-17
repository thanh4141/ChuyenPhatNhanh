import mysql from 'mysql2/promise';
import { readFile } from 'node:fs/promises';
const {password}=JSON.parse(await readFile(new URL('../../../.local/mysql-admin.json',import.meta.url),'utf8'));
const connection=await mysql.createConnection({host:'127.0.0.1',port:3307,user:'root',password});
await connection.query('SHUTDOWN');
await connection.end();
console.log('Stopped isolated MySQL on port 3307. Data remains in .local/mysql-data.');

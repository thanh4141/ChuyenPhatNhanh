import mysql from 'mysql2/promise';
import { mkdir,writeFile } from 'node:fs/promises';
import { env } from '../config/env.js';
const connection=await mysql.createConnection(env.db);
try{
  await connection.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
  await connection.query('START TRANSACTION WITH CONSISTENT SNAPSHOT');
  const [tables]=await connection.query("SHOW FULL TABLES WHERE Table_type='BASE TABLE'");
  const backup={database:env.db.database,created_at:new Date().toISOString(),tables:{}};
  for(const table of tables){const name=Object.values(table)[0];if(!/^[a-zA-Z0-9_]+$/.test(name))throw new Error('Tên bảng không hợp lệ');const [rows]=await connection.query(`SELECT * FROM \`${name}\``);const [[ddl]]=await connection.query(`SHOW CREATE TABLE \`${name}\``);backup.tables[name]={ddl:ddl['Create Table'],rows};}
  await connection.commit();
  const directory=new URL('../../../.local/backups/',import.meta.url);await mkdir(directory,{recursive:true});
  const file=new URL(`${env.db.database}-${Date.now()}.json`,directory);await writeFile(file,JSON.stringify(backup));
  console.log(`Đã sao lưu ${tables.length} bảng vào .local/backups/${file.pathname.split('/').pop()}`);
}finally{await connection.end();}

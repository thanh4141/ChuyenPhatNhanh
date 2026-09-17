// Used only by scripts/start-local-mysql.ps1 for an isolated Windows development DB.
import mysql from 'mysql2/promise';
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile,writeFile } from 'node:fs/promises';

const root=new URL('../../',import.meta.url);
const passwordFile=new URL('../.local/mysql-admin.json',root);
const envFile=new URL('.env',root);
const stored=existsSync(passwordFile)?JSON.parse(await readFile(passwordFile,'utf8')):null;
let connection;
for(let attempt=0;attempt<20;attempt++){
  try{connection=await mysql.createConnection({host:'127.0.0.1',port:3307,user:'root',password:stored?.password||''});break;}
  catch(error){if(attempt===19)throw error;await new Promise(resolve=>setTimeout(resolve,500));}
}
try{
  let password=stored?.password;
  if(!password){password=randomBytes(32).toString('hex');await writeFile(passwordFile,JSON.stringify({password}));await connection.query(`ALTER USER 'root'@'localhost' IDENTIFIED BY '${password}'`);}
  if(!existsSync(envFile)){
    const config=`NODE_ENV=development\nHOST=0.0.0.0\nPORT=3000\nDB_HOST=127.0.0.1\nDB_PORT=3307\nDB_USER=root\nDB_PASSWORD=${password}\nDB_NAME=chuyen_phat_nhanh\nJWT_SECRET=${randomBytes(48).toString('hex')}\nCORS_ORIGINS=http://localhost:3000,http://localhost:8081,http://127.0.0.1:8081\nSEED_DEMO=true\nSEED_ADMIN_EMAIL=admin@chuyenphat.vn\nSEED_ADMIN_PASSWORD=Admin@12345\nSEED_DEMO_PASSWORD=Demo@12345\n`;
    await writeFile(envFile,config);console.log('Created Backend/.env for the isolated local MySQL instance.');
  }
  console.log('Local MySQL is ready on 127.0.0.1:3307.');
}finally{await connection.end();}

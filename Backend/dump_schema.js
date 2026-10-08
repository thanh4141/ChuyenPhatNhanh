import mysql from 'mysql2/promise';

async function dump() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3307,
    user: 'root',
    password: 'b29746c19af2351b85c49e2d2c90ddcfd7ca339953d8167b608507d0c468d98a',
    database: 'chuyen_phat_nhanh'
  });

  const [tables] = await connection.execute('SHOW TABLES;');
  const tableNames = tables.map(t => Object.values(t)[0]);
  
  const schema = {};
  for (const tableName of tableNames) {
    const [cols] = await connection.execute(`DESCRIBE \`${tableName}\``);
    schema[tableName] = cols.map(c => c.Field);
  }
  
  console.log(JSON.stringify(schema, null, 2));
  await connection.end();
}

dump().catch(console.error);

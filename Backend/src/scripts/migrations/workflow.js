import { readFile } from 'node:fs/promises';
import { provinces } from '../../config/provinces.js';

export async function migrateWorkflow(connection) {
  const sql=await readFile(new URL('../workflow.sql',import.meta.url),'utf8');
  for(const statement of sql.split(';').map(s=>s.trim()).filter(Boolean))await connection.query(statement);
  for(const p of provinces)await connection.execute('INSERT IGNORE INTO provinces(code,name,region) VALUES (?,?,?)',[p.code,p.name,p.region]);
  const [[done]]=await connection.execute("SELECT version FROM schema_migrations WHERE version='002_self_service'");
  if(done)return;
  const columns={
    rate_id:'BIGINT UNSIGNED NULL', quote_id:'CHAR(36) NULL', route_type:"ENUM('same_province','same_region','inter_region') NULL",
    pickup_snapshot:'JSON NULL', delivery_snapshot:'JSON NULL', pricing_snapshot:'JSON NULL',
    distance_meters:'INT UNSIGNED NULL', distance_source:"VARCHAR(30) NOT NULL DEFAULT 'legacy'",
    has_cod:'BOOLEAN NOT NULL DEFAULT FALSE', has_insurance:'BOOLEAN NOT NULL DEFAULT FALSE', has_packaging:'BOOLEAN NOT NULL DEFAULT FALSE',
    cod_fee:'DECIMAL(12,0) NOT NULL DEFAULT 0', insurance_fee:'DECIMAL(12,0) NOT NULL DEFAULT 0', packaging_fee:'DECIMAL(12,0) NOT NULL DEFAULT 0',
    total_amount:'DECIMAL(12,0) NULL', accepted_at:'DATETIME NULL',
  };
  const [existing]=await connection.query("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='orders'");
  const names=new Set(existing.map(c=>c.COLUMN_NAME));
  for(const [name,type] of Object.entries(columns))if(!names.has(name))await connection.query(`ALTER TABLE orders ADD COLUMN ${name} ${type}`);
  await connection.query('ALTER TABLE orders MODIFY sender_address VARCHAR(700) NOT NULL, MODIFY receiver_address VARCHAR(700) NOT NULL');
  const [indexes]=await connection.query('SHOW INDEX FROM orders');
  if(!indexes.some(i=>i.Key_name==='uk_order_quote'))await connection.query('ALTER TABLE orders ADD UNIQUE KEY uk_order_quote(quote_id)');
  const [constraints]=await connection.query("SELECT CONSTRAINT_NAME FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='orders'");
  for(const [name,column,target] of [['fk_order_rate','rate_id','service_rates'],['fk_order_quote','quote_id','shipping_quotes']])if(!constraints.some(c=>c.CONSTRAINT_NAME===name))await connection.query(`ALTER TABLE orders ADD CONSTRAINT ${name} FOREIGN KEY (${column}) REFERENCES ${target}(id)`);
  // Expand first, map existing statuses without deleting any orders, then constrain again.
  await connection.query('ALTER TABLE orders MODIFY status VARCHAR(32) NOT NULL DEFAULT \'pending\'');
  for(const [old,next] of Object.entries({assigned:'awaiting_pickup',in_transit:'delivering',out_for_delivery:'delivering',delivered:'completed',failed:'incomplete'})){
    await connection.execute('UPDATE orders SET status=? WHERE status=?',[next,old]);
    await connection.execute('UPDATE order_events SET status=? WHERE status=?',[next,old]);
  }
  await connection.query("ALTER TABLE orders MODIFY status ENUM('pending','accepted','awaiting_pickup','picked_up','delivering','completed','incomplete','cancelled') NOT NULL DEFAULT 'pending'");
  await connection.query('UPDATE orders SET total_amount=shipping_fee WHERE total_amount IS NULL');
  await connection.query('UPDATE orders SET has_cod=(cod_amount>0) WHERE distance_source=\'legacy\'');
  await connection.query("INSERT IGNORE INTO employee_profiles(user_id,employee_code,hired_at,employment_status) SELECT id,CONCAT('NV',LPAD(id,6,'0')),DATE(created_at),IF(active,'active','stopped') FROM users WHERE role='employee'");
  const [services]=await connection.query('SELECT id,code FROM services');
  for(const service of services)for(const [route,min,max] of [['same_province',1,1],['same_region',1,5],['inter_region',3,7]]){
    const express=service.code==='express';
    await connection.execute(`INSERT IGNORE INTO service_rates(service_id,route_type,base_fee,included_km,extra_km_fee,included_weight,weight_step,extra_weight_fee,cod_fee,insurance_fee,packaging_fee,min_days,max_days) VALUES (?,?,?,5,?,1,0.5,2500,0,9900,5000,?,?)`,[service.id,route,express?30000:15000,3000,express?1:min,express?Math.max(1,Math.ceil(max/2)):max]);
  }
  await connection.execute("INSERT INTO schema_migrations(version) VALUES ('002_self_service')");
}

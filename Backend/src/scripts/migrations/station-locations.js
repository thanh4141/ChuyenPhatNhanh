import {backupDatabase} from '../backup.js';
export async function migrateStationLocations(c,database){
  const [[done]]=await c.query("SELECT 1 FROM lich_su_nang_cap WHERE phien_ban='007_vi_tri_tram'");if(done)return;
  await backupDatabase(c,database);
  for(const [table,columns] of Object.entries({tram_chuyen_phat:{vi_do:'DECIMAL(10,7) NULL',kinh_do:'DECIMAL(10,7) NULL'},don_hang:{quang_duong_tram_lay_met:'INT UNSIGNED NULL'}})){
    const [existing]=await c.query('SHOW COLUMNS FROM '+table);
    for(const [name,type]of Object.entries(columns))if(!existing.some(r=>r.Field===name))await c.query(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`);
  }
  const [[check]]=await c.query("SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='tram_chuyen_phat' AND CONSTRAINT_NAME='chk_toa_do_tram'");
  if(!check)await c.query(`ALTER TABLE tram_chuyen_phat ADD CONSTRAINT chk_toa_do_tram CHECK (
    (vi_do IS NULL AND kinh_do IS NULL) OR (vi_do IS NOT NULL AND kinh_do IS NOT NULL AND vi_do BETWEEN -90 AND 90 AND kinh_do BETWEEN -180 AND 180))`);
  await c.query("INSERT INTO lich_su_nang_cap(phien_ban) VALUES ('007_vi_tri_tram')");
}

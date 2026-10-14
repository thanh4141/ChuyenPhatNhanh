import { tableNames, columnNames } from "../../config/database-names.js";

const identifier = (name) => {
  if (!/^[a-zA-Z0-9_]+$/.test(name))
    throw new Error("Tên SQL không hợp lệ: " + name);
  return "\`" + name + "\`";
};
const translated = (name) => columnNames[name] || name;
const tableName = (name) => tableNames[name] || name;

export async function renameVietnamese(connection) {
  const [tableRows] = await connection.query(
    "SHOW FULL TABLES WHERE Table_type='BASE TABLE'",
  );
  const tables = new Set(tableRows.map((row) => Object.values(row)[0]));
  const plans = [];
  for (const [oldTable, newTable] of Object.entries(tableNames)) {
    if (tables.has(oldTable) && tables.has(newTable))
      throw new Error(
        "Có cả " +
          oldTable +
          " và " +
          newTable +
          "; cần kiểm tra dữ liệu trước.",
      );
    const table = tables.has(oldTable)
      ? oldTable
      : tables.has(newTable)
        ? newTable
        : null;
    if (!table) throw new Error("Thiếu bảng " + newTable);
    const [columns] = await connection.query(
      "SHOW FULL COLUMNS FROM " + identifier(table),
    );
    const present = new Set(columns.map((c) => c.Field)),
      changes = [];
    for (const c of columns) {
      const next = columnNames[c.Field];
      if (!next) {
        if (!Object.values(columnNames).includes(c.Field))
          throw new Error("Chưa có ánh xạ cột " + table + "." + c.Field);
        continue;
      }
      if (present.has(next))
        throw new Error("Trùng tên cột tại " + table + "." + next);
      if (oldTable === "addresses" && c.Field === "default_user_id") {
        changes.push(
          "CHANGE COLUMN \`default_user_id\` \`ma_tai_khoan_mac_dinh\` BIGINT UNSIGNED GENERATED ALWAYS AS (IF(\`la_mac_dinh\`,\`ma_tai_khoan\`,NULL)) STORED",
        );
      } else
        changes.push(
          "RENAME COLUMN " + identifier(c.Field) + " TO " + identifier(next),
        );
    }
    if (changes.length) {
      const [checks] = await connection.execute(
        "SELECT tc.CONSTRAINT_NAME,cc.CHECK_CLAUSE,tc.ENFORCED FROM information_schema.TABLE_CONSTRAINTS tc JOIN information_schema.CHECK_CONSTRAINTS cc ON cc.CONSTRAINT_SCHEMA=tc.CONSTRAINT_SCHEMA AND cc.CONSTRAINT_NAME=tc.CONSTRAINT_NAME WHERE tc.TABLE_SCHEMA=DATABASE() AND tc.TABLE_NAME=? AND tc.CONSTRAINT_TYPE='CHECK'",
        [table],
      );
      for (const check of checks) {
        const expression = check.CHECK_CLAUSE.replace(
          /\`([^\`]+)\`/g,
          (_, name) => identifier(translated(name)),
        );
        changes.unshift("DROP CHECK " + identifier(check.CONSTRAINT_NAME));
        changes.push(
          "ADD CONSTRAINT " +
            identifier(check.CONSTRAINT_NAME) +
            " CHECK (" +
            expression +
            ") " +
            (check.ENFORCED === "NO" ? "NOT ENFORCED" : "ENFORCED"),
        );
      }
    }
    plans.push({ table, newTable, changes });
  }
  // Persist FK definitions in the migration ledger BEFORE dropping any constraint.
  // This allows recovery even after the final table rename or a process interruption.
  const ledger = tables.has("schema_migrations")
    ? "schema_migrations"
    : "lich_su_nang_cap";
  const [ledgerColumns] = await connection.query(
    "SHOW COLUMNS FROM " + identifier(ledger),
  );
  const version = ledgerColumns.some((c) => c.Field === "version")
    ? "version"
    : "phien_ban";
  const payload = ledgerColumns.some((c) => c.Field === "payload")
    ? "payload"
    : "du_lieu";
  const [[entry]] = await connection.query(
    "SELECT " +
      identifier(payload) +
      " AS manifest FROM " +
      identifier(ledger) +
      " WHERE " +
      identifier(version) +
      "='003_vietnamese_started'",
  );
  let manifest =
    typeof entry?.manifest === "string"
      ? JSON.parse(entry.manifest)
      : entry?.manifest;
  if (!manifest) {
    const [rows] = await connection.query(
      "SELECT k.TABLE_NAME,k.CONSTRAINT_NAME,k.COLUMN_NAME,k.REFERENCED_TABLE_NAME,k.REFERENCED_COLUMN_NAME,k.ORDINAL_POSITION,r.UPDATE_RULE,r.DELETE_RULE FROM information_schema.KEY_COLUMN_USAGE k JOIN information_schema.REFERENTIAL_CONSTRAINTS r ON r.CONSTRAINT_SCHEMA=k.CONSTRAINT_SCHEMA AND r.CONSTRAINT_NAME=k.CONSTRAINT_NAME WHERE k.TABLE_SCHEMA=DATABASE() AND k.REFERENCED_TABLE_NAME IS NOT NULL ORDER BY k.TABLE_NAME,k.CONSTRAINT_NAME,k.ORDINAL_POSITION",
    );
    const groups = new Map();
    for (const row of rows) {
      if (
        !plans.some((p) => p.table === row.TABLE_NAME) ||
        !plans.some((p) => p.table === row.REFERENCED_TABLE_NAME)
      )
        throw new Error("Khóa ngoại tham chiếu bảng ngoài phạm vi nâng cấp.");
      const key = row.TABLE_NAME + "." + row.CONSTRAINT_NAME;
      if (!groups.has(key))
        groups.set(key, {
          table: tableName(row.TABLE_NAME),
          name: row.CONSTRAINT_NAME,
          columns: [],
          reference: tableName(row.REFERENCED_TABLE_NAME),
          referenceColumns: [],
          update: row.UPDATE_RULE,
          delete: row.DELETE_RULE,
        });
      const fk = groups.get(key);
      fk.columns.push(translated(row.COLUMN_NAME));
      fk.referenceColumns.push(translated(row.REFERENCED_COLUMN_NAME));
    }
    manifest = { foreignKeys: [...groups.values()] };
    await connection.execute(
      "UPDATE " +
        identifier(ledger) +
        " SET " +
        identifier(payload) +
        "=? WHERE " +
        identifier(version) +
        "='003_vietnamese_started'",
      [JSON.stringify(manifest)],
    );
  }
  for (const plan of plans) {
    const [foreignKeys] = await connection.execute(
      "SELECT CONSTRAINT_NAME FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME=?",
      [plan.table],
    );
    for (const fk of foreignKeys)
      await connection.query(
        "ALTER TABLE " +
          identifier(plan.table) +
          " DROP FOREIGN KEY " +
          identifier(fk.CONSTRAINT_NAME),
      );
  }
  // CHECKs and generated expressions are replaced atomically with their column renames.
  for (const plan of plans)
    if (plan.changes.length)
      await connection.query(
        "ALTER TABLE " + identifier(plan.table) + " " + plan.changes.join(", "),
      );
  const renames = plans
    .filter((p) => p.table !== p.newTable)
    .map((p) => identifier(p.table) + " TO " + identifier(p.newTable));
  if (renames.length)
    await connection.query("RENAME TABLE " + renames.join(", "));
  for (const fk of manifest.foreignKeys) {
    if (
      !["RESTRICT", "CASCADE", "SET NULL", "NO ACTION"].includes(fk.update) ||
      !["RESTRICT", "CASCADE", "SET NULL", "NO ACTION"].includes(fk.delete)
    )
      throw new Error("Quy tắc khóa ngoại không được hỗ trợ.");
    const [[exists]] = await connection.execute(
      "SELECT CONSTRAINT_NAME FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME=? AND CONSTRAINT_NAME=?",
      [fk.table, fk.name],
    );
    if (!exists)
      await connection.query(
        "ALTER TABLE " +
          identifier(fk.table) +
          " ADD CONSTRAINT " +
          identifier(fk.name) +
          " FOREIGN KEY (" +
          fk.columns.map(identifier).join(",") +
          ") REFERENCES " +
          identifier(fk.reference) +
          " (" +
          fk.referenceColumns.map(identifier).join(",") +
          ") ON UPDATE " +
          fk.update +
          " ON DELETE " +
          fk.delete,
      );
  }
  await connection.execute(
    "INSERT IGNORE INTO lich_su_nang_cap(phien_ban) VALUES ('003_ten_tieng_viet')",
  );
}

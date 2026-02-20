import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const sourceDb = process.env.MYSQL_SOURCE_DATABASE || "megaerp";
const targetDb = process.env.MYSQL_TARGET_DATABASE || "SISFECERP";

const host = process.env.MYSQL_HOST || "localhost";
const port = Number(process.env.MYSQL_PORT) || 3306;
const user = process.env.MYSQL_USER || "root";
const password = process.env.MYSQL_PASSWORD || "";

async function copyDatabase(connection: mysql.Connection, source: string, target: string, opts?: { skipIfTargetExists?: boolean }) {
  const [dbs] = await connection.query("SHOW DATABASES LIKE ?", [source]);
  if (!Array.isArray(dbs) || dbs.length === 0) {
    console.log(`Banco origem não encontrado: ${source}`);
    return;
  }

  if (opts?.skipIfTargetExists) {
    const [targetExists] = await connection.query("SHOW DATABASES LIKE ?", [target]);
    if (Array.isArray(targetExists) && targetExists.length > 0) {
      console.log(`Destino já existe, pulando: ${target}`);
      return;
    }
  }

  await connection.query(`CREATE DATABASE IF NOT EXISTS ${target}`);
  const [tables] = await connection.query(`SHOW FULL TABLES IN ${source}`);

  await connection.query("SET FOREIGN_KEY_CHECKS=0");

  for (const row of tables as Array<Record<string, string>>) {
    const keys = Object.keys(row);
    const tableName = row[keys[0]];
    const tableType = row[keys[1]];

    if (tableType && tableType.toLowerCase() === "view") {
      const [viewRows] = await connection.query(`SHOW CREATE VIEW ${source}.${tableName}`);
      const createView = (viewRows as Array<Record<string, string>>)[0]["Create View"];
      await connection.query(`DROP VIEW IF EXISTS ${target}.${tableName}`);
      const createViewTarget = createView.replaceAll(`${source}.`, `${target}.`);
      await connection.query(createViewTarget);
      console.log(`View copiada: ${tableName} (${source} -> ${target})`);
      continue;
    }

    const [createRows] = await connection.query(`SHOW CREATE TABLE ${source}.${tableName}`);
    let createSql = (createRows as Array<Record<string, string>>)[0]["Create Table"];
    createSql = createSql.replace(/^CREATE TABLE /i, "CREATE TABLE IF NOT EXISTS ");

    await connection.query(`DROP TABLE IF EXISTS ${target}.${tableName}`);
    await connection.query(`USE ${target}`);
    await connection.query(createSql);
    await connection.query(`INSERT INTO ${target}.${tableName} SELECT * FROM ${source}.${tableName}`);
    console.log(`Copiado: ${tableName} (${source} -> ${target})`);
  }
}

async function copyTenantDatabases(connection: mysql.Connection, sourcePrefix: string, targetPrefix: string) {
  const [dbs] = await connection.query("SHOW DATABASES LIKE ?", [`${sourcePrefix}%`]);
  if (!Array.isArray(dbs) || dbs.length === 0) return;

  for (const row of dbs as Array<Record<string, string>>) {
    const dbName = String(Object.values(row)[0] ?? "");
    if (!dbName.startsWith(sourcePrefix)) continue;
    const suffix = dbName.slice(sourcePrefix.length);
    const targetName = `${targetPrefix}${suffix}`;
    if (dbName === targetName) continue;
    await copyDatabase(connection, dbName, targetName, { skipIfTargetExists: true });
  }
}

async function run() {
  const connection = await mysql.createConnection({ host, port, user, password });
  try {
    await copyDatabase(connection, sourceDb, targetDb);
    await copyTenantDatabases(connection, "megaerp_tenant_", "SISFECERP_tenant_");
    await copyTenantDatabases(connection, "sisfac_tenant_", "SISFECERP_tenant_");
    await copyTenantDatabases(connection, "sisfecerp_tenant_", "SISFECERP_tenant_");
    console.log("Backup e cópia concluídos.");
  } finally {
    await connection.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

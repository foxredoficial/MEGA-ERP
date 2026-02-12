import mysql from "mysql2/promise";
import { env } from "./env.js";
import { readFile } from "node:fs/promises";

export const pool = mysql.createPool({
  host: env.MYSQL_HOST,
  port: env.MYSQL_PORT,
  user: env.MYSQL_USER,
  password: env.MYSQL_PASSWORD,
  database: env.MYSQL_DATABASE,
  connectionLimit: 10,
  decimalNumbers: true,
  namedPlaceholders: true,
  multipleStatements: false,
});

async function executeSqlScript(connection: mysql.Connection, sql: string) {
  const statements = sql
    .split(/;\s*\n/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  for (const stmt of statements) {
    await connection.query(stmt);
  }
}

export async function ensureDatabaseAndSchema() {
  const base = await mysql.createConnection({
    host: env.MYSQL_HOST,
    port: env.MYSQL_PORT,
    user: env.MYSQL_USER,
    password: env.MYSQL_PASSWORD,
  });

  try {
    await base.query(`CREATE DATABASE IF NOT EXISTS \`${env.MYSQL_DATABASE}\``);
  } finally {
    await base.end();
  }

  const conn = await mysql.createConnection({
    host: env.MYSQL_HOST,
    port: env.MYSQL_PORT,
    user: env.MYSQL_USER,
    password: env.MYSQL_PASSWORD,
    database: env.MYSQL_DATABASE,
  });

  try {
    const schemaUrl = new URL("../schema.sql", import.meta.url);
    const schema = await readFile(schemaUrl, "utf8");
    await executeSqlScript(conn, schema);
    try {
      await conn.query("ALTER TABLE plans ADD COLUMN description TEXT NULL");
    } catch {}
    try {
      await conn.query("ALTER TABLE plans ADD COLUMN max_users INT NOT NULL DEFAULT 1");
    } catch {}
    try {
      await conn.query("ALTER TABLE plans ADD COLUMN max_products INT NOT NULL DEFAULT 100");
    } catch {}
    try {
      await conn.query("ALTER TABLE plans ADD COLUMN max_invoices INT NOT NULL DEFAULT 50");
    } catch {}
  } finally {
    await conn.end();
  }
}

export async function pingDb() {
  const conn = await pool.getConnection();
  try {
    await conn.ping();
  } finally {
    conn.release();
  }
}

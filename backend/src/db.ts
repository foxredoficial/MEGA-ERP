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
    try {
      await conn.query("ALTER TABLE plans ADD COLUMN mp_preapproval_plan_id VARCHAR(255) NULL");
    } catch {}
    try {
      await conn.query("ALTER TABLE plans ADD COLUMN trial_enabled TINYINT(1) NOT NULL DEFAULT 0");
    } catch {}
    try {
      await conn.query("ALTER TABLE plans ADD COLUMN trial_days INT NOT NULL DEFAULT 7");
    } catch {}
    try {
      await conn.query("ALTER TABLE users ADD COLUMN trial_started_at DATETIME NULL");
    } catch {}
    try {
      await conn.query("ALTER TABLE users ADD COLUMN trial_ended_at DATETIME NULL");
    } catch {}
    try {
      await conn.query("ALTER TABLE subscriptions DROP FOREIGN KEY fk_subscriptions_user");
    } catch {}
    try {
      await conn.query(
        "ALTER TABLE subscriptions ADD CONSTRAINT fk_subscriptions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE"
      );
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

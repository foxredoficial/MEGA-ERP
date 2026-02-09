import mysql from "mysql2/promise";
import { env } from "./env.js";
import { readFile } from "node:fs/promises";
import { pool as saasPool } from "./db.js";

const tenantPools = new Map<string, mysql.Pool>();
const ensuredTenants = new Map<string, number>();
const TENANT_SCHEMA_VERSION = 2;

function assertUuid(tenantId: string) {
  if (!/^[a-f0-9\-]{36}$/i.test(tenantId)) {
    throw new Error("Tenant inválido.");
  }
}

function shouldIgnoreSchemaError(err: unknown) {
  const anyErr = err as any;
  return anyErr?.code === "ER_DUP_KEYNAME" || anyErr?.code === "ER_DUP_FIELDNAME";
}

async function ensureColumn(conn: mysql.Connection, table: string, column: string, definition: string) {
  const [rows] = await conn.query<any[]>(
    `SELECT COUNT(*) as c
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  const count = Number((rows as any[])[0]?.c ?? 0);
  if (count > 0) return;
  try {
    await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN ${definition}`);
  } catch (err) {
    if (!shouldIgnoreSchemaError(err)) throw err;
  }
}

async function ensureTenantMigrations(conn: mysql.Connection) {
  await ensureColumn(conn, "products", "cost_price", "cost_price DECIMAL(10, 2) NOT NULL DEFAULT 0");
  await ensureColumn(conn, "products", "stock_min", "stock_min DECIMAL(10, 3) NOT NULL DEFAULT 0");
  await ensureColumn(conn, "products", "stock_max", "stock_max DECIMAL(10, 3) NOT NULL DEFAULT 0");
  await ensureColumn(conn, "products", "crossdocking", "crossdocking DECIMAL(10, 3) NOT NULL DEFAULT 0");
  await ensureColumn(conn, "products", "has_lot_control", "has_lot_control BOOLEAN NOT NULL DEFAULT 0");
}

async function ensureTenantSchema(tenantId: string, dbName: string) {
  if (ensuredTenants.get(tenantId) === TENANT_SCHEMA_VERSION) return;

  const conn = await mysql.createConnection({
    host: env.MYSQL_HOST,
    port: env.MYSQL_PORT,
    user: env.MYSQL_USER,
    password: env.MYSQL_PASSWORD,
    database: dbName,
  });

  try {
    const schemaUrl = new URL("../tenant_schema.sql", import.meta.url);
    const schema = await readFile(schemaUrl, "utf8");
    const statements = schema
      .split(/;\s*\n/g)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    for (const stmt of statements) {
      try {
        await conn.query(stmt);
      } catch (err) {
        if (!shouldIgnoreSchemaError(err)) throw err;
      }
    }
    await ensureTenantMigrations(conn);
    ensuredTenants.set(tenantId, TENANT_SCHEMA_VERSION);
  } finally {
    await conn.end();
  }
}

export async function createTenantDatabase(tenantId: string) {
  assertUuid(tenantId);
  const dbName = `megaerp_tenant_${tenantId.replace(/-/g, "_")}`;
  
  try {
    await saasPool.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    
    // Connect to new DB to run schema
    const tenantConn = await mysql.createConnection({
        host: env.MYSQL_HOST,
        port: env.MYSQL_PORT,
        user: env.MYSQL_USER,
        password: env.MYSQL_PASSWORD,
        database: dbName,
    });

    try {
        const schemaUrl = new URL("../tenant_schema.sql", import.meta.url);
        const schema = await readFile(schemaUrl, "utf8");
        
        // Split schema into statements
        const statements = schema
            .split(/;\s*\n/g)
            .map((s) => s.trim())
            .filter((s) => s.length > 0 && !s.startsWith("--"));

        for (const stmt of statements) {
          if (!stmt) continue;
          try {
            await tenantConn.query(stmt);
          } catch (err) {
            if (!shouldIgnoreSchemaError(err)) throw err;
          }
        }
        await ensureTenantMigrations(tenantConn);
    } finally {
        await tenantConn.end();
    }
    
    return true;
  } catch (err) {
    console.error(`Failed to create tenant database for ${tenantId}:`, err);
    throw err;
  }
}

export async function getTenantPool(tenantId: string): Promise<mysql.Pool> {
  assertUuid(tenantId);
  const dbName = `megaerp_tenant_${tenantId.replace(/-/g, "_")}`; // Sanitize UUID if needed

  if (tenantPools.has(tenantId)) {
    await ensureTenantSchema(tenantId, dbName);
    return tenantPools.get(tenantId)!;
  }

  // Create new pool for tenant
  const pool = mysql.createPool({
    host: env.MYSQL_HOST,
    port: env.MYSQL_PORT,
    user: env.MYSQL_USER,
    password: env.MYSQL_PASSWORD,
    database: dbName,
    connectionLimit: 10,
    namedPlaceholders: true,
    multipleStatements: false,
  });

  // Lazy creation check
  try {
    const conn = await pool.getConnection();
    conn.release();
  } catch (err: any) {
    if (err.code === 'ER_BAD_DB_ERROR') {
      console.log(`[Tenant] Database ${dbName} not found. Creating...`);
      await createTenantDatabase(tenantId);
      // Pool should work now on next request
    } else {
      throw err;
    }
  }

  await ensureTenantSchema(tenantId, dbName);

  tenantPools.set(tenantId, pool);
  return pool;
}

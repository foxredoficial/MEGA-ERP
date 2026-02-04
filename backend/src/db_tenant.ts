import mysql from "mysql2/promise";
import { env } from "./env.js";
import { readFile } from "node:fs/promises";
import { pool as saasPool } from "./db.js";

const tenantPools = new Map<string, mysql.Pool>();

export async function createTenantDatabase(tenantId: string) {
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
        multipleStatements: true
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
            if (stmt) await tenantConn.query(stmt);
        }
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
  const dbName = `megaerp_tenant_${tenantId.replace(/-/g, "_")}`; // Sanitize UUID if needed

  if (tenantPools.has(tenantId)) {
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
  
  tenantPools.set(tenantId, pool);
  return pool;
}

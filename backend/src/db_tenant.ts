import mysql from "mysql2/promise";
import { env } from "./env.js";
import { readFile } from "node:fs/promises";
import { pool as saasPool } from "./db.js";

const tenantPools = new Map<string, mysql.Pool>();
const ensuredTenants = new Map<string, number>();
const TENANT_SCHEMA_VERSION = 7;

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
  await ensureColumn(conn, "products", "location", "location VARCHAR(100) NULL");
  await ensureColumn(conn, "products", "ncm", "ncm VARCHAR(20) NULL");
  await ensureColumn(conn, "products", "cest", "cest VARCHAR(20) NULL");
  await ensureColumn(conn, "products", "origin", "origin VARCHAR(20) NULL");
  await ensureColumn(conn, "products", "item_type", "item_type VARCHAR(50) NULL");
  await ensureColumn(conn, "products", "parent_id", "parent_id CHAR(36) NULL");
  await ensureColumn(conn, "products", "variations_json", "variations_json JSON NULL");
  await ensureColumn(conn, "products", "brand", "brand VARCHAR(100) NULL");
  await ensureColumn(conn, "products", "weight_net", "weight_net DECIMAL(10, 3) NULL");
  await ensureColumn(conn, "products", "weight_gross", "weight_gross DECIMAL(10, 3) NULL");
  await ensureColumn(conn, "products", "width", "width DECIMAL(10, 2) NULL");
  await ensureColumn(conn, "products", "height", "height DECIMAL(10, 2) NULL");
  await ensureColumn(conn, "products", "depth", "depth DECIMAL(10, 2) NULL");
  await ensureColumn(conn, "products", "volumes", "volumes INT NULL");
  await ensureColumn(conn, "products", "items_per_box", "items_per_box INT NULL");
  await ensureColumn(conn, "products", "gtin", "gtin VARCHAR(50) NULL");
  await ensureColumn(conn, "products", "gtin_tax", "gtin_tax VARCHAR(50) NULL");
  await ensureColumn(conn, "products", "description_short", "description_short TEXT NULL");
  await ensureColumn(conn, "products", "description_complementary", "description_complementary TEXT NULL");
  await ensureColumn(conn, "products", "image_url", "image_url VARCHAR(500) NULL");
  await ensureColumn(conn, "products", "video_url", "video_url VARCHAR(500) NULL");
  await ensureColumn(conn, "products", "external_link", "external_link VARCHAR(500) NULL");
  await ensureColumn(conn, "products", "observations", "observations TEXT NULL");

  await ensureColumn(conn, "cash_transactions", "ref_type", "ref_type VARCHAR(50) NULL");

  await conn.query(
    `CREATE TABLE IF NOT EXISTS fin_categories (
      id CHAR(36) PRIMARY KEY,
      user_id CHAR(36) NOT NULL,
      name VARCHAR(120) NOT NULL,
      type ENUM('income','expense','transfer','other') NOT NULL,
      active BOOLEAN NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      UNIQUE KEY uq_fin_categories_user_name (user_id, name)
    )`
  );
  await conn.query(`CREATE INDEX idx_fin_categories_user ON fin_categories(user_id)`).catch((err) => {
    if (!shouldIgnoreSchemaError(err)) throw err;
  });
  await conn.query(`CREATE INDEX idx_fin_categories_type ON fin_categories(type)`).catch((err) => {
    if (!shouldIgnoreSchemaError(err)) throw err;
  });

  await conn.query(
    `CREATE TABLE IF NOT EXISTS fin_cost_centers (
      id CHAR(36) PRIMARY KEY,
      user_id CHAR(36) NOT NULL,
      name VARCHAR(120) NOT NULL,
      active BOOLEAN NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      UNIQUE KEY uq_fin_cost_centers_user_name (user_id, name)
    )`
  );
  await conn.query(`CREATE INDEX idx_fin_cost_centers_user ON fin_cost_centers(user_id)`).catch((err) => {
    if (!shouldIgnoreSchemaError(err)) throw err;
  });

  await conn.query(
    `CREATE TABLE IF NOT EXISTS fin_coa_accounts (
      id CHAR(36) PRIMARY KEY,
      user_id CHAR(36) NOT NULL,
      code VARCHAR(50) NOT NULL,
      name VARCHAR(200) NOT NULL,
      nature ENUM('revenue','expense','asset','liability','equity') NOT NULL,
      parent_id CHAR(36) NULL,
      active BOOLEAN NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      UNIQUE KEY uq_fin_coa_accounts_user_code (user_id, code)
    )`
  );
  await conn.query(`CREATE INDEX idx_fin_coa_accounts_user ON fin_coa_accounts(user_id)`).catch((err) => {
    if (!shouldIgnoreSchemaError(err)) throw err;
  });
  await conn.query(`CREATE INDEX idx_fin_coa_accounts_nature ON fin_coa_accounts(nature)`).catch((err) => {
    if (!shouldIgnoreSchemaError(err)) throw err;
  });

  await ensureColumn(conn, "financial_titles", "competence_date", "competence_date DATE NULL");
  await ensureColumn(conn, "financial_titles", "category_id", "category_id CHAR(36) NULL");
  await ensureColumn(conn, "financial_titles", "cost_center_id", "cost_center_id CHAR(36) NULL");
  await ensureColumn(conn, "financial_titles", "coa_account_id", "coa_account_id CHAR(36) NULL");
  await ensureColumn(conn, "financial_titles", "document_number", "document_number VARCHAR(50) NULL");
  await conn.query(`CREATE INDEX idx_fin_titles_competence ON financial_titles(competence_date)`).catch((err) => {
    if (!shouldIgnoreSchemaError(err)) throw err;
  });
  await conn.query(`CREATE INDEX idx_fin_titles_category ON financial_titles(category_id)`).catch((err) => {
    if (!shouldIgnoreSchemaError(err)) throw err;
  });
  await conn.query(`CREATE INDEX idx_fin_titles_cost_center ON financial_titles(cost_center_id)`).catch((err) => {
    if (!shouldIgnoreSchemaError(err)) throw err;
  });
  await conn.query(`CREATE INDEX idx_fin_titles_coa ON financial_titles(coa_account_id)`).catch((err) => {
    if (!shouldIgnoreSchemaError(err)) throw err;
  });

  await ensureColumn(
    conn,
    "financial_payments",
    "settlement_account_type",
    "settlement_account_type ENUM('none','cash','bank') NOT NULL DEFAULT 'none'"
  );
  await ensureColumn(conn, "financial_payments", "cash_session_id", "cash_session_id CHAR(36) NULL");
  await ensureColumn(conn, "financial_payments", "cash_transaction_id", "cash_transaction_id CHAR(36) NULL");
  await ensureColumn(conn, "financial_payments", "bank_account_id", "bank_account_id CHAR(36) NULL");
  await ensureColumn(conn, "financial_payments", "bank_transaction_id", "bank_transaction_id CHAR(36) NULL");
  await ensureColumn(conn, "financial_payments", "reconciled_at", "reconciled_at DATETIME NULL");
  await conn.query(`CREATE INDEX idx_fin_pay_bank_tx ON financial_payments(bank_transaction_id)`).catch((err) => {
    if (!shouldIgnoreSchemaError(err)) throw err;
  });
  await conn.query(`CREATE INDEX idx_fin_pay_cash_tx ON financial_payments(cash_transaction_id)`).catch((err) => {
    if (!shouldIgnoreSchemaError(err)) throw err;
  });
  await conn.query(`CREATE INDEX idx_fin_pay_reconciled ON financial_payments(reconciled_at)`).catch((err) => {
    if (!shouldIgnoreSchemaError(err)) throw err;
  });

  await ensureColumn(
    conn,
    "bank_transactions",
    "source",
    "source ENUM('manual','import','settlement') NOT NULL DEFAULT 'manual'"
  );
  await ensureColumn(conn, "bank_transactions", "external_id", "external_id VARCHAR(128) NULL");
  await ensureColumn(conn, "bank_transactions", "import_batch_id", "import_batch_id CHAR(36) NULL");
  await ensureColumn(conn, "bank_transactions", "raw_json", "raw_json JSON NULL");
  await ensureColumn(conn, "bank_transactions", "reconciled_at", "reconciled_at DATETIME NULL");
  await conn.query(`CREATE INDEX idx_bank_tx_reconciled ON bank_transactions(reconciled_at)`).catch((err) => {
    if (!shouldIgnoreSchemaError(err)) throw err;
  });
  await conn.query(`CREATE INDEX idx_bank_tx_source ON bank_transactions(source)`).catch((err) => {
    if (!shouldIgnoreSchemaError(err)) throw err;
  });
  await conn.query(`CREATE INDEX idx_bank_tx_external ON bank_transactions(account_id, external_id)`).catch((err) => {
    if (!shouldIgnoreSchemaError(err)) throw err;
  });

  await conn.query(
    `CREATE TABLE IF NOT EXISTS bank_reconciliations (
      id CHAR(36) PRIMARY KEY,
      user_id CHAR(36) NOT NULL,
      bank_transaction_id CHAR(36) NOT NULL,
      matched_ref_type VARCHAR(50) NOT NULL,
      matched_ref_id CHAR(36) NOT NULL,
      amount DECIMAL(10, 2) NOT NULL,
      memo TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_bank_recon (bank_transaction_id, matched_ref_type, matched_ref_id)
    )`
  );
  await conn.query(`CREATE INDEX idx_bank_recon_user ON bank_reconciliations(user_id)`).catch((err) => {
    if (!shouldIgnoreSchemaError(err)) throw err;
  });
  await conn.query(`CREATE INDEX idx_bank_recon_tx ON bank_reconciliations(bank_transaction_id)`).catch((err) => {
    if (!shouldIgnoreSchemaError(err)) throw err;
  });

  await conn.query(
    `CREATE TABLE IF NOT EXISTS audit_log (
      id CHAR(36) PRIMARY KEY,
      user_id CHAR(36) NOT NULL,
      actor_user_id CHAR(36) NOT NULL,
      entity VARCHAR(100) NOT NULL,
      entity_id CHAR(36) NOT NULL,
      action VARCHAR(50) NOT NULL,
      before_json JSON NULL,
      after_json JSON NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );
  await conn.query(`CREATE INDEX idx_audit_user ON audit_log(user_id)`).catch((err) => {
    if (!shouldIgnoreSchemaError(err)) throw err;
  });
  await conn.query(`CREATE INDEX idx_audit_entity ON audit_log(entity, entity_id)`).catch((err) => {
    if (!shouldIgnoreSchemaError(err)) throw err;
  });
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
  const dbName = `SISFECERP_tenant_${tenantId.replace(/-/g, "_")}`;
  
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
  const dbName = `SISFECERP_tenant_${tenantId.replace(/-/g, "_")}`; // Sanitize UUID if needed

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
    decimalNumbers: true,
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

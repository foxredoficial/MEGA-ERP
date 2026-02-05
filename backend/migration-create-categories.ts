
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || "localhost",
  port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  connectionLimit: 10,
  namedPlaceholders: true,
});

async function run() {
  const connection = await pool.getConnection();
  try {
    // 1. Get all tenant databases
    const [rows] = await connection.query("SHOW DATABASES LIKE 'megaerp_tenant_%'");
    const databases = (rows as any[]).map(row => Object.values(row)[0] as string);

    console.log(`Found ${databases.length} tenant databases.`);

    // 2. Iterate and migrate each
    for (const dbName of databases) {
      console.log(`Migrating ${dbName}...`);
      const tenantPool = mysql.createPool({
        host: process.env.MYSQL_HOST || "localhost",
        port: Number(process.env.MYSQL_PORT) || 3306,
        user: process.env.MYSQL_USER || "root",
        password: process.env.MYSQL_PASSWORD || "",
        database: dbName,
        connectionLimit: 1,
      });

      try {
        await tenantPool.query(`
          CREATE TABLE IF NOT EXISTS categories (
            id CHAR(36) PRIMARY KEY,
            user_id CHAR(36) NOT NULL,
            name VARCHAR(255) NOT NULL,
            parent_id CHAR(36) NULL,
            description TEXT,
            color VARCHAR(20),
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
          )
        `);
        console.log(`  -> Success: categories table created in ${dbName}`);
      } catch (err) {
        console.error(`  -> Failed to migrate ${dbName}:`, err);
      } finally {
        await tenantPool.end();
      }
    }

  } catch (err) {
    console.error("Migration script failed:", err);
  } finally {
    connection.release();
    await pool.end();
  }
}

run();


import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || "localhost",
  port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "megaerp",
  connectionLimit: 10,
  namedPlaceholders: true,
});

async function run() {
  console.log("Creating price_lists tables...");
  
  const connection = await pool.getConnection();
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS price_lists (
        id CHAR(36) PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        name VARCHAR(255) NOT NULL,
        type ENUM('percentage', 'fixed_value', 'custom') NOT NULL,
        adjustment_type ENUM('increase', 'decrease') NULL,
        adjustment_value DECIMAL(10, 2) NULL,
        start_date DATETIME NULL,
        end_date DATETIME NULL,
        status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        INDEX idx_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS price_list_items (
        id CHAR(36) PRIMARY KEY,
        price_list_id CHAR(36) NOT NULL,
        product_id CHAR(36) NOT NULL,
        price DECIMAL(10, 2) NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        FOREIGN KEY (price_list_id) REFERENCES price_lists(id) ON DELETE CASCADE,
        INDEX idx_price_list_id (price_list_id),
        INDEX idx_product_id (product_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    
    console.log("Tables created successfully.");
  } catch (err) {
    console.error("Error creating tables:", err);
  } finally {
    connection.release();
    await pool.end();
  }
}

run();

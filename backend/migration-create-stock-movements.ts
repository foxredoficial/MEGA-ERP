import { pool } from "./src/db.js";

async function run() {
  try {
    console.log("Creating stock_movements table...");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id CHAR(36) PRIMARY KEY,
        product_id CHAR(36) NOT NULL,
        user_id CHAR(36) NOT NULL,
        type ENUM('in', 'out', 'adjustment') NOT NULL,
        quantity DECIMAL(10, 3) NOT NULL,
        reason VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    console.log("stock_movements table created successfully.");
    process.exit(0);
  } catch (e) {
    console.error("Migration failed:", e);
    process.exit(1);
  }
}

run();

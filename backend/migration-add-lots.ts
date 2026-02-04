import { pool } from "./src/db.js";

async function run() {
  try {
    console.log("Starting Lots migration...");

    // 1. Add has_lot_control to products
    try {
      await pool.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS has_lot_control BOOLEAN DEFAULT 0");
      console.log("Added has_lot_control to products.");
    } catch (e: any) {
      if (e.code !== 'ER_DUP_FIELDNAME') console.error(e);
    }

    // 2. Create product_lots table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_lots (
        id CHAR(36) PRIMARY KEY,
        product_id CHAR(36) NOT NULL,
        code VARCHAR(50) NOT NULL,
        manufacturing_date DATE,
        expiration_date DATE,
        observations TEXT,
        stock DECIMAL(10, 3) DEFAULT 0,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `);
    console.log("Created product_lots table.");

    // 3. Add lot_id to stock_movements
    try {
      await pool.query("ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS lot_id CHAR(36) NULL");
      await pool.query("ALTER TABLE stock_movements ADD CONSTRAINT fk_movements_lot FOREIGN KEY (lot_id) REFERENCES product_lots(id) ON DELETE SET NULL");
      console.log("Added lot_id to stock_movements.");
    } catch (e: any) {
        if (e.code !== 'ER_DUP_FIELDNAME' && e.code !== 'ER_CANT_DROP_FIELD_OR_KEY') console.error(e);
    }

    console.log("Migration completed successfully.");
    process.exit(0);
  } catch (e) {
    console.error("Migration failed:", e);
    process.exit(1);
  }
}

run();

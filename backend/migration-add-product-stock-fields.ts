import { pool } from "./src/db.js";

async function run() {
  try {
    console.log("Adding new columns to products table...");

    const columns = [
      "ADD COLUMN IF NOT EXISTS stock_min DECIMAL(10, 3) DEFAULT 0",
      "ADD COLUMN IF NOT EXISTS stock_max DECIMAL(10, 3) DEFAULT 0",
      "ADD COLUMN IF NOT EXISTS crossdocking INT DEFAULT 0",
      "ADD COLUMN IF NOT EXISTS location VARCHAR(100)",
      "ADD COLUMN IF NOT EXISTS ncm VARCHAR(20)",
      "ADD COLUMN IF NOT EXISTS cest VARCHAR(20)",
      "ADD COLUMN IF NOT EXISTS origin VARCHAR(5)",
      "ADD COLUMN IF NOT EXISTS item_type VARCHAR(50)",
      "ADD COLUMN IF NOT EXISTS parent_id CHAR(36) NULL",
      "ADD CONSTRAINT fk_products_parent FOREIGN KEY (parent_id) REFERENCES products(id) ON DELETE CASCADE"
    ];

    for (const col of columns) {
      try {
        await pool.query(`ALTER TABLE products ${col}`);
        console.log(`Executed: ${col}`);
      } catch (e: any) {
        if (e.code === 'ER_DUP_FIELDNAME') {
          console.log(`Column already exists: ${col}`);
        } else if (e.code === 'ER_CANT_DROP_FIELD_OR_KEY') { 
             console.log(`Constraint already exists: ${col}`);
        } else {
          console.error(`Error executing ${col}:`, e);
        }
      }
    }

    console.log("Migration completed.");
    process.exit(0);
  } catch (e) {
    console.error("Migration failed:", e);
    process.exit(1);
  }
}

run();

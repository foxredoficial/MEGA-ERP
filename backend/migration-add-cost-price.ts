import { pool } from "./src/db.js";

async function run() {
  try {
    console.log("Adding cost_price column to products table...");

    const columns = [
      "ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10, 2) DEFAULT 0"
    ];

    for (const col of columns) {
      try {
        await pool.query(`ALTER TABLE products ${col}`);
        console.log(`Executed: ${col}`);
      } catch (e: any) {
        if (e.code === 'ER_DUP_FIELDNAME') {
          console.log(`Column already exists: ${col}`);
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

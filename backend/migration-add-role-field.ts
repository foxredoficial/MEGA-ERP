import { pool } from "./src/db";

async function run() {
  console.log("Adding 'role' column to users table...");

  try {
    // Check if column exists
    const [columns] = await pool.query<any[]>(
      "SHOW COLUMNS FROM users LIKE 'role'"
    );

    if (columns.length > 0) {
      console.log("Column 'role' already exists.");
    } else {
      await pool.query(
        "ALTER TABLE users ADD COLUMN role ENUM('user', 'admin') NOT NULL DEFAULT 'user' AFTER email"
      );
      console.log("Column 'role' added successfully.");
    }

    // Update existing users to 'user' just in case (default handles it, but safe to be sure)
    // await pool.query("UPDATE users SET role = 'user' WHERE role IS NULL");

  } catch (err) {
    console.error("Error adding column:", err);
  } finally {
    process.exit();
  }
}

run();

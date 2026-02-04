import { createConnection } from "mysql2/promise";
import { env } from "./src/env.js";

async function run() {
  const conn = await createConnection({
    host: env.MYSQL_HOST,
    user: env.MYSQL_USER,
    password: env.MYSQL_PASSWORD,
    database: env.MYSQL_DATABASE,
    port: env.MYSQL_PORT,
  });

  console.log("Adicionando colunas à tabela users...");

  const columns = [
    "ADD COLUMN IF NOT EXISTS person_type VARCHAR(20) DEFAULT 'juridica'",
    "ADD COLUMN IF NOT EXISTS ie VARCHAR(50) DEFAULT NULL",
    "ADD COLUMN IF NOT EXISTS im VARCHAR(50) DEFAULT NULL",
    "ADD COLUMN IF NOT EXISTS cnae VARCHAR(20) DEFAULT NULL",
    "ADD COLUMN IF NOT EXISTS tax_regime VARCHAR(50) DEFAULT NULL",
    "ADD COLUMN IF NOT EXISTS mobile VARCHAR(20) DEFAULT NULL",
    "ADD COLUMN IF NOT EXISTS email_billing VARCHAR(255) DEFAULT NULL",
    "ADD COLUMN IF NOT EXISTS website VARCHAR(255) DEFAULT NULL"
  ];

  for (const col of columns) {
    try {
      await conn.query(`ALTER TABLE users ${col}`);
      console.log(`Sucesso: ${col}`);
    } catch (e: any) {
      console.log(`Nota: ${e.message}`);
    }
  }

  console.log("Concluído.");
  await conn.end();
}

run().catch(console.error);
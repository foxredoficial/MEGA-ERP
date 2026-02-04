
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
  const connection = await pool.getConnection();
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id CHAR(36) PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        name VARCHAR(255) NOT NULL,
        fantasy_name VARCHAR(255),
        code VARCHAR(50),
        type ENUM('fisica', 'juridica') DEFAULT 'fisica',
        cpf_cnpj VARCHAR(20),
        rg_ie VARCHAR(20),
        contributor_type INT, 
        date_since DATE,
        
        address_zip VARCHAR(10),
        address_street VARCHAR(255),
        address_number VARCHAR(20),
        address_complement VARCHAR(100),
        address_neighborhood VARCHAR(100),
        address_city VARCHAR(100),
        address_state VARCHAR(2),
        
        address_billing_zip VARCHAR(10),
        address_billing_street VARCHAR(255),
        address_billing_number VARCHAR(20),
        address_billing_complement VARCHAR(100),
        address_billing_neighborhood VARCHAR(100),
        address_billing_city VARCHAR(100),
        address_billing_state VARCHAR(2),
        
        phone VARCHAR(20),
        fax VARCHAR(20),
        mobile VARCHAR(20),
        email VARCHAR(255),
        website VARCHAR(255),
        skype VARCHAR(100),
        contacts_json JSON,
        
        avg_load DECIMAL(5, 2),
        marital_status VARCHAR(50),
        profession VARCHAR(100),
        gender ENUM('masculino', 'feminino', 'outro'),
        birth_date DATE,
        naturalness VARCHAR(100),
        parents_json JSON,
        contact_type VARCHAR(100),
        status ENUM('ativo', 'inativo', 'sem_movimento') DEFAULT 'ativo',
        seller VARCHAR(100),
        operation_nature VARCHAR(100),
        
        credit_limit DECIMAL(10, 2),
        credit_limit_type ENUM('limitado', 'ilimitado', 'zero') DEFAULT 'limitado',
        payment_condition VARCHAR(100),
        category_id VARCHAR(36),
        
        observations TEXT,
        
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        
        CONSTRAINT fk_contacts_user FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    console.log("Migration executed: contacts table created.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    connection.release();
    await pool.end();
  }
}

run();

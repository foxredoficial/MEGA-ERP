CREATE TABLE IF NOT EXISTS products (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL, -- Kept for reference, but no FK to separate DB
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100),
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  unit VARCHAR(20) DEFAULT 'UN',
  format ENUM('simple', 'variation') DEFAULT 'simple',
  type ENUM('product', 'service') DEFAULT 'product',
  condition_type ENUM('new', 'used', 'not_specified') DEFAULT 'new',
  category_id CHAR(36),
  brand VARCHAR(100),
  weight_net DECIMAL(10, 3),
  weight_gross DECIMAL(10, 3),
  width DECIMAL(10, 2),
  height DECIMAL(10, 2),
  depth DECIMAL(10, 2),
  volumes INT,
  items_per_box INT,
  gtin VARCHAR(50),
  gtin_tax VARCHAR(50),
  description_short TEXT,
  description_complementary TEXT,
  image_url VARCHAR(500),
  video_url VARCHAR(500),
  external_link VARCHAR(500),
  observations TEXT,
  stock DECIMAL(10, 3) DEFAULT 0,
  has_lot_control BOOLEAN DEFAULT 0,
  cost_price DECIMAL(10, 2) DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS contacts (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL, -- Kept for reference
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
  updated_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS product_lots (
  id CHAR(36) PRIMARY KEY,
  product_id CHAR(36) NOT NULL,
  code VARCHAR(50) NOT NULL,
  manufacturing_date DATE,
  expiration_date DATE,
  observations TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_lots_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS salespersons (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  cpf VARCHAR(14),
  commission_rate DECIMAL(5, 2),
  status ENUM('active', 'inactive') DEFAULT 'active',
  observations TEXT,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

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
);

CREATE TABLE IF NOT EXISTS price_lists (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  type ENUM('percentage', 'fixed_value', 'custom') NOT NULL,
  adjustment_type ENUM('increase', 'decrease') NULL,
  adjustment_value DECIMAL(10, 2) NULL,
  start_date DATETIME NULL,
  end_date DATETIME NULL,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS price_list_items (
  id CHAR(36) PRIMARY KEY,
  price_list_id CHAR(36) NOT NULL,
  product_id CHAR(36) NOT NULL,
  price DECIMAL(10, 2) NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_pli_list FOREIGN KEY (price_list_id) REFERENCES price_lists(id) ON DELETE CASCADE,
  CONSTRAINT fk_pli_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS products (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL, -- Kept for reference, but no FK to separate DB
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100),
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  cost_price DECIMAL(10, 2) DEFAULT 0,
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
  stock_min DECIMAL(10, 3) DEFAULT 0,
  stock_max DECIMAL(10, 3) DEFAULT 0,
  crossdocking DECIMAL(10, 3) DEFAULT 0,
  location VARCHAR(100),
  ncm VARCHAR(20),
  cest VARCHAR(20),
  origin VARCHAR(20),
  item_type VARCHAR(50),
  parent_id CHAR(36),
  has_lot_control BOOLEAN DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS salespersons (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  cpf VARCHAR(20),
  commission_rate DECIMAL(5, 2),
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  observations TEXT,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);
CREATE INDEX idx_salespersons_user ON salespersons(user_id);

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
  stock DECIMAL(10, 3) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_lots_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id CHAR(36) PRIMARY KEY,
  product_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  type ENUM('in', 'out', 'adjustment') NOT NULL,
  quantity DECIMAL(10, 3) NOT NULL,
  reason TEXT,
  lot_id CHAR(36),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_stock_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_stock_lot FOREIGN KEY (lot_id) REFERENCES product_lots(id) ON DELETE SET NULL
);
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_created ON stock_movements(created_at);

CREATE TABLE IF NOT EXISTS cash_sessions (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  user_name VARCHAR(255) NULL,
  status ENUM('open', 'closed') NOT NULL,
  opening_balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
  closing_balance DECIMAL(10, 2) NULL,
  opened_at DATETIME NOT NULL,
  closed_at DATETIME NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);
CREATE INDEX idx_cash_sessions_user ON cash_sessions(user_id);
CREATE INDEX idx_cash_sessions_status ON cash_sessions(status);
CREATE INDEX idx_cash_sessions_opened ON cash_sessions(opened_at);

CREATE TABLE IF NOT EXISTS cash_transactions (
  id CHAR(36) PRIMARY KEY,
  session_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  type ENUM('in', 'out') NOT NULL,
  category VARCHAR(50) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  ref_id CHAR(36) NULL,
  meta_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cash_tx_session FOREIGN KEY (session_id) REFERENCES cash_sessions(id) ON DELETE CASCADE
);
CREATE INDEX idx_cash_tx_session ON cash_transactions(session_id);
CREATE INDEX idx_cash_tx_created ON cash_transactions(created_at);

CREATE TABLE IF NOT EXISTS financial_titles (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  kind ENUM('ar', 'ap') NOT NULL,
  status ENUM('open', 'partial', 'paid', 'canceled') NOT NULL,
  origin VARCHAR(20) NOT NULL,
  ref_id CHAR(36) NULL,
  party_id CHAR(36) NULL,
  party_name VARCHAR(255) NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  paid_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);
CREATE INDEX idx_fin_titles_user ON financial_titles(user_id);
CREATE INDEX idx_fin_titles_kind ON financial_titles(kind);
CREATE INDEX idx_fin_titles_status ON financial_titles(status);
CREATE INDEX idx_fin_titles_due ON financial_titles(due_date);

CREATE TABLE IF NOT EXISTS financial_payments (
  id CHAR(36) PRIMARY KEY,
  title_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  method VARCHAR(20) NOT NULL,
  paid_at DATETIME NOT NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_fin_pay_title FOREIGN KEY (title_id) REFERENCES financial_titles(id) ON DELETE CASCADE
);
CREATE INDEX idx_fin_pay_title ON financial_payments(title_id);
CREATE INDEX idx_fin_pay_paid_at ON financial_payments(paid_at);

CREATE TABLE IF NOT EXISTS sales_orders (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  number VARCHAR(50) NOT NULL,
  customer_id CHAR(36) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  status ENUM('open', 'billed', 'delivered', 'canceled') NOT NULL,
  observations TEXT NOT NULL,
  totals_count DECIMAL(10, 3) NOT NULL DEFAULT 0,
  totals_subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  totals_discount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  totals_total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uq_sales_orders_user_number (user_id, number)
);
CREATE INDEX idx_sales_orders_user ON sales_orders(user_id);
CREATE INDEX idx_sales_orders_status ON sales_orders(status);
CREATE INDEX idx_sales_orders_date ON sales_orders(date);

CREATE TABLE IF NOT EXISTS sales_order_items (
  id CHAR(36) PRIMARY KEY,
  order_id CHAR(36) NOT NULL,
  product_id CHAR(36) NOT NULL,
  description TEXT NOT NULL,
  quantity DECIMAL(10, 3) NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  discount DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  CONSTRAINT fk_sales_order_items_order FOREIGN KEY (order_id) REFERENCES sales_orders(id) ON DELETE CASCADE
);
CREATE INDEX idx_sales_order_items_order ON sales_order_items(order_id);

CREATE TABLE IF NOT EXISTS pdv_sales (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  cash_session_id CHAR(36) NOT NULL,
  customer_id CHAR(36) NULL,
  customer_name VARCHAR(255) NULL,
  payment_method VARCHAR(50) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  discount DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  status ENUM('completed', 'canceled') NOT NULL,
  created_at DATETIME NOT NULL
);
CREATE INDEX idx_pdv_sales_user ON pdv_sales(user_id);
CREATE INDEX idx_pdv_sales_session ON pdv_sales(cash_session_id);
CREATE INDEX idx_pdv_sales_created ON pdv_sales(created_at);

CREATE TABLE IF NOT EXISTS pdv_sale_items (
  id CHAR(36) PRIMARY KEY,
  sale_id CHAR(36) NOT NULL,
  product_id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100) NULL,
  quantity DECIMAL(10, 3) NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  discount_per_unit DECIMAL(10, 2) NOT NULL,
  line_total DECIMAL(10, 2) NOT NULL,
  CONSTRAINT fk_pdv_sale_items_sale FOREIGN KEY (sale_id) REFERENCES pdv_sales(id) ON DELETE CASCADE
);
CREATE INDEX idx_pdv_sale_items_sale ON pdv_sale_items(sale_id);

CREATE TABLE IF NOT EXISTS service_orders (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  number VARCHAR(50) NOT NULL,
  customer_id CHAR(36) NULL,
  customer_name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  status ENUM('open', 'in_progress', 'completed', 'canceled') NOT NULL,
  description TEXT NOT NULL,
  total_cents INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uq_service_orders_user_number (user_id, number)
);
CREATE INDEX idx_service_orders_user ON service_orders(user_id);
CREATE INDEX idx_service_orders_status ON service_orders(status);
CREATE INDEX idx_service_orders_date ON service_orders(date);

CREATE TABLE IF NOT EXISTS service_order_items (
  id CHAR(36) PRIMARY KEY,
  order_id CHAR(36) NOT NULL,
  kind ENUM('labor','part','service','fee') NOT NULL,
  product_id CHAR(36) NULL,
  description TEXT NOT NULL,
  quantity DECIMAL(10, 3) NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  discount DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  CONSTRAINT fk_service_order_items_order FOREIGN KEY (order_id) REFERENCES service_orders(id) ON DELETE CASCADE
);
CREATE INDEX idx_service_order_items_order ON service_order_items(order_id);

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

CREATE TABLE IF NOT EXISTS biz_documents (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  type ENUM('proposal','contract','purchase_order','incoming_invoice','production_order','nfe','nfce','service_invoice') NOT NULL,
  number VARCHAR(50) NOT NULL,
  party_id CHAR(36) NULL,
  party_name VARCHAR(255) NULL,
  date DATE NOT NULL,
  status VARCHAR(30) NOT NULL,
  notes TEXT NULL,
  totals_count DECIMAL(10, 3) NOT NULL DEFAULT 0,
  totals_subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  totals_discount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  totals_total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  payload_json JSON NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uq_biz_documents_user_type_number (user_id, type, number)
);
CREATE INDEX idx_biz_documents_user ON biz_documents(user_id);
CREATE INDEX idx_biz_documents_type ON biz_documents(type);
CREATE INDEX idx_biz_documents_date ON biz_documents(date);
CREATE INDEX idx_biz_documents_status ON biz_documents(status);

CREATE TABLE IF NOT EXISTS biz_document_items (
  id CHAR(36) PRIMARY KEY,
  document_id CHAR(36) NOT NULL,
  product_id CHAR(36) NULL,
  description TEXT NOT NULL,
  quantity DECIMAL(10, 3) NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  discount DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  CONSTRAINT fk_biz_doc_items_doc FOREIGN KEY (document_id) REFERENCES biz_documents(id) ON DELETE CASCADE
);
CREATE INDEX idx_biz_doc_items_doc ON biz_document_items(document_id);

CREATE TABLE IF NOT EXISTS bank_accounts (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  bank VARCHAR(100) NULL,
  agency VARCHAR(50) NULL,
  account_number VARCHAR(50) NULL,
  initial_balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
  balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);
CREATE INDEX idx_bank_accounts_user ON bank_accounts(user_id);

CREATE TABLE IF NOT EXISTS bank_transactions (
  id CHAR(36) PRIMARY KEY,
  account_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  type ENUM('in','out') NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT NOT NULL,
  occurred_at DATETIME NOT NULL,
  matched_ref_type VARCHAR(50) NULL,
  matched_ref_id CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bank_tx_account FOREIGN KEY (account_id) REFERENCES bank_accounts(id) ON DELETE CASCADE
);
CREATE INDEX idx_bank_tx_account ON bank_transactions(account_id);
CREATE INDEX idx_bank_tx_occurred ON bank_transactions(occurred_at);

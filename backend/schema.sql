CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  company_name VARCHAR(255) NULL,

  document VARCHAR(20) NULL,
  phone VARCHAR(20) NULL,
  address_zip VARCHAR(10) NULL,
  address_street VARCHAR(255) NULL,
  address_number VARCHAR(20) NULL,
  address_neighborhood VARCHAR(100) NULL,
  address_city VARCHAR(100) NULL,
  address_state VARCHAR(2) NULL,
  address_complement VARCHAR(100) NULL,
  person_type ENUM('fisica', 'juridica') NULL DEFAULT 'juridica',
  ie VARCHAR(50) NULL,
  im VARCHAR(50) NULL,
  cnae VARCHAR(20) NULL,
  tax_regime VARCHAR(50) NULL,
  mobile VARCHAR(20) NULL,
  email_billing VARCHAR(255) NULL,
  website VARCHAR(255) NULL,

  google_id VARCHAR(255) NULL,
  has_password TINYINT(1) NOT NULL DEFAULT 1,
  role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  preferences JSON NULL,

  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS plans (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price_cents INT NOT NULL,
  features_json JSON NOT NULL,
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  plan_id CHAR(36) NOT NULL,
  status ENUM('active','canceled','past_due') NOT NULL,
  mp_preapproval_id VARCHAR(255) NULL,
  started_at DATETIME NOT NULL,
  ended_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_subscriptions_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_subscriptions_plan FOREIGN KEY (plan_id) REFERENCES plans(id)
);

CREATE TABLE IF NOT EXISTS security_events (
  id CHAR(36) PRIMARY KEY,
  kind VARCHAR(50) NOT NULL,
  ip VARCHAR(64) NULL,
  method VARCHAR(10) NULL,
  path VARCHAR(500) NULL,
  query VARCHAR(1000) NULL,
  user_agent VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_security_events_created (created_at),
  INDEX idx_security_events_kind (kind)
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  ip VARCHAR(64) NULL,
  user_agent VARCHAR(500) NULL,
  created_at DATETIME NOT NULL,
  UNIQUE KEY uq_password_reset_token_hash (token_hash),
  INDEX idx_password_reset_user (user_id),
  INDEX idx_password_reset_expires (expires_at)
);

CREATE TABLE IF NOT EXISTS mp_webhook_events (
  id CHAR(36) PRIMARY KEY,
  mp_event_key VARCHAR(255) NOT NULL,
  payload_json JSON NOT NULL,
  created_at DATETIME NOT NULL,
  UNIQUE KEY uq_mp_webhook_event_key (mp_event_key)
);

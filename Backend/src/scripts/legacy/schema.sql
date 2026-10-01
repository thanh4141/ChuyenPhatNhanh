-- MySQL 8.0+, UTF-8. Run with: npm run db:migrate
CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  address VARCHAR(500) NOT NULL DEFAULT '',
  role ENUM('admin','employee','customer') NOT NULL DEFAULT 'customer',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  token_version INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_role (role, active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS services (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(30) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255) NOT NULL,
  base_fee DECIMAL(12,0) NOT NULL,
  extra_half_kg DECIMAL(12,0) NOT NULL,
  domestic_surcharge DECIMAL(12,0) NOT NULL,
  estimated_days VARCHAR(30) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  CHECK (base_fee >= 0 AND extra_half_kg >= 0 AND domestic_surcharge >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tracking_code VARCHAR(30) NOT NULL UNIQUE,
  customer_id BIGINT UNSIGNED NOT NULL,
  employee_id BIGINT UNSIGNED NULL,
  service_id BIGINT UNSIGNED NOT NULL,
  sender_name VARCHAR(120) NOT NULL,
  sender_phone VARCHAR(20) NOT NULL,
  sender_address VARCHAR(500) NOT NULL,
  receiver_name VARCHAR(120) NOT NULL,
  receiver_phone VARCHAR(20) NOT NULL,
  receiver_address VARCHAR(500) NOT NULL,
  package_name VARCHAR(200) NOT NULL,
  weight DECIMAL(8,2) NOT NULL,
  zone ENUM('same_city','domestic') NOT NULL,
  cod_amount DECIMAL(12,0) NOT NULL DEFAULT 0,
  shipping_fee DECIMAL(12,0) NOT NULL,
  payer ENUM('sender','receiver') NOT NULL DEFAULT 'sender',
  note VARCHAR(1000) NOT NULL DEFAULT '',
  status ENUM('pending','assigned','picked_up','in_transit','out_for_delivery','delivered','failed','cancelled') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  delivered_at DATETIME NULL,
  CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES users(id),
  CONSTRAINT fk_orders_employee FOREIGN KEY (employee_id) REFERENCES users(id),
  CONSTRAINT fk_orders_service FOREIGN KEY (service_id) REFERENCES services(id),
  CHECK (weight > 0 AND cod_amount >= 0 AND shipping_fee >= 0),
  INDEX idx_orders_customer (customer_id, created_at),
  INDEX idx_orders_employee (employee_id, status),
  INDEX idx_orders_status (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  actor_id BIGINT UNSIGNED NOT NULL,
  status VARCHAR(30) NOT NULL,
  note VARCHAR(1000) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_events_order FOREIGN KEY (order_id) REFERENCES orders(id),
  CONSTRAINT fk_events_actor FOREIGN KEY (actor_id) REFERENCES users(id),
  INDEX idx_events_order (order_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

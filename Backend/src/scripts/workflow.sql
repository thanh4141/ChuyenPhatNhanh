CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(50) PRIMARY KEY,
  applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS provinces (
  code CHAR(2) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  region ENUM('north','central','south') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS employee_profiles (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL UNIQUE,
  employee_code VARCHAR(30) NOT NULL UNIQUE,
  hometown VARCHAR(255) NOT NULL DEFAULT '',
  identity_number VARCHAR(12) NULL UNIQUE,
  hired_at DATE NOT NULL,
  employment_status ENUM('active','stopped') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_profile_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS service_rates (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  service_id BIGINT UNSIGNED NOT NULL,
  route_type ENUM('same_province','same_region','inter_region') NOT NULL,
  base_fee DECIMAL(12,0) NOT NULL,
  included_km DECIMAL(7,2) NOT NULL DEFAULT 5,
  extra_km_fee DECIMAL(12,0) NOT NULL,
  included_weight DECIMAL(7,2) NOT NULL DEFAULT 1,
  weight_step DECIMAL(7,2) NOT NULL DEFAULT 0.5,
  extra_weight_fee DECIMAL(12,0) NOT NULL,
  cod_fee DECIMAL(12,0) NOT NULL DEFAULT 0,
  insurance_fee DECIMAL(12,0) NOT NULL DEFAULT 9900,
  packaging_fee DECIMAL(12,0) NOT NULL DEFAULT 5000,
  min_days INT NOT NULL,
  max_days INT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_service_route (service_id,route_type),
  CONSTRAINT fk_rate_service FOREIGN KEY (service_id) REFERENCES services(id),
  CHECK (base_fee>=0 AND included_km>=0 AND extra_km_fee>=0 AND included_weight>0 AND weight_step>0 AND extra_weight_fee>=0 AND cod_fee>=0 AND insurance_fee>=0 AND packaging_fee>=0 AND min_days>=0 AND max_days>=min_days)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS addresses (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  label VARCHAR(80) NOT NULL DEFAULT 'Địa chỉ lấy hàng',
  contact_name VARCHAR(120) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  province_code CHAR(2) NOT NULL,
  ward VARCHAR(120) NOT NULL,
  village VARCHAR(120) NOT NULL DEFAULT '',
  detail VARCHAR(255) NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  formatted_address VARCHAR(700) NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  default_user_id BIGINT UNSIGNED GENERATED ALWAYS AS (IF(is_default,user_id,NULL)) STORED UNIQUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_address_user FOREIGN KEY(user_id) REFERENCES users(id),
  CONSTRAINT fk_address_province FOREIGN KEY(province_code) REFERENCES provinces(code),
  INDEX idx_addresses_user(user_id,id),
  CHECK (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS uploads (
  id CHAR(36) PRIMARY KEY,
  owner_id BIGINT UNSIGNED NOT NULL,
  purpose ENUM('parcel','incident') NOT NULL,
  storage_name VARCHAR(50) NOT NULL UNIQUE,
  mime_type VARCHAR(30) NOT NULL,
  size_bytes INT UNSIGNED NOT NULL,
  original_size_bytes INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_upload_owner FOREIGN KEY(owner_id) REFERENCES users(id),
  INDEX idx_upload_owner(owner_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS shipping_quotes (
  id CHAR(36) PRIMARY KEY,
  customer_id BIGINT UNSIGNED NOT NULL,
  rate_id BIGINT UNSIGNED NOT NULL,
  snapshot JSON NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_quote_customer FOREIGN KEY(customer_id) REFERENCES users(id),
  CONSTRAINT fk_quote_rate FOREIGN KEY(rate_id) REFERENCES service_rates(id),
  INDEX idx_quotes_expiry(expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_media (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  upload_id CHAR(36) NOT NULL UNIQUE,
  event_id BIGINT UNSIGNED NULL,
  CONSTRAINT fk_media_order FOREIGN KEY(order_id) REFERENCES orders(id),
  CONSTRAINT fk_media_upload FOREIGN KEY(upload_id) REFERENCES uploads(id),
  CONSTRAINT fk_media_event FOREIGN KEY(event_id) REFERENCES order_events(id),
  INDEX idx_media_order(order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  order_id BIGINT UNSIGNED NULL,
  type VARCHAR(30) NOT NULL,
  title VARCHAR(150) NOT NULL,
  message VARCHAR(500) NOT NULL,
  read_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notification_user FOREIGN KEY(user_id) REFERENCES users(id),
  CONSTRAINT fk_notification_order FOREIGN KEY(order_id) REFERENCES orders(id),
  INDEX idx_notification_user(user_id,read_at,id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reviews (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL UNIQUE,
  customer_id BIGINT UNSIGNED NOT NULL,
  employee_id BIGINT UNSIGNED NOT NULL,
  stars TINYINT UNSIGNED NOT NULL,
  comment VARCHAR(1000) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_review_order FOREIGN KEY(order_id) REFERENCES orders(id),
  CONSTRAINT fk_review_customer FOREIGN KEY(customer_id) REFERENCES users(id),
  CONSTRAINT fk_review_employee FOREIGN KEY(employee_id) REFERENCES users(id),
  CHECK (stars BETWEEN 1 AND 5),
  INDEX idx_reviews_employee(employee_id,id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS map_cache (
 cache_key CHAR(64) PRIMARY KEY,
 payload JSON NOT NULL,
 expires_at DATETIME NOT NULL,
 INDEX idx_map_cache_expiry(expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

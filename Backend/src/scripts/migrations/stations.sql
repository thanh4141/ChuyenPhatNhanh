CREATE TABLE IF NOT EXISTS tram_chuyen_phat (
 ma_so BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 ten VARCHAR(120) NOT NULL,
 ma_tinh_thanh VARCHAR(2) NOT NULL UNIQUE,
 dia_chi_lien_he VARCHAR(500) NOT NULL,
 dang_hoat_dong BOOLEAN NOT NULL DEFAULT TRUE,
 ngay_tao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT fk_tram_tinh FOREIGN KEY(ma_tinh_thanh) REFERENCES tinh_thanh(ma_dinh_danh)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS chuyen_trung_chuyen (
 ma_so BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 ma_dinh_danh VARCHAR(30) NOT NULL UNIQUE,
 ma_tram_gui BIGINT UNSIGNED NOT NULL,
 ma_tram_dich BIGINT UNSIGNED NOT NULL,
 ma_tram_giao_cuoi BIGINT UNSIGNED NOT NULL,
 trang_thai ENUM('planned','dispatched','received','cancelled') NOT NULL DEFAULT 'planned',
 ma_nguoi_thuc_hien BIGINT UNSIGNED NOT NULL,
 ngay_tao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 ngay_xuat_kho DATETIME NULL,
 ngay_nhan_du DATETIME NULL,
 CONSTRAINT fk_chuyen_gui FOREIGN KEY(ma_tram_gui) REFERENCES tram_chuyen_phat(ma_so),
 CONSTRAINT fk_chuyen_dich FOREIGN KEY(ma_tram_dich) REFERENCES tram_chuyen_phat(ma_so),
 CONSTRAINT fk_chuyen_cuoi FOREIGN KEY(ma_tram_giao_cuoi) REFERENCES tram_chuyen_phat(ma_so),
 CONSTRAINT fk_chuyen_actor FOREIGN KEY(ma_nguoi_thuc_hien) REFERENCES tai_khoan(ma_so)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS kien_trung_chuyen (
 ma_chuyen BIGINT UNSIGNED NOT NULL,
 ma_don_hang BIGINT UNSIGNED NOT NULL,
 ngay_nhap_kho DATETIME NULL,
 PRIMARY KEY(ma_chuyen,ma_don_hang),
 CONSTRAINT fk_kien_chuyen FOREIGN KEY(ma_chuyen) REFERENCES chuyen_trung_chuyen(ma_so),
 CONSTRAINT fk_kien_don FOREIGN KEY(ma_don_hang) REFERENCES don_hang(ma_so)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS nhat_ky_kho (
 ma_so BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 ma_tram BIGINT UNSIGNED NOT NULL,
 ma_don_hang BIGINT UNSIGNED NOT NULL,
 ma_chuyen BIGINT UNSIGNED NULL,
 loai ENUM('pickup_received','transfer_out','transfer_received','delivery_out') NOT NULL,
 ma_nguoi_thuc_hien BIGINT UNSIGNED NOT NULL,
 ngay_tao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 KEY idx_kho_tram_ngay(ma_tram,ngay_tao),
 CONSTRAINT fk_kho_tram FOREIGN KEY(ma_tram) REFERENCES tram_chuyen_phat(ma_so),
 CONSTRAINT fk_kho_don FOREIGN KEY(ma_don_hang) REFERENCES don_hang(ma_so),
 CONSTRAINT fk_kho_chuyen FOREIGN KEY(ma_chuyen) REFERENCES chuyen_trung_chuyen(ma_so),
 CONSTRAINT fk_kho_actor FOREIGN KEY(ma_nguoi_thuc_hien) REFERENCES tai_khoan(ma_so)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

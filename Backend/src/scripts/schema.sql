-- MySQL 8.0+. Toan bo ten bang/cot tieng Viet khong dau.
-- CSDL moi: npm run db:migrate. CSDL cu: script tu sao luu va doi ten giu du lieu.

-- Schema nền. Dùng db:migrate để áp dụng 005 (trạm/kho) và 006 (bằng chứng/khiếu nại), 007 (tọa độ trạm).
CREATE TABLE IF NOT EXISTS `tai_khoan` (
  `ma_so` bigint unsigned NOT NULL AUTO_INCREMENT,
  `ten` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `thu_dien_tu` varchar(190) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mat_khau_bam` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `so_dien_thoai` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dia_chi_lien_he` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `vai_tro` enum('admin','employee','customer') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'customer',
  `dang_hoat_dong` tinyint(1) NOT NULL DEFAULT '1',
  `phien_ban_token` int NOT NULL DEFAULT '0',
  `ngay_tao` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ma_so`),
  UNIQUE KEY `thu_dien_tu` (`thu_dien_tu`),
  KEY `idx_users_role` (`vai_tro`,`dang_hoat_dong`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `dich_vu` (
  `ma_so` bigint unsigned NOT NULL AUTO_INCREMENT,
  `ma_dinh_danh` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ten` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mo_ta` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cuoc_co_ban` decimal(12,0) NOT NULL,
  `cuoc_them_nua_kg` decimal(12,0) NOT NULL,
  `phu_phi_ngoai_tinh` decimal(12,0) NOT NULL,
  `thoi_gian_du_kien` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dang_hoat_dong` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`ma_so`),
  UNIQUE KEY `ma_dinh_danh` (`ma_dinh_danh`),
  CONSTRAINT `services_chk_1` CHECK (((`cuoc_co_ban` >= 0) and (`cuoc_them_nua_kg` >= 0) and (`phu_phi_ngoai_tinh` >= 0)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `lich_su_nang_cap` (
  `phien_ban` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ngay_ap_dung` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `du_lieu` json DEFAULT NULL,
  PRIMARY KEY (`phien_ban`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tinh_thanh` (
  `ma_dinh_danh` char(2) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ten` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mien` enum('north','central','south') COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`ma_dinh_danh`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ho_so_nhan_vien` (
  `ma_so` bigint unsigned NOT NULL AUTO_INCREMENT,
  `ma_tai_khoan` bigint unsigned DEFAULT NULL,
  `ten` varchar(120) NOT NULL DEFAULT '',
  `so_dien_thoai` varchar(20) NOT NULL DEFAULT '',
  `dia_chi_lien_he` varchar(500) NOT NULL DEFAULT '',
  `ma_nhan_vien_noi_bo` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `que_quan` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `so_cccd` varchar(12) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ngay_vao_lam` date NOT NULL,
  `trang_thai_lam_viec` enum('active','stopped') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `ngay_tao` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ngay_cap_nhat` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ma_so`),
  UNIQUE KEY `ma_tai_khoan` (`ma_tai_khoan`),
  UNIQUE KEY `ma_nhan_vien_noi_bo` (`ma_nhan_vien_noi_bo`),
  UNIQUE KEY `so_cccd` (`so_cccd`),
  CONSTRAINT `fk_profile_user` FOREIGN KEY (`ma_tai_khoan`) REFERENCES `tai_khoan` (`ma_so`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bang_cuoc` (
  `ma_so` bigint unsigned NOT NULL AUTO_INCREMENT,
  `ma_dich_vu` bigint unsigned NOT NULL,
  `loai_tuyen` enum('same_province','same_region','inter_region') COLLATE utf8mb4_unicode_ci NOT NULL,
  `cuoc_co_ban` decimal(12,0) NOT NULL,
  `so_km_bao_gom` decimal(7,2) NOT NULL DEFAULT '5.00',
  `don_gia_km_vuot` decimal(12,0) NOT NULL,
  `khoi_luong_bao_gom` decimal(7,2) NOT NULL DEFAULT '1.00',
  `buoc_khoi_luong` decimal(7,2) NOT NULL DEFAULT '0.50',
  `don_gia_khoi_luong_vuot` decimal(12,0) NOT NULL,
  `phi_thu_ho` decimal(12,0) NOT NULL DEFAULT '0',
  `phi_bao_hiem` decimal(12,0) NOT NULL DEFAULT '9900',
  `phi_dong_goi` decimal(12,0) NOT NULL DEFAULT '5000',
  `so_ngay_toi_thieu` int NOT NULL,
  `so_ngay_toi_da` int NOT NULL,
  `dang_hoat_dong` tinyint(1) NOT NULL DEFAULT '1',
  `ngay_cap_nhat` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ma_so`),
  UNIQUE KEY `uk_service_route` (`ma_dich_vu`,`loai_tuyen`),
  CONSTRAINT `fk_rate_service` FOREIGN KEY (`ma_dich_vu`) REFERENCES `dich_vu` (`ma_so`),
  CONSTRAINT `service_rates_chk_1` CHECK (((`cuoc_co_ban` >= 0) and (`so_km_bao_gom` >= 0) and (`don_gia_km_vuot` >= 0) and (`khoi_luong_bao_gom` > 0) and (`buoc_khoi_luong` > 0) and (`don_gia_khoi_luong_vuot` >= 0) and (`phi_thu_ho` >= 0) and (`phi_bao_hiem` >= 0) and (`phi_dong_goi` >= 0) and (`so_ngay_toi_thieu` >= 0) and (`so_ngay_toi_da` >= `so_ngay_toi_thieu`)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `dia_chi` (
  `ma_so` bigint unsigned NOT NULL AUTO_INCREMENT,
  `ma_tai_khoan` bigint unsigned NOT NULL,
  `nhan_dia_chi` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Địa chỉ lấy hàng',
  `ten_lien_he` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `so_dien_thoai` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ma_tinh_thanh` char(2) COLLATE utf8mb4_unicode_ci NOT NULL,
  `xa_phuong` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `thon_xom` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `dia_chi_chi_tiet` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `vi_do` decimal(10,7) NOT NULL,
  `kinh_do` decimal(10,7) NOT NULL,
  `dia_chi_day_du` varchar(700) COLLATE utf8mb4_unicode_ci NOT NULL,
  `la_mac_dinh` tinyint(1) NOT NULL DEFAULT '0',
  `ma_tai_khoan_mac_dinh` bigint unsigned GENERATED ALWAYS AS (if(`la_mac_dinh`,`ma_tai_khoan`,NULL)) STORED,
  `ngay_tao` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ma_so`),
  UNIQUE KEY `ma_tai_khoan_mac_dinh` (`ma_tai_khoan_mac_dinh`),
  KEY `fk_address_province` (`ma_tinh_thanh`),
  KEY `idx_addresses_user` (`ma_tai_khoan`,`ma_so`),
  CONSTRAINT `fk_address_province` FOREIGN KEY (`ma_tinh_thanh`) REFERENCES `tinh_thanh` (`ma_dinh_danh`),
  CONSTRAINT `fk_address_user` FOREIGN KEY (`ma_tai_khoan`) REFERENCES `tai_khoan` (`ma_so`),
  CONSTRAINT `addresses_chk_1` CHECK (((`vi_do` between -(90) and 90) and (`kinh_do` between -(180) and 180)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tep_tai_len` (
  `ma_so` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ma_chu_so_huu` bigint unsigned NOT NULL,
  `muc_dich` enum('parcel','incident') COLLATE utf8mb4_unicode_ci NOT NULL,
  `ten_tep_luu` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `loai_noi_dung` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dung_luong_byte` int unsigned NOT NULL,
  `dung_luong_goc_byte` int unsigned NOT NULL,
  `ngay_tao` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ma_so`),
  UNIQUE KEY `ten_tep_luu` (`ten_tep_luu`),
  KEY `idx_upload_owner` (`ma_chu_so_huu`,`ngay_tao`),
  CONSTRAINT `fk_upload_owner` FOREIGN KEY (`ma_chu_so_huu`) REFERENCES `tai_khoan` (`ma_so`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bao_gia_van_chuyen` (
  `ma_so` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ma_khach_hang` bigint unsigned NOT NULL,
  `ma_bang_cuoc` bigint unsigned NOT NULL,
  `du_lieu_chot` json NOT NULL,
  `ngay_het_han` datetime NOT NULL,
  `ngay_tao` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ma_so`),
  KEY `fk_quote_customer` (`ma_khach_hang`),
  KEY `fk_quote_rate` (`ma_bang_cuoc`),
  KEY `idx_quotes_expiry` (`ngay_het_han`),
  CONSTRAINT `fk_quote_customer` FOREIGN KEY (`ma_khach_hang`) REFERENCES `tai_khoan` (`ma_so`),
  CONSTRAINT `fk_quote_rate` FOREIGN KEY (`ma_bang_cuoc`) REFERENCES `bang_cuoc` (`ma_so`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `don_hang` (
  `ma_so` bigint unsigned NOT NULL AUTO_INCREMENT,
  `ma_van_don` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ma_khach_hang` bigint unsigned NOT NULL,
  `ma_nhan_vien` bigint unsigned DEFAULT NULL,
  `ma_dich_vu` bigint unsigned NOT NULL,
  `ten_nguoi_gui` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sdt_nguoi_gui` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dia_chi_nguoi_gui` varchar(700) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ten_nguoi_nhan` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sdt_nguoi_nhan` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dia_chi_nguoi_nhan` varchar(700) COLLATE utf8mb4_unicode_ci NOT NULL,
  `noi_dung_hang_hoa` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `khoi_luong` decimal(8,2) NOT NULL,
  `khu_vuc` enum('same_city','domestic') COLLATE utf8mb4_unicode_ci NOT NULL,
  `tien_thu_ho` decimal(12,0) NOT NULL DEFAULT '0',
  `cuoc_van_chuyen` decimal(12,0) NOT NULL,
  `nguoi_tra_cuoc` enum('sender','receiver') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'sender',
  `ghi_chu` varchar(1000) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `trang_thai` enum('pending','accepted','awaiting_pickup','picked_up','delivering','completed','incomplete','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `ngay_tao` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ngay_cap_nhat` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `ngay_giao_xong` datetime DEFAULT NULL,
  `ma_bang_cuoc` bigint unsigned DEFAULT NULL,
  `ma_bao_gia` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `loai_tuyen` enum('same_province','same_region','inter_region') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `thong_tin_lay_hang` json DEFAULT NULL,
  `thong_tin_giao_hang` json DEFAULT NULL,
  `chi_tiet_cuoc` json DEFAULT NULL,
  `quang_duong_met` int unsigned DEFAULT NULL,
  `nguon_quang_duong` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'legacy',
  `co_thu_ho` tinyint(1) NOT NULL DEFAULT '0',
  `co_bao_hiem` tinyint(1) NOT NULL DEFAULT '0',
  `co_dong_goi` tinyint(1) NOT NULL DEFAULT '0',
  `phi_thu_ho` decimal(12,0) NOT NULL DEFAULT '0',
  `phi_bao_hiem` decimal(12,0) NOT NULL DEFAULT '0',
  `phi_dong_goi` decimal(12,0) NOT NULL DEFAULT '0',
  `tong_thanh_toan` decimal(12,0) DEFAULT NULL,
  `ngay_nhan_don` datetime DEFAULT NULL,
  PRIMARY KEY (`ma_so`),
  UNIQUE KEY `ma_van_don` (`ma_van_don`),
  UNIQUE KEY `uk_order_quote` (`ma_bao_gia`),
  KEY `fk_orders_service` (`ma_dich_vu`),
  KEY `idx_orders_customer` (`ma_khach_hang`,`ngay_tao`),
  KEY `idx_orders_employee` (`ma_nhan_vien`,`trang_thai`),
  KEY `idx_orders_status` (`trang_thai`,`ngay_tao`),
  KEY `fk_order_rate` (`ma_bang_cuoc`),
  CONSTRAINT `fk_order_quote` FOREIGN KEY (`ma_bao_gia`) REFERENCES `bao_gia_van_chuyen` (`ma_so`),
  CONSTRAINT `fk_order_rate` FOREIGN KEY (`ma_bang_cuoc`) REFERENCES `bang_cuoc` (`ma_so`),
  CONSTRAINT `fk_orders_customer` FOREIGN KEY (`ma_khach_hang`) REFERENCES `tai_khoan` (`ma_so`),
  CONSTRAINT `fk_orders_employee` FOREIGN KEY (`ma_nhan_vien`) REFERENCES `tai_khoan` (`ma_so`),
  CONSTRAINT `fk_orders_service` FOREIGN KEY (`ma_dich_vu`) REFERENCES `dich_vu` (`ma_so`),
  CONSTRAINT `orders_chk_1` CHECK (((`khoi_luong` > 0) and (`tien_thu_ho` >= 0) and (`cuoc_van_chuyen` >= 0)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `lich_su_don_hang` (
  `ma_so` bigint unsigned NOT NULL AUTO_INCREMENT,
  `ma_don_hang` bigint unsigned NOT NULL,
  `ma_nguoi_thuc_hien` bigint unsigned NOT NULL,
  `trang_thai` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ghi_chu` varchar(1000) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `ngay_tao` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ma_so`),
  KEY `fk_events_actor` (`ma_nguoi_thuc_hien`),
  KEY `idx_events_order` (`ma_don_hang`,`ma_so`),
  CONSTRAINT `fk_events_actor` FOREIGN KEY (`ma_nguoi_thuc_hien`) REFERENCES `tai_khoan` (`ma_so`),
  CONSTRAINT `fk_events_order` FOREIGN KEY (`ma_don_hang`) REFERENCES `don_hang` (`ma_so`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `anh_don_hang` (
  `ma_so` bigint unsigned NOT NULL AUTO_INCREMENT,
  `ma_don_hang` bigint unsigned NOT NULL,
  `ma_tep_tai_len` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ma_lich_su` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`ma_so`),
  UNIQUE KEY `ma_tep_tai_len` (`ma_tep_tai_len`),
  KEY `fk_media_event` (`ma_lich_su`),
  KEY `idx_media_order` (`ma_don_hang`),
  CONSTRAINT `fk_media_event` FOREIGN KEY (`ma_lich_su`) REFERENCES `lich_su_don_hang` (`ma_so`),
  CONSTRAINT `fk_media_order` FOREIGN KEY (`ma_don_hang`) REFERENCES `don_hang` (`ma_so`),
  CONSTRAINT `fk_media_upload` FOREIGN KEY (`ma_tep_tai_len`) REFERENCES `tep_tai_len` (`ma_so`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `thong_bao` (
  `ma_so` bigint unsigned NOT NULL AUTO_INCREMENT,
  `ma_tai_khoan` bigint unsigned NOT NULL,
  `ma_don_hang` bigint unsigned DEFAULT NULL,
  `loai` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tieu_de` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `noi_dung` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ngay_doc` datetime DEFAULT NULL,
  `ngay_tao` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ma_so`),
  KEY `fk_notification_order` (`ma_don_hang`),
  KEY `idx_notification_user` (`ma_tai_khoan`,`ngay_doc`,`ma_so`),
  CONSTRAINT `fk_notification_order` FOREIGN KEY (`ma_don_hang`) REFERENCES `don_hang` (`ma_so`),
  CONSTRAINT `fk_notification_user` FOREIGN KEY (`ma_tai_khoan`) REFERENCES `tai_khoan` (`ma_so`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `danh_gia` (
  `ma_so` bigint unsigned NOT NULL AUTO_INCREMENT,
  `ma_don_hang` bigint unsigned NOT NULL,
  `ma_khach_hang` bigint unsigned NOT NULL,
  `ma_nhan_vien` bigint unsigned NOT NULL,
  `so_sao` tinyint unsigned NOT NULL,
  `binh_luan` varchar(1000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ngay_tao` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ma_so`),
  UNIQUE KEY `ma_don_hang` (`ma_don_hang`),
  KEY `fk_review_customer` (`ma_khach_hang`),
  KEY `idx_reviews_employee` (`ma_nhan_vien`,`ma_so`),
  CONSTRAINT `fk_review_customer` FOREIGN KEY (`ma_khach_hang`) REFERENCES `tai_khoan` (`ma_so`),
  CONSTRAINT `fk_review_employee` FOREIGN KEY (`ma_nhan_vien`) REFERENCES `tai_khoan` (`ma_so`),
  CONSTRAINT `fk_review_order` FOREIGN KEY (`ma_don_hang`) REFERENCES `don_hang` (`ma_so`),
  CONSTRAINT `reviews_chk_1` CHECK ((`so_sao` between 1 and 5))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bo_nho_dem_ban_do` (
  `khoa_bo_nho_dem` char(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `du_lieu` json NOT NULL,
  `ngay_het_han` datetime NOT NULL,
  PRIMARY KEY (`khoa_bo_nho_dem`),
  KEY `idx_map_cache_expiry` (`ngay_het_han`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

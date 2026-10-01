# Bảng đối chiếu tên CSDL

Tên bảng/cột vật lý dùng tiếng Việt không dấu, snake_case. Giá trị trạng thái/vai trò và khóa JSON API giữ nguyên. Khóa chính thông thường là `ma_so`; khóa ngoại mô tả đối tượng, ví dụ `ma_don_hang`.

Migration 005 thêm các bảng `tram_chuyen_phat`, `chuyen_trung_chuyen`, `kien_trung_chuyen`, `nhat_ky_kho` (không đổi tên từ bảng cũ). Xem [luồng kho và ý nghĩa dữ liệu](LOGISTICS.md).

| Khóa API mới | Cột MySQL |
|---|---|
| station_id | ma_tram |
| origin_station_id | ma_tram_gui |
| destination_station_id | ma_tram_dich |
| current_station_id | ma_tram_hien_tai |
| pickup_employee_id | ma_nv_lay_hang |
| delivery_employee_id | ma_nv_giao_hang |
| current_batch_id | ma_chuyen_hien_tai |
| batch_id | ma_chuyen |
| final_station_id | ma_tram_giao_cuoi |
| dispatched_at | ngay_xuat_kho |
| received_at | ngay_nhap_kho |
| fully_received_at | ngay_nhan_du |

| Tên bảng cũ | Tên bảng hiện tại |
|---|---|
| users | tai_khoan |
| services | dich_vu |
| orders | don_hang |
| order_events | lich_su_don_hang |
| schema_migrations | lich_su_nang_cap |
| provinces | tinh_thanh |
| employee_profiles | ho_so_nhan_vien |
| service_rates | bang_cuoc |
| addresses | dia_chi |
| uploads | tep_tai_len |
| shipping_quotes | bao_gia_van_chuyen |
| order_media | anh_don_hang |
| notifications | thong_bao |
| reviews | danh_gia |
| map_cache | bo_nho_dem_ban_do |

## tai_khoan

| Cột cũ / khóa API | Cột MySQL | Kiểu dữ liệu |
|---|---|---|
| id | ma_so | bigint unsigned |
| name | ten | varchar(120) |
| email | thu_dien_tu | varchar(190) |
| password_hash | mat_khau_bam | varchar(255) |
| phone | so_dien_thoai | varchar(20) |
| address | dia_chi_lien_he | varchar(500) |
| role | vai_tro | enum('admin','employee','customer') |
| active | dang_hoat_dong | tinyint(1) |
| token_version | phien_ban_token | int |
| created_at | ngay_tao | datetime |

## dich_vu

| Cột cũ / khóa API | Cột MySQL | Kiểu dữ liệu |
|---|---|---|
| id | ma_so | bigint unsigned |
| code | ma_dinh_danh | varchar(30) |
| name | ten | varchar(100) |
| description | mo_ta | varchar(255) |
| base_fee | cuoc_co_ban | decimal(12,0) |
| extra_half_kg | cuoc_them_nua_kg | decimal(12,0) |
| domestic_surcharge | phu_phi_ngoai_tinh | decimal(12,0) |
| estimated_days | thoi_gian_du_kien | varchar(30) |
| active | dang_hoat_dong | tinyint(1) |

## don_hang

| Cột cũ / khóa API | Cột MySQL | Kiểu dữ liệu |
|---|---|---|
| id | ma_so | bigint unsigned |
| tracking_code | ma_van_don | varchar(30) |
| customer_id | ma_khach_hang | bigint unsigned |
| employee_id | ma_nhan_vien | bigint unsigned |
| service_id | ma_dich_vu | bigint unsigned |
| sender_name | ten_nguoi_gui | varchar(120) |
| sender_phone | sdt_nguoi_gui | varchar(20) |
| sender_address | dia_chi_nguoi_gui | varchar(700) |
| receiver_name | ten_nguoi_nhan | varchar(120) |
| receiver_phone | sdt_nguoi_nhan | varchar(20) |
| receiver_address | dia_chi_nguoi_nhan | varchar(700) |
| package_name | noi_dung_hang_hoa | varchar(200) |
| weight | khoi_luong | decimal(8,2) |
| zone | khu_vuc | enum('same_city','domestic') |
| cod_amount | tien_thu_ho | decimal(12,0) |
| shipping_fee | cuoc_van_chuyen | decimal(12,0) |
| payer | nguoi_tra_cuoc | enum('sender','receiver') |
| note | ghi_chu | varchar(1000) |
| status | trang_thai | enum('pending','accepted','awaiting_pickup','picked_up','delivering','completed','incomplete','cancelled') |
| created_at | ngay_tao | datetime |
| updated_at | ngay_cap_nhat | datetime |
| delivered_at | ngay_giao_xong | datetime |
| rate_id | ma_bang_cuoc | bigint unsigned |
| quote_id | ma_bao_gia | char(36) |
| route_type | loai_tuyen | enum('same_province','same_region','inter_region') |
| pickup_snapshot | thong_tin_lay_hang | json |
| delivery_snapshot | thong_tin_giao_hang | json |
| pricing_snapshot | chi_tiet_cuoc | json |
| distance_meters | quang_duong_met | int unsigned |
| distance_source | nguon_quang_duong | varchar(30) |
| has_cod | co_thu_ho | tinyint(1) |
| has_insurance | co_bao_hiem | tinyint(1) |
| has_packaging | co_dong_goi | tinyint(1) |
| cod_fee | phi_thu_ho | decimal(12,0) |
| insurance_fee | phi_bao_hiem | decimal(12,0) |
| packaging_fee | phi_dong_goi | decimal(12,0) |
| total_amount | tong_thanh_toan | decimal(12,0) |
| accepted_at | ngay_nhan_don | datetime |

## lich_su_don_hang

| Cột cũ / khóa API | Cột MySQL | Kiểu dữ liệu |
|---|---|---|
| id | ma_so | bigint unsigned |
| order_id | ma_don_hang | bigint unsigned |
| actor_id | ma_nguoi_thuc_hien | bigint unsigned |
| status | trang_thai | varchar(30) |
| note | ghi_chu | varchar(1000) |
| created_at | ngay_tao | datetime |

## lich_su_nang_cap

| Cột cũ / khóa API | Cột MySQL | Kiểu dữ liệu |
|---|---|---|
| version | phien_ban | varchar(50) |
| applied_at | ngay_ap_dung | datetime |

Bổ sung `du_lieu JSON NULL` lưu định nghĩa khóa ngoại để có thể tiếp tục khi quá trình đổi tên bị gián đoạn.

## tinh_thanh

| Cột cũ / khóa API | Cột MySQL | Kiểu dữ liệu |
|---|---|---|
| code | ma_dinh_danh | char(2) |
| name | ten | varchar(100) |
| region | mien | enum('north','central','south') |

## ho_so_nhan_vien

| Cột cũ / khóa API | Cột MySQL | Kiểu dữ liệu |
|---|---|---|
| id | ma_so | bigint unsigned |
| user_id | ma_tai_khoan | bigint unsigned, NULL khi chưa có tài khoản |
| name | ten | varchar(120) |
| phone | so_dien_thoai | varchar(20) |
| address | dia_chi_lien_he | varchar(500) |
| employee_code | ma_nhan_vien_noi_bo | varchar(30) |
| hometown | que_quan | varchar(255) |
| identity_number | so_cccd | varchar(12) |
| hired_at | ngay_vao_lam | date |
| employment_status | trang_thai_lam_viec | enum('active','stopped') |
| created_at | ngay_tao | datetime |
| updated_at | ngay_cap_nhat | datetime |

## bang_cuoc

| Cột cũ / khóa API | Cột MySQL | Kiểu dữ liệu |
|---|---|---|
| id | ma_so | bigint unsigned |
| service_id | ma_dich_vu | bigint unsigned |
| route_type | loai_tuyen | enum('same_province','same_region','inter_region') |
| base_fee | cuoc_co_ban | decimal(12,0) |
| included_km | so_km_bao_gom | decimal(7,2) |
| extra_km_fee | don_gia_km_vuot | decimal(12,0) |
| included_weight | khoi_luong_bao_gom | decimal(7,2) |
| weight_step | buoc_khoi_luong | decimal(7,2) |
| extra_weight_fee | don_gia_khoi_luong_vuot | decimal(12,0) |
| cod_fee | phi_thu_ho | decimal(12,0) |
| insurance_fee | phi_bao_hiem | decimal(12,0) |
| packaging_fee | phi_dong_goi | decimal(12,0) |
| min_days | so_ngay_toi_thieu | int |
| max_days | so_ngay_toi_da | int |
| active | dang_hoat_dong | tinyint(1) |
| updated_at | ngay_cap_nhat | datetime |

## dia_chi

| Cột cũ / khóa API | Cột MySQL | Kiểu dữ liệu |
|---|---|---|
| id | ma_so | bigint unsigned |
| user_id | ma_tai_khoan | bigint unsigned |
| label | nhan_dia_chi | varchar(80) |
| contact_name | ten_lien_he | varchar(120) |
| phone | so_dien_thoai | varchar(20) |
| province_code | ma_tinh_thanh | char(2) |
| ward | xa_phuong | varchar(120) |
| village | thon_xom | varchar(120) |
| detail | dia_chi_chi_tiet | varchar(255) |
| latitude | vi_do | decimal(10,7) |
| longitude | kinh_do | decimal(10,7) |
| formatted_address | dia_chi_day_du | varchar(700) |
| is_default | la_mac_dinh | tinyint(1) |
| default_user_id | ma_tai_khoan_mac_dinh | bigint unsigned |
| created_at | ngay_tao | datetime |

## tep_tai_len

| Cột cũ / khóa API | Cột MySQL | Kiểu dữ liệu |
|---|---|---|
| id | ma_so | char(36) |
| owner_id | ma_chu_so_huu | bigint unsigned |
| purpose | muc_dich | enum('parcel','incident') |
| storage_name | ten_tep_luu | varchar(50) |
| mime_type | loai_noi_dung | varchar(30) |
| size_bytes | dung_luong_byte | int unsigned |
| original_size_bytes | dung_luong_goc_byte | int unsigned |
| created_at | ngay_tao | datetime |

## bao_gia_van_chuyen

| Cột cũ / khóa API | Cột MySQL | Kiểu dữ liệu |
|---|---|---|
| id | ma_so | char(36) |
| customer_id | ma_khach_hang | bigint unsigned |
| rate_id | ma_bang_cuoc | bigint unsigned |
| snapshot | du_lieu_chot | json |
| expires_at | ngay_het_han | datetime |
| created_at | ngay_tao | datetime |

## anh_don_hang

| Cột cũ / khóa API | Cột MySQL | Kiểu dữ liệu |
|---|---|---|
| id | ma_so | bigint unsigned |
| order_id | ma_don_hang | bigint unsigned |
| upload_id | ma_tep_tai_len | char(36) |
| event_id | ma_lich_su | bigint unsigned |

## thong_bao

| Cột cũ / khóa API | Cột MySQL | Kiểu dữ liệu |
|---|---|---|
| id | ma_so | bigint unsigned |
| user_id | ma_tai_khoan | bigint unsigned |
| order_id | ma_don_hang | bigint unsigned |
| type | loai | varchar(30) |
| title | tieu_de | varchar(150) |
| message | noi_dung | varchar(500) |
| read_at | ngay_doc | datetime |
| created_at | ngay_tao | datetime |

## danh_gia

| Cột cũ / khóa API | Cột MySQL | Kiểu dữ liệu |
|---|---|---|
| id | ma_so | bigint unsigned |
| order_id | ma_don_hang | bigint unsigned |
| customer_id | ma_khach_hang | bigint unsigned |
| employee_id | ma_nhan_vien | bigint unsigned |
| stars | so_sao | tinyint unsigned |
| comment | binh_luan | varchar(1000) |
| created_at | ngay_tao | datetime |

## bo_nho_dem_ban_do

| Cột cũ / khóa API | Cột MySQL | Kiểu dữ liệu |
|---|---|---|
| cache_key | khoa_bo_nho_dem | char(64) |
| payload | du_lieu | json |
| expires_at | ngay_het_han | datetime |

Nguồn ánh xạ: `Backend/src/config/database-names.js`. DDL hiện tại: `Backend/src/scripts/schema.sql`. Tên chỉ mục/constraint cũ có thể được giữ lại để thuận tiện truy vết; bảng và cột đều đã đổi tên.

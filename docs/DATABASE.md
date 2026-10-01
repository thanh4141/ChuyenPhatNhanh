# CSDL MySQL bằng tiếng Việt

Ứng dụng dùng **MySQL 8.0+, InnoDB, utf8mb4**. Sau migration 005 có 19 bảng, 41 khóa ngoại; tên bảng/cột dùng tiếng Việt không dấu, snake_case. Dữ liệu và các liên kết cũ được giữ khi nâng cấp. Xem [trạm, kho và trung chuyển](LOGISTICS.md).

## Bảng hiện tại

| Bảng | Nội dung |
|---|---|
| tai_khoan | Đăng nhập, liên hệ, vai trò, khóa tài khoản |
| ho_so_nhan_vien | Mã nhân viên, CCCD, quê quán, ngày vào làm |
| tram_chuyen_phat | Trạm duy nhất theo tỉnh/thành, địa chỉ kho |
| chuyen_trung_chuyen | Chuyến gom kiện cùng tỉnh giao cuối, trạm gửi/nhận, trạng thái xuất/nhận |
| kien_trung_chuyen | Danh sách kiện từng chuyến và thời điểm kiểm nhận mỗi kiện |
| nhat_ky_kho | Nhật ký nhập từ người lấy, xuất/nhập trung chuyển, xuất giao |
| dia_chi | Sổ địa chỉ lấy hàng, tọa độ, địa chỉ mặc định |
| tinh_thanh | 34 tỉnh và nhóm miền |
| dich_vu | Tiêu chuẩn, hỏa tốc |
| bang_cuoc | 2 dịch vụ × 3 tuyến, mức phí/khối lượng/thời gian |
| bao_gia_van_chuyen | Giá và địa chỉ đã chốt, hết hạn sau 10 phút |
| don_hang | Người gửi/nhận, hàng hóa, giá, tuyến, trạng thái |
| lich_su_don_hang | Lịch sử từng bước và lý do |
| tep_tai_len | Metadata, chủ sở hữu và mục đích ảnh |
| anh_don_hang | Ảnh gắn với đơn/lịch sử sự cố |
| thong_bao | Cập nhật trạng thái, lời mời đánh giá |
| danh_gia | Sao và bình luận cho nhân viên |
| bo_nho_dem_ban_do | Cache phản hồi bản đồ |
| lich_su_nang_cap | Phiên bản và dữ liệu phục hồi nâng cấp |

[Bảng đối chiếu từng cột cũ → mới](DATABASE-NAMES.md). Khóa chính thông thường là `ma_so`; khóa ngoại mô tả đối tượng như `ma_don_hang`, `ma_tai_khoan`. Không có bảng tính lương.

Mẫu SQLite được dùng làm cơ sở thiết kế: tài khoản và thông tin chung khách hàng gộp vào `tai_khoan`; hồ sơ nhân viên tách `ho_so_nhan_vien`; gói cước tách `dich_vu` và `bang_cuoc`. File SQLite ban đầu là DDL, không chứa dữ liệu cần nhập.

## Xem bằng MySQL Workbench

Máy phát triển: host 127.0.0.1, port 3307, schema chuyen_phat_nhanh. Lấy user/password trong Backend/.env. Bấm Refresh ở khung SCHEMAS sau khi nâng cấp.

```sql
USE chuyen_phat_nhanh;
SHOW TABLES;
DESCRIBE don_hang;
SELECT ma_so, ma_van_don, trang_thai, tong_thanh_toan FROM don_hang;
SELECT ma_so, ten, thu_dien_tu, vai_tro FROM tai_khoan;
SELECT * FROM bang_cuoc;
SELECT ma_so, ma_tai_khoan, dia_chi_day_du, la_mac_dinh FROM dia_chi;
```

## Nâng cấp an toàn

Dừng backend và các chương trình đang ghi dữ liệu trước khi nâng cấp. Giữ bản sao cả thư mục ảnh .local/uploads.

```powershell
npm.cmd --prefix Backend run db:backup
npm.cmd run db:migrate
npm.cmd start
```

- `schema.sql` là schema nền. Luôn chạy db:migrate để áp dụng cả các migration (đến 007), danh mục tỉnh, dịch vụ và 6 bảng cước.
- `legacy/schema.sql`, `legacy/workflow.sql` và migrations/workflow.js chỉ phục vụ nâng cấp từ phiên bản tiếng Anh, không phải DDL để tạo CSDL mới.
- Khi nhận ra bảng cũ, db:migrate tự sao lưu DDL + toàn bộ bản ghi vào .local/backups trước khi đổi. Không đổi/xóa đơn hàng hoặc tài khoản.
- Migration dùng GET_LOCK để không chạy hai bản nâng cấp cùng lúc. Trước khi tạm tháo khóa ngoại, lưu đầy đủ định nghĩa vào `lich_su_nang_cap.du_lieu` (lúc bảng còn tên cũ là schema_migrations.payload).
- Cột được đổi theo từng bảng; CHECK và biểu thức cột tính tự động được cập nhật trong cùng câu ALTER. Sau đó đổi tên bảng, gắn lại khóa ngoại và xác thực dữ liệu. Chỉ ghi `003_ten_tieng_viet` sau khi hoàn tất.
- Nếu bị ngắt, giữ backend dừng và chạy lại db:migrate. Bước đã xong được nhận biết; định nghĩa khóa ngoại đã lưu giúp tiếp tục cả khi tên bảng đã đổi. Backend kiểm tra phiên bản hoàn tất trước khi mở cổng.
- DDL MySQL tự commit; không thể coi cả migration là một transaction. Không xóa bảng lịch sử nâng cấp khi đang phục hồi.

## API và giá trị dữ liệu

Chỉ đổi tên vật lý bảng/cột. JSON API, URL, enum trạng thái/vai trò và nội dung JSON đã chốt giữ nguyên: ví dụ SQL `ma_van_don` trả API `tracking_code`, SQL `trang_thai` trả API `status`. Bởi vậy web, app và Swagger tiếp tục tương thích.

Các truy vấn nghiệp vụ ghi trực tiếp tên tiếng Việt. `config/database-names.js` đổi khóa hàng SQL về khóa API và đổi tên cột khi ghi các trường động đã được validation; không sửa chuỗi SQL khi chạy, không đổi nội dung người dùng.

Nếu nâng cấp từ phiên bản rất cũ, bước 002 trước đó đổi assigned → awaiting_pickup, in_transit/out_for_delivery → delivering, delivered → completed, failed → incomplete. Bước đổi tên 003 không đổi trạng thái hoặc giá trị bản ghi.

## Ràng buộc và tính cước

- Mã vận đơn, thư điện tử, mã nhân viên và CCCD đã nhập là duy nhất.
- `dia_chi.ma_tai_khoan_mac_dinh` là cột GENERATED + UNIQUE, giới hạn một địa chỉ mặc định cho mỗi tài khoản.
- Cân nặng DECIMAL(8,2), tiền VND DECIMAL(12,0), tọa độ DECIMAL(10,7). CHECK kiểm tra phí không âm, tọa độ và số sao.
- `don_hang.ma_bao_gia` là UNIQUE, tránh tạo trùng đơn khi gửi lại báo giá; `danh_gia.ma_don_hang` UNIQUE, mỗi đơn một đánh giá.
- Đơn giữ thông tin địa chỉ/giá/đường đi đã chốt trong JSON. Thay địa chỉ hoặc bảng giá không làm thay đổi đơn cũ.
- Các cột cước lịch sử trong dich_vu vẫn giữ; tính cước mới dùng bang_cuoc.
- Chỉ tính đường bộ từ điểm lấy đến điểm giao. Tiền hàng thu hộ tách khỏi tổng cước.

```text
phi_km = ceil(max(0, quang_duong_met - 5000) × don_gia_km_vuot / 1000)
so_buoc_can = ceil(max(0, khoi_luong - khoi_luong_bao_gom) / buoc_khoi_luong)
cuoc_van_chuyen = cuoc_co_ban + phi_km + so_buoc_can × don_gia_khoi_luong_vuot
tong_thanh_toan = cuoc_van_chuyen + phi_thu_ho + phi_bao_hiem + phi_dong_goi
```

Phụ phí chỉ cộng khi được chọn; bảo hiểm 9.900đ, đóng gói 5.000đ. Ví dụ 1,51kg, 6.321m, tiêu chuẩn kèm bảo hiểm/đóng gói: 38.863đ với giá minh họa. Nội tỉnh = cùng mã tỉnh; nội miền = khác tỉnh cùng nhóm; liên miền = khác nhóm.

## Kiểm tra

```powershell
npm.cmd --prefix Backend run test:migration
npm.cmd run test:integration
npm.cmd run test:ui
```

Kiểm thử tạo CSDL riêng, kiểm tra tạo mới, nâng cấp dữ liệu cũ, mô phỏng ngắt giữa chừng, phục hồi khóa ngoại/CHECK/cột mặc định và toàn bộ luồng API. Bản sao lưu CSDL và ảnh không được đưa lên Git.

## Nâng cấp 006

Chạy db:migrate: sao lưu trước khi thêm bảng khieu_nai và mục đích ảnh delivery vào tep_tai_len. Tổng cộng 20 bảng, 44 khóa ngoại. Bảng khieu_nai lưu đơn/khách/tiêu đề/nội dung/trạng thái/phản hồi/người xử lý và mốc thời gian, có UNIQUE (ma_don_hang,ma_khach_hang). Ảnh giao hàng gắn với lich_su_don_hang bằng anh_don_hang.ma_lich_su, giữ ảnh riêng tư. Dữ liệu lịch sử giữ nguyên.

Truy vấn danh sách chỉ chọn cột tóm tắt, tránh sắp xếp JSON tuyến đường lớn gây ER_OUT_OF_SORTMEMORY. Chi tiết đơn vẫn giữ chi_tiet_cuoc đầy đủ.

## Nâng cấp 007

tram_chuyen_phat thêm vi_do, kinh_do (nullable cho trạm cũ, CHECK cả cặp hoặc cùng NULL); don_hang thêm quang_duong_tram_lay_met. Không tự bịa tọa độ hay phân lại đơn lịch sử. Vẫn 20 bảng, 44 khóa ngoại. Sau nâng cấp, Admin ghim vị trí trạm rồi tính lại trạm lấy cho đơn đang chờ có vị trí lấy/giao.

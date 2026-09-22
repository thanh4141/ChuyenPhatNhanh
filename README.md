# Chuyển Phát Nhanh · CPN

Hệ thống **MySQL 8 + API Node.js/Express**, web quản lí **HTML/CSS/JS**, app nhân viên và khách hàng **React Native/Expo (.tsx)**. Không có chức năng tính lương.

## Cấu trúc

```text
Backend/src/
  common/       JWT, phân quyền, validation, xử lý lỗi
  config/       MySQL, môi trường, danh mục tỉnh
  modules/      auth, users, employees, addresses, services,
                orders, media, notifications, maps, dashboard
  routes/       Ghép các API
  scripts/      schema.sql, workflow.sql, migrations/, migrate, seed, backup
  server.js
Admin/          index.html, css/, js/, maps/ (Leaflet)
Mobile/src/     screens/*.tsx, components/, context/, services/, types/
docs/           DATABASE.md, API.md, MAPS.md
scripts/        Khởi động MySQL local trên Windows
```

## Chức năng

| Vai trò | Chức năng |
|---|---|
| Admin | Tổng quan; bảng cước 3 tuyến × 2 dịch vụ; 2 cửa sổ tài khoản khách/nhân viên; khóa/mở khách; thêm/sửa nhân viên; tìm/thêm/sửa hồ sơ nhân viên; **chỉ xem đơn hàng** |
| Nhân viên | Xem đơn chờ, tự nhận đơn; cập nhật từng bước; báo sự cố bằng lý do và ảnh ≤15 MB; hồ sơ, đổi mật khẩu, thống kê hoàn thành/thất bại, sao và bình luận |
| Khách hàng | Chụp/chọn ảnh, mô tả/cân nặng; sổ địa chỉ và ghim bản đồ; báo cước đường bộ; COD/bảo hiểm/đóng gói; tạo đơn, lịch sử, hủy trước lấy hàng; thông báo và đánh giá; hồ sơ/mật khẩu |

```text
Chờ nhận → Đã nhận → Chờ lấy hàng → Đã lấy hàng → Đang giao
                                                    ├─ Hoàn thành → Đánh giá
                                                    └─ Chưa hoàn thành → Lý do + ảnh
```

Khách được hủy ở Chờ nhận, Đã nhận, Chờ lấy hàng. Các trạng thái kết thúc không mở lại. Nhận/cập nhật đơn dùng transaction và khóa dòng MySQL. Một đơn hoàn thành chỉ có một đánh giá từ chủ đơn. Thông báo được lưu trong MySQL và làm mới mỗi 15 giây khi mở màn hình Thông báo; chưa phải push notification khi đóng app.

## Chạy trên máy

Cần Node.js ≥22.13 và MySQL 8.0+. Chạy trong thư mục dự án:

```powershell
npm.cmd run setup
# Chỉ tạo .env nếu chưa có:
Copy-Item Backend/.env.example Backend/.env
```

Điền thông tin MySQL và JWT trong `Backend/.env`. Tạo chuỗi JWT ngẫu nhiên bằng `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Đặt `SEED_ADMIN_PASSWORD`; nếu muốn tài khoản/đơn mẫu, bật `SEED_DEMO=true` và đặt `SEED_DEMO_PASSWORD`.

```powershell
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd start
```

Admin: **http://localhost:3000**. Health: **http://localhost:3000/api/health**.

Trên máy Windows hiện tại đã có MySQL riêng tại **127.0.0.1:3307**, CSDL **chuyen_phat_nhanh**, dữ liệu `.local/mysql-data`. Khởi động lại nếu cần:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-local-mysql.ps1
# Dừng riêng MySQL của dự án:
npm.cmd run db:local:stop
```

Xem CSDL bằng MySQL Workbench: tạo connection host `127.0.0.1`, port `3307`, user/password trong `Backend/.env`, rồi chọn schema `chuyen_phat_nhanh`. Nếu dùng MySQL khác thì lấy host/port theo `.env`.

```sql
USE chuyen_phat_nhanh;
SHOW TABLES;
SELECT id, tracking_code, status, total_amount FROM orders;
SELECT * FROM service_rates;
```

## Chạy app

```powershell
npm.cmd --prefix Mobile start
```

`Mobile/.env` có `EXPO_PUBLIC_API_URL`: trình duyệt cùng máy dùng `http://localhost:3000/api`, Android Emulator dùng `http://10.0.2.2:3000/api`, điện thoại thật dùng IPv4 máy tính cùng Wi-Fi. Sau khi đổi phải khởi động lại Expo. Cho phép cổng API trong tường lửa khi thử điện thoại.

Xuất app web để thử:

```powershell
npm.cmd --prefix Mobile run export:web
npm.cmd run preview:mobile
```

Mở **http://localhost:8081**. Mobile native lưu token bằng SecureStore; bản web giữ trong bộ nhớ nên tải lại trang sẽ phải đăng nhập lại.

Tài khoản mẫu trên máy phát triển này:

| Vai trò | Email | Mật khẩu mẫu |
|---|---|---|
| Admin | admin@chuyenphat.vn | Admin@12345 |
| Nhân viên | nhanvien@chuyenphat.vn | Demo@12345 |
| Khách hàng | khachhang@chuyenphat.vn | Demo@12345 |

Seed không đổi mật khẩu tài khoản đã tồn tại. Thông tin mẫu chỉ dành cho thử nghiệm; đặt mật khẩu riêng khi triển khai.

## Bản đồ miễn phí

Mặc định **OpenStreetMap + Leaflet + OSRM**, không cần API key, không dùng Google Maps. Quãng đường lấy từ tuyến đường bộ ô tô OSRM, **chỉ điểm lấy → điểm giao**. Lưu đường đi đầy đủ để hiển thị trong báo giá và chi tiết đơn.

Xác minh tỉnh thực hiện tại backend bằng bộ ranh giới 34 tỉnh đi kèm. Tìm tên tỉnh không cần dịch vụ geocoding; tìm tên đường/địa danh dùng Photon. Nếu Photon gián đoạn, vẫn đặt ghim trực tiếp, nhập địa chỉ và báo cước được.

Các máy chủ cộng đồng giới hạn lưu lượng, không cam kết hoạt động liên tục hoặc dữ liệu mới tức thời. Dữ liệu đường đi cập nhật theo máy chủ OSRM; không bao gồm giao thông thời gian thực. Xem [cấu hình, giới hạn và cách tự chạy](docs/MAPS.md).

## Cước minh họa và dữ liệu cũ

Tiêu chuẩn 15.000đ, hỏa tốc 30.000đ; bao gồm 5 km/1 kg đầu. Mỗi km vượt 3.000đ, mỗi 0,5 kg vượt 2.500đ; bảo hiểm 9.900đ, đóng gói 5.000đ khi chọn. Các mức cơ bản/vượt/ETA được sửa riêng cho từng tuyến trên Admin. Tiền hàng COD tách khỏi tổng cước.

Dữ liệu MySQL cũ được giữ lại. Đơn cũ giữ số tiền; trạng thái chuyển tương ứng và hiển thị chưa có quãng đường nếu trước đây không lưu. File SQLite của bạn dùng làm mẫu thiết kế, không phải CSDL chạy app. [Thiết kế và nâng cấp MySQL](docs/DATABASE.md).

## Kiểm tra

```powershell
npm.cmd test
npm.cmd run test:integration
npm.cmd run typecheck
npm.cmd --prefix Mobile run export:web
npm.cmd run test:ui
npx.cmd --prefix Mobile expo export --platform android --output-dir Mobile/dist-android
```

Kiểm thử API/UI tạo MySQL schema `cpn_test_*` / `cpn_ui_*` riêng và chỉ xóa schema của lần chạy. Test UI cần Chrome, cổng 3000/8081 trống và bản export web mới. Các tuyến trong kiểm thử tự động dùng fixture xác định; kiểm tra máy chủ OSRM thực hiện riêng, không thay dữ liệu sản xuất bằng quãng đường giả.

Ảnh thử giao diện ở `.local/review`. Android export là bundle, không phải APK và không thay thế kiểm thử camera/WebView trên thiết bị thật.

Tài liệu: [API](docs/API.md), [CSDL](docs/DATABASE.md), [Bản đồ](docs/MAPS.md), [Mobile](Mobile/README.md).

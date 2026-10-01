# Chuyển Phát Nhanh · CPN

Hệ thống **MySQL 8 + API Node.js/Express**, web quản lí **HTML/CSS/JS**, app nhân viên và khách hàng **React Native/Expo (.tsx)**. Không có chức năng tính lương.

Đã có **Quản lý trạm**, kho theo tỉnh, tách nhân viên lấy/giao và gom chuyến trung chuyển. Xem [hướng dẫn thiết lập và vận hành kho](docs/LOGISTICS.md). Admin phải tạo/ghim vị trí các trạm và gán nhân viên. Trạm lấy được chọn theo khoảng cách đường bộ gần nhất, có thể ở tỉnh khác; chỉ nhân viên thuộc trạm đó thấy đơn chờ. Trạm giao cũng được chọn theo đường bộ gần người nhận nhất, có thể phục vụ tỉnh khác; tỉnh không có kho vẫn đặt đơn được.

## Cấu trúc

```text
Backend/src/
  common/       JWT, phân quyền, validation, xử lý lỗi
  config/       MySQL, môi trường, danh mục tỉnh
  modules/      auth, users, employees, addresses, services,
                orders, media, notifications, maps, dashboard, logistics, complaints
  routes/       Ghép các API
  scripts/      schema.sql, legacy/, migrations/, migrate, seed, backup
  server.js
Admin/          index.html, css/, js/, maps/ (MapLibre)
Mobile/src/     screens/*.tsx, components/, context/, services/, types/
docs/           DATABASE.md, API.md, MAPS.md
scripts/        Khởi động MySQL local trên Windows
```

## Chức năng

| Vai trò    | Chức năng                                                                                                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Admin      | Tổng quan; bảng cước 3 tuyến × 2 dịch vụ; 2 cửa sổ tài khoản khách/nhân viên; khóa/mở khách; thêm/sửa nhân viên; tìm/thêm/sửa hồ sơ nhân viên; **chỉ xem đơn hàng**             |
| Nhân viên  | Xem đơn chờ, tự nhận đơn; cập nhật từng bước; báo sự cố bằng lý do và ảnh ≤15 MB; hồ sơ, đổi mật khẩu, thống kê hoàn thành/thất bại, sao và bình luận                           |
| Khách hàng | Chụp/chọn ảnh, mô tả/cân nặng; sổ địa chỉ và ghim bản đồ; báo cước đường bộ; COD/bảo hiểm/đóng gói; tạo đơn, lịch sử, hủy trước lấy hàng; thông báo và đánh giá; hồ sơ/mật khẩu |

```text
Nội tỉnh: Lấy hàng → Đang giao → Hoàn thành (ảnh bằng chứng) / Sự cố (lý do + ảnh)
Khác tỉnh: Lấy hàng → Kho gửi → Gom/xuất chuyến → [Kho trung gian] → Kho đích
          → Phân công người giao → Đang giao → Hoàn thành / Sự cố
```

Khách được hủy ở Chờ nhận, Đã nhận, Chờ lấy hàng. Các trạng thái kết thúc không mở lại. Nhận/cập nhật đơn dùng transaction và khóa dòng MySQL. Một đơn hoàn thành chỉ có một đánh giá từ chủ đơn. Thông báo được lưu trong MySQL và làm mới mỗi 15 giây khi mở màn hình Thông báo; chưa phải push notification khi đóng app.

Khách có thể gửi khiếu nại trong chi tiết đơn. Admin/quản lý trạm xử lý ở **Khiếu nại**, phản hồi được thông báo cho khách. Nhân viên phải chụp ảnh bằng chứng trước khi hoàn thành giao hàng. Xem [luồng vận hành](docs/LOGISTICS.md).

## Chạy trên máy

Cần Node.js ≥22.13 và MySQL 8.0+. Chạy trong thư mục dự án:

```powershell
npm.cmd run setup
if (-not (Test-Path Backend/.env)) { Copy-Item Backend/.env.example Backend/.env }
```

Điền thông tin MySQL và JWT trong `Backend/.env`. Tạo chuỗi JWT ngẫu nhiên bằng `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Đặt `SEED_ADMIN_PASSWORD`; nếu muốn tài khoản/đơn mẫu, bật `SEED_DEMO=true` và đặt `SEED_DEMO_PASSWORD`.

```powershell
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd start
```

Admin: **http://localhost:3000**. Health: **http://localhost:3000/api/health**.

Swagger xem và thử API: **http://localhost:3000/api-docs/**. Đăng nhập bằng `POST /auth/login`, sao chép `token` vào **Authorize** (không thêm `Bearer`), rồi thử API theo vai trò. [Hướng dẫn API](docs/API.md).

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
SELECT ma_so, ma_van_don, trang_thai, tong_thanh_toan FROM don_hang;
SELECT * FROM bang_cuoc;
```

## Chạy app

```powershell
npm.cmd --prefix Mobile start
```

`Mobile/.env`: để trống `EXPO_PUBLIC_API_URL` để Expo Go tự lấy IP máy tính từ mạng hiện tại. Khi đổi Wi-Fi, mở lại Expo bằng `npx expo start --lan --clear --port 8082` trong Mobile và quét QR mới. Điện thoại phải truy cập được API cổng 3000; Wi-Fi trường chặn thiết bị thì dùng điểm phát sóng chung. Bản build độc lập cần URL API riêng. [Chi tiết](Mobile/README.md).

Xuất app web để thử:

```powershell
npm.cmd --prefix Mobile run export:web
npm.cmd run preview:mobile
```

Mở **http://localhost:8081**. Mobile native lưu token bằng SecureStore; bản web giữ trong bộ nhớ nên tải lại trang sẽ phải đăng nhập lại.

Tài khoản mẫu trên máy phát triển này:

| Vai trò    | Email                   | Mật khẩu mẫu |
| ---------- | ----------------------- | ------------ |
| Admin      | admin@chuyenphat.vn     | Admin@12345  |
| Nhân viên  | nhanvien@chuyenphat.vn  | Demo@12345   |
| Khách hàng | khachhang@chuyenphat.vn | Demo@12345   |

Seed không đổi mật khẩu tài khoản đã tồn tại. Thông tin mẫu chỉ dành cho thử nghiệm; đặt mật khẩu riêng khi triển khai.

## Bản đồ miễn phí

Mặc định **OpenFreeMap/OpenStreetMap + MapLibre + OSRM**, không cần API key, không dùng Google Maps. Quãng đường lấy từ tuyến đường bộ ô tô OSRM, **chỉ điểm lấy → điểm giao**. Lưu đường đi đầy đủ để hiển thị trong báo giá và chi tiết đơn.

Xác minh tỉnh thực hiện tại backend bằng bộ ranh giới 34 tỉnh đi kèm. Tìm tên tỉnh không cần dịch vụ geocoding; tìm tên đường/địa danh dùng Photon. Nếu Photon gián đoạn, vẫn đặt ghim trực tiếp, nhập địa chỉ và báo cước được.

Các máy chủ cộng đồng giới hạn lưu lượng, không cam kết hoạt động liên tục hoặc dữ liệu mới tức thời. Dữ liệu đường đi cập nhật theo máy chủ OSRM; không bao gồm giao thông thời gian thực. Xem [cấu hình, giới hạn và cách tự chạy](docs/MAPS.md).

## Cước minh họa và dữ liệu cũ

Tiêu chuẩn 15.000đ, hỏa tốc 30.000đ; bao gồm 5 km/1 kg đầu. Mỗi km vượt 3.000đ, mỗi 0,5 kg vượt 2.500đ; bảo hiểm 9.900đ, đóng gói 5.000đ khi chọn. Các mức cơ bản/vượt/ETA được sửa riêng cho từng tuyến trên Admin. Tiền hàng COD tách khỏi tổng cước.

Tên bảng/cột MySQL dùng tiếng Việt không dấu, ví dụ `tai_khoan`, `don_hang`, `ma_van_don`. [Bảng đối chiếu đầy đủ](docs/DATABASE-NAMES.md). API/Swagger giữ khóa JSON cũ để web và app tương thích.

Dữ liệu MySQL cũ được giữ lại. Đơn cũ giữ số tiền; trạng thái chuyển tương ứng và hiển thị chưa có quãng đường nếu trước đây không lưu. File SQLite của bạn dùng làm mẫu thiết kế, không phải CSDL chạy app. [Thiết kế và nâng cấp MySQL](docs/DATABASE.md).

## Kiểm tra

```powershell
npm.cmd test
npm.cmd run test:integration
npm.cmd --prefix Backend run test:migration
npm.cmd run typecheck
npm.cmd --prefix Mobile run export:web
npm.cmd run test:ui
Push-Location Mobile
npx.cmd expo export --platform android --output-dir dist-android
Pop-Location
```

Kiểm thử API/UI tạo MySQL schema `cpn_test_*` / `cpn_ui_*` riêng và chỉ xóa schema của lần chạy. Test UI cần Chrome, cổng 3000/8081 trống và bản export web mới. Các tuyến trong kiểm thử tự động dùng fixture xác định; kiểm tra máy chủ OSRM thực hiện riêng, không thay dữ liệu sản xuất bằng quãng đường giả.

Ảnh thử giao diện ở `.local/review`. Android export là bundle, không phải APK và không thay thế kiểm thử camera/WebView trên thiết bị thật.

Tài liệu: [API](docs/API.md), [CSDL](docs/DATABASE.md), [Bản đồ](docs/MAPS.md), [Mobile](Mobile/README.md).

## Tạo tài khoản từ hồ sơ nhân viên

1. Trong **Hồ sơ nhân viên**, thêm họ tên, số điện thoại, địa chỉ và thông tin công việc. Hồ sơ có thể chưa có tài khoản.
2. Trong **Tài khoản → Thêm nhân viên**, chọn hồ sơ rồi nhập email và mật khẩu. Tên và thông tin liên hệ lấy từ hồ sơ.
3. Chỉ chọn được hồ sơ đang làm việc, chưa liên kết tài khoản; mỗi hồ sơ chỉ có một tài khoản.

API: `GET /api/employees?available=1`, sau đó `POST /api/users` với `{profile_id, email, password}`. Sau khi cập nhật mã, dừng backend và chạy `npm --prefix Backend run db:migrate` trước khi mở lại. Migration 004 tự sao lưu, giữ tài khoản/hồ sơ cũ và cho phép hồ sơ chưa có tài khoản.

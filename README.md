# Chuyển Phát Nhanh · CPN

Ứng dụng chuyển phát nhanh gồm **API Node.js/Express + MySQL**, **web Admin HTML/CSS/JavaScript** và **app React Native/Expo viết bằng TypeScript `.tsx`** cho khách hàng và nhân viên.

## Cấu trúc

```text
ChuyenPhatNhanh/
├── Backend/
│   ├── src/
│   │   ├── common/          # JWT, phân quyền, kiểm tra dữ liệu, xử lý lỗi
│   │   ├── config/          # Biến môi trường, connection pool MySQL
│   │   ├── modules/
│   │   │   ├── auth/        # Đăng nhập, đăng ký, hồ sơ, đổi mật khẩu
│   │   │   ├── dashboard/   # Tổng quan vận hành
│   │   │   ├── orders/      # Đơn hàng, phân công, trạng thái
│   │   │   ├── services/    # Dịch vụ và cước phí
│   │   │   └── users/       # Nhân viên, khách hàng
│   │   ├── routes/
│   │   ├── scripts/         # schema.sql, migrate, seed
│   │   ├── app.js
│   │   └── server.js
│   ├── test/
│   ├── .env.example
│   ├── Constructor.md
│   ├── package.json
│   └── package-lock.json
├── Admin/
│   ├── assets/
│   ├── css/
│   ├── js/
│   └── index.html
├── Mobile/
│   ├── assets/
│   ├── scripts/
│   ├── src/
│   │   ├── components/
│   │   ├── config/
│   │   ├── context/
│   │   ├── screens/         # Các màn hình .tsx
│   │   ├── services/
│   │   ├── types/
│   │   └── App.tsx
│   ├── App.tsx
│   ├── index.ts
│   ├── app.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── package.json
│   └── package-lock.json
├── docs/                    # API, mô hình dữ liệu
├── scripts/                 # MySQL riêng cho môi trường Windows
├── package.json
└── README.md
```

## Chức năng theo vai trò

| Chức năng | Admin — web | Nhân viên — app | Khách hàng — app |
|---|---|---|---|
| Đăng nhập, sửa hồ sơ, đổi mật khẩu | Có | Có | Có |
| Đăng ký tài khoản | Tạo bằng seed | Admin tạo tài khoản | Tự đăng ký |
| Danh sách và chi tiết đơn | Tất cả | Đơn được phân công | Đơn của mình |
| Tạo đơn, tính cước, COD | Tạo cho khách hàng | — | Có |
| Phân công / đổi nhân viên | Có | — | — |
| Cập nhật lấy, vận chuyển, giao hàng | Có | Đơn được phân công | — |
| Hủy đơn | Theo quy trình trạng thái | — | Khi chờ xác nhận |
| Tra cứu theo mã vận đơn | Có | Có | Có |
| Quản lí nhân viên và khách hàng | Tạo, sửa, khóa/mở | — | — |
| Bảng cước | Xem, chỉnh sửa, bật/tắt | — | Xem khi tạo đơn |
| Tổng quan, doanh thu cước, CSV | Có | — | — |

**Không có chức năng tính lương nhân viên.** Doanh thu cước được tính từ đơn giao thành công; COD là khoản thu hộ được lưu riêng, chưa phải nghiệp vụ đối soát hay xác nhận chuyển tiền.

## Chạy nhanh trên máy Windows này

Đã có MySQL 8 và Node.js trên máy. Dự án có thể dùng MySQL riêng tại `127.0.0.1:3307`; dữ liệu đặt trong `.local/mysql-data`, không thay đổi dịch vụ MySQL đang có ở cổng 3306. Mật khẩu MySQL riêng và khóa JWT được tạo ngẫu nhiên, lưu trong các file đã bị `.gitignore` loại trừ.

Tại thư mục gốc, mở PowerShell:

```powershell
# Chỉ cần cài khi mới tải dự án hoặc chưa có node_modules
npm.cmd run setup

# Khởi động / khởi tạo MySQL riêng. Script không ghi đè Backend/.env đã có.
powershell -ExecutionPolicy Bypass -File scripts/start-local-mysql.ps1

# Tạo bảng và dữ liệu mẫu (có thể chạy lại)
npm.cmd run db:migrate
npm.cmd run db:seed

# Chạy cả API và web Admin
npm.cmd start
```

Mở **http://localhost:3000** để sử dụng Admin. API kiểm tra kết nối: **http://localhost:3000/api/health**.

Tài khoản minh họa khi dùng script MySQL riêng và seed:

| Vai trò | Email | Mật khẩu minh họa |
|---|---|---|
| Admin | `admin@chuyenphat.vn` | `Admin@12345` |
| Nhân viên | `nhanvien@chuyenphat.vn` | `Demo@12345` |
| Khách hàng | `khachhang@chuyenphat.vn` | `Demo@12345` |

Seed tạo 12 đơn với nhiều trạng thái để xem ngay giao diện. Ví dụ mã tra cứu: `CPNDEMO000001`. Seed giữ nguyên tài khoản và đơn đã tồn tại; thay đổi mật khẩu trong `.env` không đổi mật khẩu tài khoản cũ. Dùng chức năng **Đổi mật khẩu** để thay mật khẩu đã tạo.

Dừng API bằng `Ctrl+C`. Dừng MySQL riêng bằng `npm.cmd run db:local:stop`; dữ liệu vẫn được giữ để sử dụng lần sau.

## Dùng MySQL có sẵn hoặc trên máy khác

Yêu cầu Node.js từ 22.13, MySQL 8.0 trở lên. React Native/Expo được ghép phiên bản theo [bảng tương thích Expo SDK](https://docs.expo.dev/versions/latest/).

1. Chạy `npm.cmd run setup` tại thư mục gốc.
2. Sao chép `Backend/.env.example` thành `Backend/.env` (nếu chưa có).
3. Điền `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` theo MySQL của bạn.
4. Tạo `JWT_SECRET` bằng lệnh dưới và điền vào `.env`:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

5. Điền `SEED_ADMIN_PASSWORD`. Muốn dữ liệu mẫu, đặt `SEED_DEMO=true` và điền `SEED_DEMO_PASSWORD`.
6. Chạy `npm.cmd run db:migrate`, `npm.cmd run db:seed`, rồi `npm.cmd start`.

Tài khoản chạy migrate cần quyền tạo CSDL và bảng; tài khoản chạy API chỉ cần quyền thao tác dữ liệu trên CSDL của ứng dụng. File SQL nằm tại `Backend/src/scripts/schema.sql`; có thể tạo CSDL, chọn schema trong MySQL Workbench rồi chạy file SQL, sau đó vẫn chạy migrate để nạp hai dịch vụ ban đầu.

## Chạy app `.tsx`

Mở terminal thứ hai, giữ API đang chạy:

```powershell
# Chỉ sao chép khi chưa có Mobile/.env
Copy-Item Mobile/.env.example Mobile/.env
npm.cmd run mobile
```

Điền `EXPO_PUBLIC_API_URL` trong `Mobile/.env` theo thiết bị:

| Thiết bị chạy app | Giá trị API |
|---|---|
| Trình duyệt trên máy đang chạy API | `http://localhost:3000/api` |
| Android Emulator | `http://10.0.2.2:3000/api` |
| Điện thoại thật cùng mạng Wi-Fi | `http://<IPv4-của-máy-tính>:3000/api` |

Lấy IPv4 bằng `ipconfig`. Ví dụ máy tính có IP `192.168.1.20` thì nhập `http://192.168.1.20:3000/api`. Khởi động lại Expo sau khi sửa `.env`. Trên điện thoại thật, `localhost` là điện thoại, vì vậy cần dùng IP máy tính. Cho phép Node.js qua Windows Firewall trên mạng riêng nếu thiết bị không truy cập API.

- Quét QR bằng Expo Go tương thích SDK 57 để mở trên thiết bị Android/iOS; xem [hướng dẫn Expo](https://docs.expo.dev/get-started/start-developing/).
- Nhấn `w` trong terminal Expo hoặc chạy `npm.cmd --prefix Mobile run web` để mở bản web kiểm tra của app.
- Với bundle đã xuất bằng `npm.cmd --prefix Mobile run export:web`, có thể chạy `npm.cmd run preview:mobile` để xem app tại **http://localhost:8081**. API vẫn cần chạy ở cổng 3000.
- App Android/iOS dùng SecureStore cho token đăng nhập; bản web giữ token trong bộ nhớ và yêu cầu đăng nhập lại khi tải lại trang.

## Quy trình một đơn hàng

```text
Khách tạo đơn → Chờ xác nhận
Admin phân công → Chờ lấy hàng
Nhân viên → Đã lấy hàng → Đang vận chuyển → Đang giao hàng
                                                  ├─ Giao thành công
                                                  └─ Giao thất bại → Đang giao hàng (giao lại)
```

Khách được hủy đơn của mình khi **Chờ xác nhận**. Admin có thể hủy khi **Chờ xác nhận**, **Chờ lấy hàng** hoặc **Giao thất bại**. Hủy/giao thất bại bắt buộc nhập lý do. Đơn đã giao thành công hoặc đã hủy không được mở lại. Nhân viên đang giữ đơn chưa kết thúc phải được phân công lại/hoàn thành đơn trước khi khóa tài khoản.

Quyền truy cập được kiểm tra ở API. Cước do máy chủ tính, không nhận giá do client tự gửi. Thay đổi bảng cước chỉ ảnh hưởng đơn mới. Các thao tác phân công và đổi trạng thái dùng transaction + khóa dòng để tránh ghi trùng khi cập nhật đồng thời. Lịch sử lưu UTC; thống kê theo ngày Việt Nam.

## Kiểm thử

```powershell
npm.cmd test                       # 5 kiểm thử nghiệp vụ
npm.cmd run test:integration       # 12 kiểm thử API với MySQL thật
npm.cmd run typecheck              # Kiểm tra TypeScript app
npm.cmd --prefix Mobile run export:web
npm.cmd run test:ui                # Chrome headless: Admin + app Expo web
```

Kiểm thử tích hợp và giao diện tạo CSDL tạm có tên `cpn_test_*` / `cpn_ui_*`, chỉ xóa đúng CSDL vừa tạo khi kết thúc. Tài khoản MySQL dùng để kiểm thử cần quyền tạo/xóa schema tạm. `test:ui` cần Chrome, bản export web của app, và cổng 3000/8081 đang trống; dừng server phát triển trước khi chạy. Có thể đặt `PLAYWRIGHT_CHANNEL=msedge` nếu dùng Edge. Ảnh kiểm tra lưu trong `.local/review`.

Đã kiểm tra luồng Admin tạo/phân công đơn, khách tạo/hủy đơn, nhân viên giao hàng và tra cứu trên trình duyệt. Kiểm tra Android bundle không thay thế kiểm thử trực tiếp trên thiết bị hoặc build APK/IPA.

Tài liệu chi tiết: [API](docs/API.md), [mô hình dữ liệu](docs/DATABASE.md), [cấu trúc Backend](Backend/Constructor.md), [app Mobile](Mobile/README.md).

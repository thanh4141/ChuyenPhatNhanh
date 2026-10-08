# TỔNG HỢP CẤU TRÚC VÀ ĐƯỜNG DẪN MÃ NGUỒN (SOURCE CODE MAP)

Tài liệu này tổng hợp danh sách các file mã nguồn (Source Code) quan trọng của hệ thống Chuyển Phát Nhanh, được phân loại theo chức năng (Backend) và giao diện (Frontend - Mobile & Web Admin) để thuận tiện cho việc tra cứu và đối chiếu với thiết kế.

---

## 1. MÃ NGUỒN BACKEND (LOGIC CHỨC NĂNG - NODE.JS)
Tất cả mã nguồn xử lý logic (API, Controller, truy vấn CSDL) được đặt tại thư mục `Backend/src/modules/`.

| Chức năng chính | Đường dẫn thư mục mã nguồn | Mô tả chi tiết |
| :--- | :--- | :--- |
| **Xác thực & Phân quyền** | `Backend/src/modules/auth/` | Xử lý đăng nhập, cấp phát và xác thực JWT token (Khách hàng, Shipper, Admin). |
| **Quản lý Đơn hàng** | `Backend/src/modules/orders/` | Xử lý tạo đơn, tính cước phí, cập nhật trạng thái đơn (Lấy/Giao), ghi nhận lịch sử hành trình. |
| **Vận hành & Logistic** | `Backend/src/modules/logistics/` | Chứa logic của Quản lý trạm: Quét mã nhập/xuất kho, gom chuyến xe trung chuyển, phân công Shipper. |
| **Nhân sự (Shipper)** | `Backend/src/modules/employees/` | Quản lý hồ sơ nhân viên, trạng thái hoạt động (Online/Offline) của Shipper. |
| **Quản lý Người dùng** | `Backend/src/modules/users/` | Quản trị tài khoản, khóa/mở khóa tài khoản (dành cho Admin). |
| **Bảng Cước phí** | `Backend/src/modules/services/` | Logic tính toán, truy xuất và cập nhật cấu hình Bảng giá cước vận chuyển. |
| **Khiếu nại** | `Backend/src/modules/complaints/` | Tiếp nhận ticket khiếu nại từ khách hàng và xử lý bồi thường (Admin). |

---

## 2. MÃ NGUỒN FRONTEND - MOBILE APP (REACT NATIVE)
Giao diện ứng dụng dành cho **Khách hàng** và **Nhân viên (Shipper)** được đặt tại thư mục `Mobile/src/screens/`.

| Màn hình (Screen) | Đường dẫn file mã nguồn | Chức năng giao diện |
| :--- | :--- | :--- |
| **Đăng nhập** | `Mobile/src/screens/AuthScreen.tsx` | Màn hình đăng nhập dùng chung cho cả Khách hàng và Shipper. |
| **Tạo Đơn Hàng** | `Mobile/src/screens/CreateOrderScreen.tsx` | Form nhập thông tin gửi/nhận, trọng lượng và chọn dịch vụ vận chuyển (Dành cho Khách). |
| **Danh sách Đơn hàng** | `Mobile/src/screens/OrdersScreen.tsx` | Hiển thị list đơn hàng chờ lấy/giao (Shipper) hoặc lịch sử đơn (Khách). |
| **Chi tiết & Xử lý đơn** | `Mobile/src/screens/OrderDetailScreen.tsx` | Màn hình cực kỳ quan trọng: Xem chi tiết đơn, upload ảnh bằng chứng PoD, báo sự cố, đánh giá. |
| **Tra cứu Vận đơn** | `Mobile/src/screens/TrackingScreen.tsx` | Nhập mã đơn, hiển thị Timeline hành trình của bưu kiện. |
| **Hồ sơ cá nhân** | `Mobile/src/screens/ProfileScreen.tsx` | Quản lý thông tin cá nhân và xem thống kê (Shipper). |

---

## 3. MÃ NGUỒN FRONTEND - WEB ADMIN (HTML/JS)
Giao diện quản lý dành cho **Quản lý trạm (Điều phối)** và **Quản trị viên (Super Admin)** được viết thuần bằng HTML/JS, đặt tại thư mục `Admin/`.

| Module Giao diện | Đường dẫn file mã nguồn | Vai trò và Chức năng |
| :--- | :--- | :--- |
| **Khung Giao diện** | `Admin/index.html` | Cấu trúc DOM chính chứa toàn bộ các Tab màn hình của Admin. |
| **Controller Chính** | `Admin/js/app.js` | Điều hướng (Router), quản lý trạng thái đăng nhập, gọi API. |
| **Điều phối Logistic** | `Admin/js/logistics.js` | Xử lý logic giao diện phân công Shipper, quét mã Barcode nhập kho, xuất chuyến đi. |
| **Xử lý Khiếu nại** | `Admin/js/complaints.js` | Giao diện danh sách khiếu nại, xem ảnh bằng chứng và form phản hồi. |
| **Bản đồ Trạm** | `Admin/js/station-map.js` | Hiển thị bản đồ (MapLibre), đánh dấu các trạm bưu cục và tính khoảng cách tuyến đường. |

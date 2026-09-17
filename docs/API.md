# API · Chuyển Phát Nhanh

Base URL: `http://localhost:3000/api`. Request và response dùng JSON. Sau khi đăng nhập, gửi `Authorization: Bearer <token>`. JWT hết hạn sau 12 giờ. Đăng xuất, đổi mật khẩu hoặc khóa tài khoản sẽ vô hiệu hóa phiên đăng nhập cũ.

## Danh sách endpoint

| Method | Đường dẫn | Quyền | Ý nghĩa |
|---|---|---|---|
| GET | `/health` | Công khai | Kiểm tra API và MySQL |
| POST | `/auth/register` | Công khai | Đăng ký khách hàng |
| POST | `/auth/login` | Công khai | Đăng nhập |
| GET | `/auth/me` | Đã đăng nhập | Hồ sơ hiện tại |
| PATCH | `/auth/me` | Đã đăng nhập | Sửa tên, điện thoại, địa chỉ |
| POST | `/auth/change-password` | Đã đăng nhập | Đổi mật khẩu |
| POST | `/auth/logout` | Đã đăng nhập | Đăng xuất các thiết bị |
| GET | `/users` | Admin | Tìm, phân trang nhân viên/khách hàng |
| POST | `/users` | Admin | Tạo nhân viên/khách hàng |
| PATCH | `/users/:id` | Admin | Sửa hồ sơ, khóa/mở tài khoản |
| GET | `/services` | Đã đăng nhập | Danh sách dịch vụ; Admin thấy cả dịch vụ tắt |
| POST | `/services/quote` | Đã đăng nhập | Báo cước từ cấu hình trên server |
| PATCH | `/services/:id` | Admin | Sửa giá, thông tin, trạng thái dịch vụ |
| GET | `/orders` | Theo vai trò | Danh sách đơn trong phạm vi được phép |
| POST | `/orders` | Admin, khách hàng | Tạo đơn |
| GET | `/orders/:id` | Theo vai trò | Chi tiết + lịch sử |
| PATCH | `/orders/:id/assign` | Admin | Phân công hoặc đổi nhân viên |
| PATCH | `/orders/:id/status` | Theo vai trò | Chuyển trạng thái hợp lệ |
| GET | `/tracking/:code` | Công khai | Chỉ trả mã, trạng thái, mốc thời gian |
| GET | `/dashboard` | Admin | Thống kê, biểu đồ, đơn mới nhất |

Tra cứu công khai không trả tên, số điện thoại, địa chỉ, COD hay ghi chú nội bộ. Khách hàng chỉ đọc đơn có `customer_id` của mình; nhân viên chỉ đọc đơn có `employee_id` của mình. Đơn ngoài phạm vi trả 404.

## Ví dụ

Đăng nhập — `POST /auth/login`:

```json
{ "email": "khachhang@chuyenphat.vn", "password": "Demo@12345" }
```

Response: `{ "token": "...", "user": { "id": 2, "name": "...", "role": "customer", "email": "...", "phone": "...", "address": "..." } }`.

Đăng ký — `POST /auth/register`:

```json
{
  "name": "Nguyễn Minh Anh",
  "email": "minhanh@example.com",
  "password": "MatKhau123!",
  "phone": "0901234567",
  "address": "25 Nguyễn Thị Minh Khai, TP. Hồ Chí Minh"
}
```

API đăng ký không nhận `role`; tài khoản luôn là khách hàng. Admin tạo nhân viên qua `POST /users` với các trường trên và `"role": "employee"`.

Tạo đơn — `POST /orders`:

```json
{
  "sender_name": "Nguyễn Minh Anh",
  "sender_phone": "0901234567",
  "sender_address": "25 Nguyễn Thị Minh Khai, TP. Hồ Chí Minh",
  "receiver_name": "Trần Bảo Ngọc",
  "receiver_phone": "0912345678",
  "receiver_address": "36 Hai Bà Trưng, Hà Nội",
  "package_name": "Tài liệu văn phòng",
  "weight": 1.5,
  "zone": "domestic",
  "service_id": 1,
  "cod_amount": 200000,
  "payer": "sender",
  "note": "Gọi trước khi giao"
}
```

Admin cần thêm `customer_id`; khách hàng luôn được gắn với ID từ JWT, không thể tạo đơn cho người khác. Response 201: `{ "order": { ... } }`. `shipping_fee` và `tracking_code` do server tạo; client không được ghi đè.

Tính cước — `POST /services/quote`:

```json
{ "service_id": 1, "weight": 1.5, "zone": "domestic" }
```

Response theo bảng giá ban đầu: `{ "shipping_fee": 45000, "estimated_days": "2–4 ngày" }`.

Phân công — `PATCH /orders/1/assign`:

```json
{ "employee_id": 3 }
```

Đổi trạng thái — `PATCH /orders/1/status`:

```json
{ "status": "failed", "note": "Không liên hệ được người nhận" }
```

Đổi mật khẩu — `POST /auth/change-password`:

```json
{ "current_password": "MatKhauCu123!", "new_password": "MatKhauMoi456!" }
```

## Tìm kiếm và phân trang

- `GET /orders?page=1&limit=20&q=CPN&status=pending`.
- `GET /users?page=1&limit=20&role=employee&active=1&q=Nam`.
- `limit`: 1–100; `page` bắt đầu từ 1; response `{ items, total, page, limit }`.
- Tìm đơn theo mã, tên hoặc điện thoại người nhận. Tìm người dùng theo tên, email, điện thoại.

## Trạng thái và quy tắc

| Giá trị | Hiển thị | Chuyển sang |
|---|---|---|
| `pending` | Chờ xác nhận | `assigned` qua phân công; `cancelled` |
| `assigned` | Chờ lấy hàng | `picked_up`; Admin được `cancelled` |
| `picked_up` | Đã lấy hàng | `in_transit` |
| `in_transit` | Đang vận chuyển | `out_for_delivery` |
| `out_for_delivery` | Đang giao hàng | `delivered`, `failed` |
| `failed` | Giao thất bại | `out_for_delivery`; Admin được `cancelled` |
| `delivered` | Giao thành công | Kết thúc |
| `cancelled` | Đã hủy | Kết thúc |

Nhân viên không được hủy đơn. Khách hàng chỉ được hủy `pending`. `failed` và `cancelled` cần lý do ít nhất 3 ký tự. Phân công lại giữ trạng thái hiện tại, ngoại trừ lần phân công đầu chuyển `pending` sang `assigned`.

## Lỗi và giới hạn

Response lỗi: `{ "message": "...", "errors": [{ "field": "...", "message": "..." }] }` (errors chỉ có khi validation thất bại).

| HTTP | Ý nghĩa |
|---|---|
| 400 | Dữ liệu sai hoặc thiếu lý do |
| 401 | Chưa đăng nhập, phiên hết hạn, tài khoản bị khóa |
| 403 | Không đủ quyền |
| 404 | Không tìm thấy hoặc ngoài phạm vi truy cập |
| 409 | Email trùng, trạng thái xung đột, nhân viên còn đơn chưa xong |
| 413 | Request quá 100 KB |
| 429 | Vượt giới hạn yêu cầu |
| 500 | Lỗi máy chủ; response không lộ chi tiết SQL |

Giới hạn đăng nhập/đăng ký: 30 yêu cầu / 15 phút / IP. Tra cứu: 30 / phút / IP. Tổng API: 300 / phút / IP. Mật khẩu từ 8 ký tự, tối đa 72 byte UTF-8. Khối lượng 0,01–1.000 kg, tối đa 2 chữ số thập phân; COD từ 0 đến 100.000.000 đ.

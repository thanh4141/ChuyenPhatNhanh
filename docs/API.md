# API CPN

Luồng trạm và kho: [LOGISTICS.md](LOGISTICS.md). Swagger có nhóm **Trạm & kho**; quản lý trạm dùng vai trò `station_manager` và chỉ thao tác trạm của mình. Trạng thái mới gồm `at_origin`, `in_transit`, `at_destination`, `ready_delivery`; nhân viên lấy và giao lưu riêng.

Base `http://localhost:3000/api`. JSON, trừ upload dùng multipart. Đăng nhập xong gửi `Authorization: Bearer <token>`. Khóa tài khoản, đổi mật khẩu, đăng xuất thu hồi JWT cũ.

Tên bảng/cột MySQL đã đổi sang tiếng Việt không dấu. URL, tham số và khóa JSON API vẫn theo tài liệu này; backend ánh xạ tên cột để web/app/Swagger tiếp tục dùng được. Xem [đối chiếu tên CSDL](DATABASE-NAMES.md).

## Thống kê quản trị

`GET /api/dashboard?from=2026-09-01&to=2026-09-30` (Admin): ngày ISO `YYYY-MM-DD`, tính cả hai đầu ngày theo giờ Việt Nam, tối đa 366 ngày. Mặc định 7 ngày gần nhất. Ngày sai hoặc khoảng đảo ngược trả HTTP 400.

- `summary`, `statuses`, `daily`, `recent`: các đơn được **tạo** trong kỳ; ngày không có đơn vẫn xuất hiện với số lượng 0. Doanh thu gồm cước và phụ phí các đơn hiện đã hoàn thành, không gồm COD; số nhân viên/khách hàng là toàn hệ thống.
- `leaderboard`: tối đa 10 nhân viên theo ngày **giao hoàn thành** trong kỳ, kể cả đơn tạo trước kỳ. Sắp theo số đơn giảm dần, điểm đánh giá giảm dần, rồi mã tài khoản tăng dần. Điểm trung bình lấy từ đánh giá của các đơn giao trong kỳ; không có đánh giá thì `review_count=0`.
- `period`: khoảng ngày thực tế và múi giờ. Web có chọn hôm nay, 7 ngày, tháng này và khoảng ngày tùy chọn.

## Swagger UI

Mở **http://localhost:3000/api-docs/** để xem các endpoint, schema, mẫu JSON, quyền và mã lỗi. Đặc tả để import vào Postman: **http://localhost:3000/api-docs/openapi.json**.

1. Mở nhóm **Đăng nhập**, chọn **POST /auth/login → Try it out**.
2. Điền email/mật khẩu tài khoản của bạn rồi bấm **Execute**.
3. Sao chép trường `token` trong response, bấm **Authorize**, dán token (không thêm chữ `Bearer`) rồi xác nhận.
4. Thử **GET /auth/me**, sau đó các API đúng vai trò. Upload ảnh dùng nút chọn file trong trường `image`.

Swagger gọi API thật trên máy chủ hiện tại; thay đổi dữ liệu có hiệu lực trong MySQL. Token chỉ giữ trong bộ nhớ trang, tải lại cần Authorize lại. Không nhúng mật khẩu hoặc token vào đặc tả. Thư viện giao diện phục vụ từ backend, không dùng CDN hay validator bên ngoài.

Nguồn đặc tả: `Backend/src/docs/openapi.js`; khi thêm/sửa API cần cập nhật file này cùng handler. Chạy `npm.cmd --prefix Backend run docs:check` để kiểm tra đặc tả, rồi khởi động lại backend. Cách tích hợp dùng [Swagger UI chính thức](https://swagger.io/docs/open-source-tools/swagger-ui/usage/installation/).

## Endpoint

| Method | Đường dẫn | Quyền / chức năng |
|---|---|---|
| GET | /health | Công khai, kiểm tra MySQL |
| POST | /auth/register | Đăng ký khách; không nhận role |
| POST | /auth/login | Đăng nhập |
| GET/PATCH | /auth/me | Hồ sơ của mình |
| POST | /auth/change-password | current_password, new_password |
| POST | /auth/logout | Thu hồi phiên |
| GET | /users | Admin: role, q, active, page, limit |
| POST | /users | Admin: tạo employee |
| PATCH | /users/:id | Admin: sửa nhân viên; khách chỉ active |
| GET/POST | /employees | Admin: tìm/thêm hồ sơ |
| PATCH | /employees/:id | Admin: sửa hồ sơ, không đổi user_id |
| GET | /employees/me | Nhân viên: profile, stats, reviews phân trang |
| GET/POST | /addresses | Khách: xem/tạo địa chỉ |
| PATCH/DELETE | /addresses/:id | Khách: địa chỉ của mình |
| GET | /services | 6 bảng cước; người thường chỉ thấy gói bật |
| PATCH | /services/:id | Admin: sửa bảng cước theo rate_id |
| POST | /services/quote | Khách: báo giá đường bộ |
| POST | /media/parcel | Khách: một ảnh, trường image |
| POST | /media/incident | Nhân viên: một ảnh sự cố, trường image |
| GET | /media/:id/content | Có JWT và quyền xem ảnh |
| GET | /orders | Phạm vi theo vai trò; scope=mine/waiting |
| POST | /orders | Chỉ khách: tạo từ báo giá |
| GET | /orders/:id | order, events, media, review |
| POST | /orders/:id/accept | Nhân viên xác nhận nhiệm vụ đã được phân công |
| POST | /orders/:id/decline-pickup | Nhân viên báo không thể nhận, bắt buộc note từ 3 ký tự |
| GET | /logistics/pickup-tasks | Quản lý tìm đơn chờ phân công/xác nhận trong trạm |
| POST | /logistics/assign-pickup | Quản lý phân công station_id, employee_id, order_ids |
| PATCH | /orders/:id/status | Khách hủy; nhân viên cập nhật đơn đã nhận |
| POST | /orders/:id/review | Chủ đơn đã hoàn thành đánh giá một lần |
| GET | /notifications | Của mình: items, total, unread_count, page, limit |
| PATCH | /notifications/read-all | Đánh dấu của mình đã đọc |
| PATCH | /notifications/:id/read | Đánh dấu một thông báo của mình |
| GET | /dashboard | Admin |
| GET | /tracking/:code | Chỉ mã/trạng thái/thời gian, không lộ liên hệ |
| GET | /maps/config | Provider, style_url, provinces; không có API key |
| GET | /maps/search?q=... | Tên tỉnh nội bộ / địa danh Photon |
| GET | /maps/reverse?latitude=...&longitude=... | Tỉnh tại tọa độ, dùng ranh giới nội bộ |

Admin không có API tạo, phân công hay đổi trạng thái đơn. Nhân viên xem tất cả đơn `pending` chưa có người nhận ở `scope=waiting`, và chỉ đơn đã nhận của mình ở `scope=mine`. Khách chỉ thấy đơn của mình. Ngoài phạm vi trả 404.

## Địa chỉ

POST /addresses, PATCH /addresses/:id:

```json
{
 "label": "Nhà riêng",
 "contact_name": "Nguyễn Minh Anh",
 "phone": "0901234567",
 "province_code": "79",
 "ward": "Phường Sài Gòn",
 "village": "",
 "detail": "25 Lê Lợi",
 "latitude": 10.7769,
 "longitude": 106.7009,
 "is_default": true
}
```

Backend kiểm tra mã tỉnh với tọa độ. Với delivery trong báo giá, dùng các trường này **trừ label và is_default**.

## Báo giá rồi tạo đơn

POST /services/quote:

```json
{
 "pickup_address_id": 1,
 "delivery": {
  "contact_name":"Người nhận", "phone":"0902222222",
  "province_code":"79", "ward":"Phường Thạnh Mỹ Tây",
  "village":"", "detail":"Điểm giao hàng",
  "latitude":10.7951, "longitude":106.7218
 },
 "service_id":1, "weight":1.51,
 "has_cod":true, "cod_amount":250000,
 "has_insurance":true, "has_packaging":true
}
```

Response gồm quote_id, expires_at (10 phút), rate, route_type, distance_meters, source=osrm, route_geometry (GeoJSON LineString), route_data_version nếu có, các phí và total_amount. Không có đường đi thì trả lỗi, không dùng khoảng cách đường chim bay.

POST /orders:

```json
{
 "quote_id":"UUID báo giá",
 "parcel_photo_id":"UUID ảnh vừa tải",
 "package_name":"Mô tả hàng hóa",
 "note":"Gọi trước khi giao"
}
```

Chỉ nhận đúng các trường này; giá/cân nặng/địa chỉ lấy từ snapshot báo giá. Gửi lại quote đã tạo trả đơn cũ (200); lần đầu 201. Báo giá hết hạn trả 409.

Upload: `Content-Type: multipart/form-data`, một trường file **image**, tối đa **15 MiB = 15 × 1024 × 1024 byte**, ảnh tối đa 40 triệu pixel. Server kiểm tra nội dung, chuẩn hóa JPEG, bỏ metadata. Không phục vụ thư mục ảnh công khai.

## Trạng thái và đánh giá

```text
pending -- POST accept --> accepted
accepted -> awaiting_pickup -> picked_up -> delivering -> completed | incomplete
pending | accepted | awaiting_pickup -- chủ đơn --> cancelled
```

PATCH status dùng `{ "status":"awaiting_pickup", "note":"" }`. Với incomplete bắt buộc `note` ít nhất 3 ký tự và `incident_photo_id` thuộc nhân viên. Cancelled cần lý do. Không bỏ bước hoặc mở lại trạng thái kết thúc.

POST review: `{ "stars":5, "comment":"Giao cẩn thận, đúng hẹn" }`. Chỉ chủ đơn completed có nhân viên; sao từ 1–5, bình luận không trống, tối đa 1.000 ký tự.

## Giới hạn

Danh sách: page ≥1, limit 1–100. Khối lượng 0,01–1.000 kg, tối đa 2 chữ số thập phân; COD 0–100.000.000đ, có chọn thu hộ thì phải >0. Đóng gói 5.000đ/bảo hiểm 9.900đ khi được chọn.

Lỗi: 400 validation, 401 phiên, 403 quyền, 404 ngoài phạm vi, 409 xung đột, 413 quá dung lượng, 422 tọa độ/tuyến không phù hợp, 429 hạn mức, 502/503 dịch vụ bản đồ gián đoạn/bận. Response `{message, errors?}`.

API 300/phút/IP; maps search/reverse 30/phút/IP; upload 20/phút/IP. Backend xếp hàng bản đồ tối đa 8 và tối thiểu 1,1 giây giữa các request tới cùng nhà cung cấp. Dùng một process với endpoint cộng đồng; nhiều process cần bộ giới hạn chung hoặc máy chủ bản đồ riêng.

## Tạo tài khoản từ hồ sơ nhân viên

1. Trong **Hồ sơ nhân viên**, thêm họ tên, số điện thoại, địa chỉ và thông tin công việc. Hồ sơ có thể chưa có tài khoản.
2. Trong **Tài khoản → Thêm nhân viên**, chọn hồ sơ rồi nhập email và mật khẩu. Tên và thông tin liên hệ lấy từ hồ sơ.
3. Chỉ chọn được hồ sơ đang làm việc, chưa liên kết tài khoản; mỗi hồ sơ chỉ có một tài khoản.

API: `GET /api/employees?available=1`, sau đó `POST /api/users` với `{profile_id, email, password}`. Sau khi cập nhật mã, dừng backend và chạy `npm --prefix Backend run db:migrate` trước khi mở lại. Migration 004 tự sao lưu, giữ tài khoản/hồ sơ cũ và cho phép hồ sơ chưa có tài khoản.

## Bằng chứng giao hàng và khiếu nại

- POST /media/delivery (nhân viên): multipart image ≤15 MiB. Lấy id rồi PATCH /orders/:id/status với {"status":"completed","delivery_photo_id":"UUID"}. Thiếu/sai chủ/sai loại ảnh trả 400, ảnh đã dùng trả 409; không đổi trạng thái khi lỗi.
- GET /complaints?order_id=&status=&q=&page=&limit=: khách chỉ thấy của mình, quản lý trạm thấy đơn liên quan, Admin thấy toàn bộ.
- POST /complaints (khách): {"order_id":1,"title":"Kiểm tra hàng","message":"Mô tả ít nhất 10 ký tự"}. Mỗi đơn một khiếu nại, trùng trả 409.
- PATCH /complaints/:id (Admin/quản lý trạm): {"status":"resolved","response":"Kết quả xử lý"}. Trạng thái processing/resolved/rejected, phản hồi ít nhất 3 ký tự. Gửi thông báo cho khách.

GET /orders, /dashboard.recent và /logistics/inventory trả thông tin tóm tắt, không trả ba JSON snapshot. Dùng GET /orders/:id để lấy bản đồ/địa chỉ/bảng giá đầy đủ. Nội tỉnh có thể picked_up → delivering trực tiếp; khác tỉnh phải qua kho gửi và kho giao, có thể thêm trạm trung gian.

## Trạm gần nhất theo đường bộ (007)

POST /stations thêm latitude, longitude bắt buộc. PATCH /stations/:id/location (Admin) cập nhật hai tọa độ, xác minh đúng tỉnh và gần đường. POST /orders/:id/route-pickup (Admin) xác định lại trạm lấy cho đơn pending chưa nhận có tọa độ.

Báo giá chọn trạm bằng OSRM Table theo chiều trạm → điểm lấy, lấy khoảng cách nhỏ nhất. Trạm có thể khác tỉnh điểm lấy. Trạm giao cũng chọn riêng theo khoảng cách đường bộ từ các trạm tới người nhận, không bắt buộc cùng tỉnh. Nếu trạm lấy và trạm giao trùng nhau, đơn khác tỉnh vẫn nhập kho rồi phân công giao cuối, không cần chuyến trung chuyển. Tất cả trạm hoạt động cần đủ vị trí trước khi báo giá. Đổi cấu hình trạm khiến báo giá cũ chưa đặt đơn phải tính lại. Phí trạm đi lấy không cộng vào cước khách.

Đơn lưu pickup_station_distance_meters. Đơn chờ chưa có giá trị này hoặc chưa có origin_station_id không xuất hiện với nhân viên. Đơn đã nhận giữ phân công. Xem chi tiết quy tắc và giới hạn dữ liệu bản đồ tại [LOGISTICS.md](LOGISTICS.md#chọn-trạm-lấy-gần-nhất).

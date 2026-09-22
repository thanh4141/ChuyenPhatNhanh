# API CPN

Base `http://localhost:3000/api`. JSON, trừ upload dùng multipart. Đăng nhập xong gửi `Authorization: Bearer <token>`. Khóa tài khoản, đổi mật khẩu, đăng xuất thu hồi JWT cũ.

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
| POST | /orders/:id/accept | Nhân viên tự nhận đơn chờ |
| PATCH | /orders/:id/status | Khách hủy; nhân viên cập nhật đơn đã nhận |
| POST | /orders/:id/review | Chủ đơn đã hoàn thành đánh giá một lần |
| GET | /notifications | Của mình: items, total, unread_count, page, limit |
| PATCH | /notifications/read-all | Đánh dấu của mình đã đọc |
| PATCH | /notifications/:id/read | Đánh dấu một thông báo của mình |
| GET | /dashboard | Admin |
| GET | /tracking/:code | Chỉ mã/trạng thái/thời gian, không lộ liên hệ |
| GET | /maps/config | Provider, tile_url, provinces; không có API key |
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

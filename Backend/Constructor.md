# Cấu trúc Backend

server.js kiểm tra MySQL rồi chạy app.js. Express phục vụ API /api, web Admin và MapLibre /maps.

- config: env, MySQL pool UTC, 34 tỉnh/nhóm miền; database-names.js ánh xạ cột MySQL tiếng Việt sang khóa API.
- common: JWT, vai trò, validation, lỗi.
- auth/users/employees: phiên, tài khoản, hồ sơ nhân viên.
- addresses: sổ địa chỉ khách, tọa độ, địa chỉ mặc định.
- services: bảng cước 6 gói, báo giá có thời hạn.
- orders: tạo từ quote, tự nhận đơn, trạng thái, đánh giá.
- media: kiểm tra/chuẩn hóa ảnh, quyền xem, gắn sự cố vào event.
- notifications: thông báo MySQL.
- maps: OSRM đường bộ, Photon địa danh, ranh giới tỉnh nội bộ, cache MySQL.
- dashboard: thống kê Admin.
- scripts/schema.sql: DDL hiện tại bằng tiếng Việt. legacy/ giữ DDL cũ để nâng cấp.
- migrations/vietnamese.js: đổi tên tại chỗ, lưu định nghĩa khóa ngoại trước khi thay DDL, hỗ trợ tiếp tục khi gián đoạn.
- scripts/backup.js: sao lưu DDL/dữ liệu ngoài Git.
- test: domain/maps/API MySQL/UI Chrome.

Admin chỉ xem đơn. Các bước nghiệp vụ dùng transaction và khóa dòng. Không tính lương.

[Chạy](../README.md) · [API](../docs/API.md) · [CSDL](../docs/DATABASE.md) · [Bản đồ](../docs/MAPS.md)

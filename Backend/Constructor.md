# Cấu trúc Backend

`server.js` kiểm tra cấu hình và MySQL rồi khởi động `app.js`. `app.js` cấu hình middleware, API `/api`, phục vụ thư mục `Admin`, và trả lỗi thống nhất.

- `config/env.js`: đọc `.env` theo đường dẫn Backend, không phụ thuộc thư mục chạy lệnh.
- `config/database.js`: MySQL pool, UTC session, transaction/rollback.
- `common/auth.js`: xác thực JWT, kiểm tra tài khoản trong DB, phân quyền.
- `common/validation.js`: quy tắc dữ liệu dùng chung.
- `modules/*/*.routes.js`: endpoint chia theo nghiệp vụ.
- `modules/orders/order.domain.js`: công thức cước, quyền trên đơn, quy trình trạng thái; được unit test riêng.
- `routes/index.js`: ghép module và route tra cứu công khai giới hạn thông tin.
- `scripts/schema.sql`, `migrate.js`, `seed.js`: CSDL và dữ liệu minh họa.
- `test`: kiểm thử nghiệp vụ, API/MySQL, và trình duyệt Admin/Mobile.

API dùng Express 5, `mysql2/promise`, Zod, bcrypt, JWT, Helmet, CORS và rate limiting. Các thao tác có thể xung đột khóa bản ghi bằng `SELECT ... FOR UPDATE` trong transaction. Web Admin và app Mobile dùng chung API và CSDL.

Hướng dẫn chạy tại [README gốc](../README.md); endpoint tại [docs/API.md](../docs/API.md).

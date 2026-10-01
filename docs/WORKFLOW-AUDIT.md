# Kiểm tra quy trình sau thay đổi phân công lấy hàng — 25/09/2026

## Kết quả đã chạy

| Phạm vi | Kết quả |
|---|---|
| Nghiệp vụ, tính cước, bản đồ | 12/12 |
| API tích hợp với MySQL riêng | 19/19 |
| Logistics, phân quyền, cạnh tranh cập nhật và giao diện quản lý trạm | 12/12 |
| Luồng giao diện khách/nhân viên và quản trị bằng Chrome | Đạt, không ghi nhận lỗi JavaScript |
| Mobile TypeScript, chuỗi JSX trong Text | Đạt |
| Xuất bundle web và Android | Đạt |
| Swagger | 52 đường dẫn, 61 thao tác hợp lệ |

Đã thử: tạo địa chỉ/ảnh/báo giá/đơn; quản lý chọn đơn và phân công qua giao diện; nhân viên xác nhận hoặc từ chối có lý do; quản lý phân công lại; chặn tự nhận và sai trạm; giao thẳng nội tỉnh; nhập kho liên tỉnh; gom nhiều kiện qua trạm trung gian; xuất kho; nhận từng kiện/nhận một phần; phân công người giao cuối; bắt buộc ảnh giao hàng; sự cố; hủy; đánh giá và khiếu nại.

Các kiểm thử kiểm tra nhận/xuất trùng, giữ nguyên cước đã chốt, tỉnh không có kho, bộ lọc theo giờ Việt Nam, cạnh tranh nhận/hủy và ảnh thuộc đúng nhân viên. Dữ liệu tích hợp nằm trong CSDL kiểm thử riêng.

## Điểm phát hiện và xử lý

- MySQL cục bộ chưa chạy ở đầu phiên: đã khởi động lại. Các lỗi ECONNREFUSED đầu tiên do dịch vụ chưa mở, sau đó chạy lại thành công.
- Thông báo đơn mới còn gửi cho nhân viên như luồng tự nhận cũ: chuyển sang gửi Admin/quản lý trạm để phân công; nhân viên nhận thông báo nhiệm vụ được giao.
- Bộ kiểm thử giao diện còn dùng tên nút và luồng tự nhận cũ: cập nhật để thực sự chọn đơn/phân công trên trang quản lý rồi xác nhận trên app web.
- Bộ logistics vượt hạn mức tải ảnh vì nhiều tình huống dùng chung IP thử: tách IP theo tình huống chỉ trong bộ kiểm thử; giữ nguyên giới hạn của ứng dụng.
- Swagger thiếu API phân công/từ chối và còn mô tả tự nhận: bổ sung ba API, cập nhật hướng dẫn vận hành.

## Dữ liệu và máy chủ thật

MySQL có 20 bảng, 12 tài khoản, 6 đơn và 14 ảnh. Cả 14 ảnh có file JPEG đọc được, kích thước khớp dữ liệu và truy cập được qua API có xác thực. Cả 5 trạm có tọa độ; danh sách nhiệm vụ, tồn kho và chuyến tải thành công cho từng trạm. API health, tổng quan, nhân viên và khiếu nại đạt. Không tạo đơn kiểm thử trong CSDL thật.

MySQL và API đã mở lại. API dùng cổng 3000.

## Giới hạn xác nhận

Chưa thao tác trên camera Android/iPhone thật trong lần kiểm tra này. Bundle Android và mô phỏng giao diện điện thoại bằng Chrome không thay thế việc chụp/gửi ảnh trên thiết bị. Các bộ nghiệp vụ dùng nhà cung cấp bản đồ giả lập có kết quả xác định; không chứng minh độ sẵn sàng liên tục của dịch vụ bản đồ công cộng hoặc mọi tình huống ngoài bộ kiểm thử.

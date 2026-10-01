# Kiểm tra ngày 25/09/2026

## Kết quả

- MySQL: kiểm thử migration 4/4; kiểm thử API tích hợp 19/19; nghiệp vụ/bản đồ 12/12; logistics 9/9. Các bộ tích hợp dùng cơ sở dữ liệu kiểm thử riêng.
- API thật sau khi khởi động lại: health, trạm, nhân viên, tài khoản quản lý trạm, đơn hàng, tổng quan và khiếu nại truy cập thành công. Cả 5 trạm hiện tại có tọa độ.
- Swagger hợp lệ: 49 đường dẫn, 58 thao tác.
- Giao diện Chrome máy tính và kích thước điện thoại: tạo đơn, ảnh, nhận/giao, bằng chứng bắt buộc, đánh giá, khiếu nại/phản hồi, thông báo, sự cố, hủy đơn và thống kê đều qua kiểm thử; không có lỗi JavaScript được ghi nhận.
- Kiểm thử chủ động ngắt lần tải ảnh bằng chứng đầu: nút hoàn thành vẫn bị khóa, thử tải lại ảnh thành công mà không chọn/chụp lại.
- Mobile: TypeScript và kiểm tra chuỗi ngoài Text đạt; xuất bundle web và Android thành công.

## Thay đổi trong lần kiểm tra này

- Ảnh native được chuyển JPEG, thu cạnh dài tối đa 2400 px và tải bằng File + expo/fetch. Giới hạn ảnh vẫn là 15 MB; thời gian tải tối đa 120 giây.
- Giữ ảnh tạm để thử tải lại; phân biệt lỗi kết nối, hết thời gian và phản hồi máy chủ không hợp lệ.
- Tách truy vấn tuyến giao khỏi tải chi tiết đơn, tránh dịch vụ bản đồ lỗi làm mất toàn bộ màn hình chi tiết.
- Tuyến từ trạm đích đến người nhận vẫn lấy được sau khi kiện xuất kho giao; trả đúng cấu trúc hình học cho bản đồ.

## Xác nhận trên thiết bị thật còn lại

### Bổ sung: tỉnh không có kho

- Đã đổi chọn trạm giao sang khoảng cách đường bộ nhỏ nhất từ các trạm đang hoạt động tới người nhận. Cước vẫn lấy tuyến điểm lấy → người nhận.
- Logistics 10/10, nghiệp vụ/bản đồ 12/12 và Swagger đạt sau thay đổi. Có kiểm thử điểm lấy/điểm giao không có kho, hai đầu cùng kho, nhập kho và phân công giao cuối, giữ nguyên giá/quãng đường toàn đơn.
- Thử đọc trực tiếp với 5 kho hiện có: điểm mẫu Hà Nội (21.0285,105.8542) → Hạ Long (20.9712,107.0448) chọn Kho Hà Nội cho cả hai đầu; OSRM trả toàn tuyến 153129 m, chặng kho → người nhận 179883 m. Đây là kết quả tại tọa độ thử, không đại diện mọi địa chỉ trong hai tỉnh.
- Báo giá trước thay đổi cần tính lại. Đơn đã tạo giữ trạm và cước đã chốt.

Người dùng đã xác nhận Android mở API health qua LAN được. Chưa trực tiếp kiểm thử camera và tải ảnh trên thiết bị đó sau bản sửa; bundle Android và trình duyệt không thay thế kiểm thử này.

Mở lại dự án trong Expo Go khi máy tính và điện thoại cùng mạng, vào đơn đang giao, chọn Hoàn thành, chụp ảnh bằng chứng và chờ ảnh hiện trước khi xác nhận. Nếu có lỗi, ghi lại nguyên văn thông báo mới. Mobile/.env đang để EXPO_PUBLIC_API_URL trống để Expo Go suy ra IP máy tính đang chạy Metro.

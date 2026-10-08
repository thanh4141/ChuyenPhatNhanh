# CHƯƠNG 4: TRIỂN KHAI VÀ KIỂM THỬ HỆ THỐNG

## 4.1. Kế hoạch kiểm thử (Test Plan)
Mục tiêu của giai đoạn kiểm thử là đảm bảo tất cả các chức năng cốt lõi của cả 4 phân hệ (Khách hàng, Nhân viên, Quản lý trạm, Quản trị viên) hoạt động đúng theo đặc tả yêu cầu, dữ liệu được cập nhật chính xác vào cơ sở dữ liệu MySQL và sự tương tác giữa Mobile App/Web Frontend với Backend API diễn ra trơn tru.

Phương pháp kiểm thử: **Kiểm thử hộp đen (Black-box testing)** dựa trên các ca sử dụng (Use Case) đã phân tích.

---

## 4.2. Kịch bản kiểm thử chức năng (Test Cases)

### 4.2.1. Phân hệ Khách hàng (Customer App)

| Mã TC | Chức năng kiểm thử | Các bước thực hiện | Kết quả mong đợi | Đánh giá |
| :--- | :--- | :--- | :--- | :--- |
| **TC_KH_01** | Đăng nhập tài khoản | 1. Nhập Số điện thoại hợp lệ.<br>2. Nhập Mật khẩu đúng.<br>3. Bấm "Đăng nhập". | Hệ thống chuyển hướng vào Màn hình chính (Trang chủ) của Khách hàng. | Pass |
| **TC_KH_02** | Tạo đơn hàng (Thành công) | 1. Chọn "Tạo đơn".<br>2. Nhập đầy đủ thông tin gửi/nhận.<br>3. Nhập khối lượng 2kg.<br>4. Bấm "Tạo đơn hàng". | Hệ thống báo giá cước, lưu đơn hàng vào CSDL (trạng thái `pending`), sinh mã vận đơn thành công. | Pass |
| **TC_KH_03** | Tạo đơn hàng (Bỏ trống dữ liệu) | 1. Chọn "Tạo đơn".<br>2. Để trống địa chỉ người nhận.<br>3. Bấm "Tạo đơn hàng". | Hệ thống hiển thị cảnh báo đỏ "Vui lòng nhập đầy đủ thông tin địa chỉ". Đơn hàng không được tạo. | Pass |
| **TC_KH_04** | Theo dõi lộ trình đơn hàng | 1. Chọn "Theo dõi đơn".<br>2. Nhập mã vận đơn vừa tạo (hoặc chọn từ danh sách). | Hiển thị chi tiết trạng thái đơn, vị trí hiện tại và lịch sử trung chuyển của gói hàng. | Pass |

### 4.2.2. Phân hệ Nhân viên Shipper (Shipper App)

| Mã TC | Chức năng kiểm thử | Các bước thực hiện | Kết quả mong đợi | Đánh giá |
| :--- | :--- | :--- | :--- | :--- |
| **TC_NV_01** | Nhận thông báo phân công | 1. Mở App Shipper, bật trạng thái "Sẵn sàng".<br>2. Chờ Quản lý trạm phân công đơn. | Nhận được Push Notification: "Bạn có đơn hàng mới cần lấy". Đơn hiện lên tab Cần xử lý. | Pass |
| **TC_NV_02** | Xác nhận lấy hàng | 1. Chọn đơn hàng chờ lấy.<br>2. Đến nơi, kiểm tra hàng.<br>3. Bấm "Đã lấy hàng". | Trạng thái đơn hàng đổi thành `picked_up`. Ghi nhận lịch sử vào CSDL. | Pass |
| **TC_NV_03** | Giao hàng thành công (Upload PoD) | 1. Chọn đơn đang đi giao.<br>2. Thu tiền COD (nếu có).<br>3. Chụp ảnh bằng chứng (PoD).<br>4. Bấm "Hoàn thành". | Ảnh được upload lên server lưu vào `anh_don_hang`. Trạng thái đơn đổi thành `delivered`. | Pass |
| **TC_NV_04** | Giao hàng thất bại | 1. Chọn đơn đang đi giao.<br>2. Bấm "Giao thất bại".<br>3. Chọn lý do "Khách không nghe máy". | Trạng thái đơn đổi thành `delivery_failed`. Lý do được ghi lại vào lịch sử. | Pass |

### 4.2.3. Phân hệ Quản lý trạm (Web Admin / Trạm)

| Mã TC | Chức năng kiểm thử | Các bước thực hiện | Kết quả mong đợi | Đánh giá |
| :--- | :--- | :--- | :--- | :--- |
| **TC_QL_01** | Phân công Shipper lấy hàng | 1. Xem danh sách đơn `pending`.<br>2. Chọn đơn, gán cho Shipper đang "Online". | Hệ thống cập nhật `nhan_vien_id`, chuyển trạng thái đơn. Gửi thông báo tới App của Shipper. | Pass |
| **TC_QL_02** | Phân công cho Shipper Offline | 1. Chọn đơn `pending`.<br>2. Cố tình gán cho Shipper đang "Offline" / Quá tải. | Hệ thống hiện cảnh báo lỗi "Nhân viên không khả dụng", chặn việc phân công. | Pass |
| **TC_QL_03** | Nhập kho kiện hàng | 1. Mở màn hình Nhập kho.<br>2. Quét Barcode kiện hàng do Shipper mang về. | Hệ thống báo "Nhập kho thành công". Trạng thái đơn đổi thành `in_stock`. | Pass |
| **TC_QL_04** | Xuất chuyến xe trung chuyển | 1. Tạo chuyến xe chọn Trạm đích.<br>2. Quét/Chọn các kiện hàng thêm vào chuyến.<br>3. Bấm "Xuất bến". | Bản ghi chuyến xe được lưu, các đơn hàng đổi trạng thái sang `delivering` hướng tới trạm đích. | Pass |

### 4.2.4. Phân hệ Quản trị viên (Web Super Admin)

| Mã TC | Chức năng kiểm thử | Các bước thực hiện | Kết quả mong đợi | Đánh giá |
| :--- | :--- | :--- | :--- | :--- |
| **TC_AD_01** | Cấu hình cước phí hợp lệ | 1. Vào Cấu hình bảng cước.<br>2. Đổi giá cước cơ bản từ 15k -> 18k.<br>3. Bấm Lưu. | Cập nhật thành công vào CSDL. Mọi đơn hàng tạo sau thời điểm này đều tính theo giá 18k. | Pass |
| **TC_AD_02** | Cấu hình cước phí không hợp lệ | 1. Vào Cấu hình bảng cước.<br>2. Xóa trống ô nhập giá trị (hoặc nhập -5k).<br>3. Bấm Lưu. | Báo lỗi Validation: "Giá cước không được để trống / Giá cước phải > 0". Không lưu. | Pass |
| **TC_AD_03** | Khóa tài khoản nhân viên | 1. Vào Quản trị nhân sự.<br>2. Chọn một Shipper, bấm "Khóa tài khoản". | Trạng thái account chuyển sang `locked`. Shipper đó lập tức bị đăng xuất hoặc không thể login lại. | Pass |
| **TC_AD_04** | Xử lý khiếu nại | 1. Mở chi tiết 1 khiếu nại.<br>2. Xem ảnh PoD làm bằng chứng.<br>3. Chọn "Từ chối đền bù" & nhập lý do. | Trạng thái khiếu nại chuyển thành "Đã đóng", email/thông báo được gửi về App khách hàng. | Pass |

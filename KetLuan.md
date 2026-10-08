# KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN

## 1. Kết quả đạt được (Những gì đã làm được)
Trải qua quá trình khảo sát, phân tích thiết kế và tiến hành lập trình, đề tài đã hoàn thành được các mục tiêu cốt lõi đề ra ban đầu. Cụ thể, hệ thống phần mềm Quản lý Chuyển phát nhanh (CPN) đã đạt được những kết quả sau:

1. **Xây dựng thành công 4 phân hệ cốt lõi:**
   - **Phân hệ Khách hàng:** Cho phép người dùng dễ dàng tạo đơn, tra cứu lộ trình vận đơn trực quan, thực hiện đánh giá và gửi khiếu nại.
   - **Phân hệ Nhân viên (Shipper):** Số hóa hoàn toàn thao tác nhận lệnh lấy hàng, giao hàng, cập nhật trạng thái và upload ảnh chụp bằng chứng (PoD) ngay tại hiện trường.
   - **Phân hệ Quản lý trạm:** Hỗ trợ điều phối viên phân công công việc hiệu quả, quản lý quy trình nhập/xuất kho và gom chuyến xe trung chuyển liên tỉnh một cách mạch lạc.
   - **Phân hệ Quản trị viên:** Giúp theo dõi toàn cảnh mạng lưới, cấu hình động các bảng cước phí đường bộ và xử lý khiếu nại cấp hệ thống.
2. **Áp dụng kiến trúc và công nghệ hiện đại:**
   - Hoàn thiện kiến trúc Client-Server với Backend sử dụng **Node.js/Express**, cơ sở dữ liệu **MySQL 8.0** đảm bảo tính toàn vẹn thông qua Transaction.
   - Ứng dụng **React Native** cho phía thiết bị di động (Khách hàng & Shipper) và **ReactJS** cho Web Admin giúp giao diện thân thiện, responsive và hiệu năng cao.
3. **Mô hình hóa hệ thống chuẩn mực:** Đã lập tài liệu phân tích thiết kế hệ thống chi tiết bao gồm Biểu đồ Use Case, Sequence Diagram, Activity Diagram và Sơ đồ Lớp (Class Diagram) theo đúng chuẩn UML học thuật.

## 2. Hạn chế của hệ thống (Những gì chưa làm được)
Do giới hạn về thời gian thực hiện cũng như nguồn lực, hệ thống vẫn còn một số điểm hạn chế cần phải khắc phục trong tương lai:

1. **Chưa tích hợp Thanh toán trực tuyến:** Hệ thống hiện tại đang dừng ở mức ghi nhận số tiền Cước và COD theo hình thức thanh toán thủ công (tiền mặt/chuyển khoản ngoài). Chưa tích hợp trực tiếp các cổng thanh toán điện tử (như VNPay, MoMo, ZaloPay).
2. **Thiếu tính năng tính lương, đối soát tài chính:** Đề tài chưa bao gồm module tính lương, thưởng tự động cho nhân viên Shipper hay hoa hồng cho các Trạm dựa trên khối lượng công việc hoàn thành.
3. **Điều phối và Định tuyến vẫn mang tính thủ công:** Việc phân công tài xế hay gom chuyến xe trung chuyển vẫn dựa vào quyết định của Quản lý trạm. Hệ thống chưa áp dụng các thuật toán tối ưu hóa đường đi (Routing Optimization) để tự động gợi ý chuyến đi ngắn nhất và tiết kiệm chi phí nhất.
4. **Hệ thống thông báo Real-time chưa toàn diện:** Các tính năng thông báo đang dựa vào việc polling (làm mới dữ liệu theo chu kỳ) hoặc cập nhật khi mở app, chưa tích hợp hoàn chỉnh công nghệ WebSockets (như Socket.io) để đẩy thông báo theo thời gian thực.

## 3. Hướng phát triển tương lai
Dựa trên những hạn chế đã nêu, đề tài đề xuất các hướng phát triển tiếp theo như sau:

1. **Tích hợp Ví điện tử và Cổng thanh toán:** Thêm tính năng thanh toán cước phí ngay lúc tạo đơn và tự động đối soát tiền COD cho khách hàng (Shop) theo chu kỳ định sẵn.
2. **Ứng dụng Trí tuệ nhân tạo (AI/ML) vào Điều phối:** Sử dụng các thuật toán học máy và API bản đồ để giải quyết bài toán Vehicle Routing Problem (VRP), giúp gợi ý cho Quản lý trạm lộ trình gom hàng/giao hàng tối ưu nhất.
3. **Nâng cấp công nghệ:** Áp dụng kiến trúc Microservices và cơ sở dữ liệu NoSQL (như MongoDB) hoặc Redis Caching cho phần Tracking lộ trình nhằm tăng khả năng chịu tải khi số lượng đơn hàng lên đến hàng triệu đơn mỗi ngày.
4. **Phát triển module Chăm sóc khách hàng tự động:** Tích hợp Chatbot AI để tự động trả lời các câu hỏi về tra cứu mã vận đơn, chính sách bồi thường nhằm giảm tải cho bộ phận Xử lý khiếu nại.

---

# TÀI LIỆU THAM KHẢO

**[1]. Tiếng Việt**
1. TS. Nguyễn Văn Vỵ (2002), *Phân tích thiết kế hệ thống thông tin*, NXB Thống kê.
2. ThS. Phạm Hữu Khang (2007), *Cơ sở dữ liệu - SQL Server*, NXB Lao Động Xã Hội.
3. Giáo trình *Công nghệ Phần mềm* (Software Engineering), Đại học Bách Khoa Hà Nội.

**[2]. Tiếng Anh (Tài liệu chuyên ngành & Official Documentation)**
4. PlantUML Team, *PlantUML Language Reference Guide*, https://plantuml.com/
5. Node.js Foundation, *Node.js Documentation v22.x*, https://nodejs.org/docs/
6. Meta Platforms, Inc., *React Native Documentation*, https://reactnative.dev/docs/getting-started
7. Oracle Corporation, *MySQL 8.0 Reference Manual*, https://dev.mysql.com/doc/refman/8.0/en/
8. Ian Sommerville (2015), *Software Engineering (10th Edition)*, Pearson.

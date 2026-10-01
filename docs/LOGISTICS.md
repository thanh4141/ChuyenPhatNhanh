# Trạm chuyển phát và trung chuyển

Không cần mỗi tỉnh/thành đều có trạm. Một trạm có thể phục vụ nhiều tỉnh và có nhiều tài khoản quản lý riêng. Quản lý trạm đăng nhập cùng trang web Admin nhưng chỉ điều hành trạm của mình. Không có chức năng tính lương.

## Thiết lập

1. Dừng API, chạy `npm --prefix Backend run db:migrate`, rồi mở lại API. Các migration 005–007 tự sao lưu MySQL trước khi thay đổi.
2. Admin mở **Trạm chuyển phát**, thêm trạm với tỉnh/thành, địa chỉ kho và **Chọn vị trí kho trên bản đồ**. Với trạm cũ, bấm **Ghim vị trí** để lưu đúng lối vào kho. Hệ thống không tự tạo trạm giả hoặc mật khẩu quản lý mặc định.
3. Bấm **Thêm quản lý trạm** để cấp email/mật khẩu riêng.
4. Trong **Hồ sơ nhân viên**, Admin chọn **Trạm làm việc**. Quản lý trạm thêm hồ sơ thì hệ thống tự gán trạm của mình. Tạo tài khoản từ hồ sơ như trước.
5. Mỗi trạm đang hoạt động phải có tọa độ hợp lệ, gần đường bộ. Chọn riêng trạm lấy và trạm giao theo khoảng cách đường bộ nhỏ nhất từ trạm tới từng địa chỉ, kể cả khác tỉnh. Tỉnh không có kho vẫn đặt được. Nếu hai đầu cùng một kho và đơn khác tỉnh, vẫn nhập kho rồi phân công giao cuối, không tạo chuyến trung chuyển về chính kho đó. Nhân viên chưa phân trạm không thấy và không nhận đơn chờ.
6. Sau khi ghim trạm, mở **Đơn hàng → Chi tiết → Xác định lại trạm lấy gần nhất** cho đơn còn chờ nhận. Đơn cũ chưa xác định trạm theo đường bộ không hiển thị cho nhân viên. Chỉ Admin được tính lại; đơn đã nhận giữ phân công.

## Quyền

| Vai trò | Phạm vi |
|---|---|
| Admin | Tạo trạm và quản lý trạm; quản lý nhân viên, kho, chuyến toàn hệ thống |
| Quản lý trạm | Hồ sơ/tài khoản nhân viên tại trạm, đơn liên quan trạm, kiểm nhận và xuất hàng, phân công giao |
| Nhân viên | Chỉ xem/xác nhận nhiệm vụ lấy do quản lý phân công cho chính mình tại trạm; giao những đơn được phân công; app có bộ lọc Tôi lấy hàng / Tôi giao hàng |
| Khách hàng | Tạo/theo dõi đơn, xem người lấy/người giao, hủy trước khi lấy, đánh giá người giao cuối |

API chặn quản lý trạm truy cập/sửa nhân viên trạm khác, danh sách khách toàn hệ thống, cấu hình trạm và bảng cước. Ảnh đơn cũng được phân quyền.

## Lấy hàng và nhập kho

### Thông báo trên web quản lý

Nút **Thông báo** ở đầu trang hiển thị số chưa đọc, cập nhật mỗi 30 giây khi trang đang hiển thị. Danh sách có phân trang, đánh dấu đã đọc và nút làm mới.

- Đơn mới hoặc nhân viên từ chối nhiệm vụ: Admin/quản lý trạm lấy nhận thông báo. Nhấn thẻ mở kho và lọc đúng đơn để phân công.
- Nhân viên đã lấy hàng: quản lý trạm lấy nhận thông báo; nhấn mở khu vực kho để kiểm nhận khi hàng thực tế tới.
- Xuất chuyến: Admin/quản lý trạm đến nhận một thông báo cho chuyến. Nhấn mở kho đến và danh sách kiện của đúng chuyến để kiểm nhận từng kiện. Xuất trùng bị từ chối và không phát thông báo thêm.
- Hoàn thành, gặp sự cố hoặc khách hủy: quản lý liên quan nhận thông báo và mở chi tiết đơn để xem trạng thái, ảnh và lịch sử.

Thông báo chỉ hiển thị cho tài khoản nhận; các màn hình đích tiếp tục kiểm tra quyền truy cập. Thông báo sự kiện mới được tạo từ lúc triển khai, không dựng lại thông báo chuyến đã xuất trước đó.

`Chờ nhận → Đã nhận → Chờ lấy hàng → Đã lấy hàng`

Quản lý vào **Kho & trung chuyển → Phân công lấy hàng**, lọc điểm lấy/gói/ngày tạo, chọn nhiều đơn và chọn nhân viên. Đơn vẫn **Chờ nhận** cho đến khi nhân viên bấm **Xác nhận nhiệm vụ** trong tab **Nhiệm vụ mới**. Nhân viên có thể báo không thể nhận với lý do; đơn bỏ phân công để quản lý giao lại. Có thể đổi người phụ trách khi chưa xác nhận; không đổi sau khi đã nhận. **Đã lấy hàng** chỉ là đã lấy từ khách, chưa tính hàng về kho. Quản lý chỉ bấm **Xác nhận hàng về kho** sau khi kiểm nhận thực tế.

- Lấy và giao cùng tỉnh: người lấy có thể chọn **Đang giao** ngay sau **Đã lấy hàng** để giao thẳng cho người nhận, không bắt buộc nhập kho. Hệ thống lưu người lấy đó là người giao cuối. Nếu thực tế đã bàn giao về kho thì phải kiểm nhận và phân công giao như bình thường.
- Khác tỉnh: nhập trạng thái **Đã về kho / Chờ trung chuyển**.

Người lấy không thể bỏ qua kho để tự chuyển sang giao liên tỉnh.

## Gom và trung chuyển

1. Lọc kho theo tỉnh đích, chọn nhiều kiện, bấm **Gom chuyến đã chọn**. Một chuyến chỉ chứa các kiện chung tỉnh giao cuối.
2. Chọn trạm đến trực tiếp hoặc trạm trung gian. Gom chuyến chỉ giữ chỗ; hàng vẫn ở kho.
3. Bấm **Xuất chuyến** khi hàng rời kho. Hàng chuyển sang **Đang trung chuyển**, trạm gửi giảm tồn kho. Chỉ hủy gom chuyến khi chưa xuất.
4. Trạm đến mở **Xem kiện**, chọn những kiện thực tế đã nhận. Cho phép nhận một phần; kiện thiếu vẫn ở danh sách chưa nhận. Chỉ khi đủ kiện thì chuyến mới **Đã nhận đủ**.
5. Tại trạm trung gian, tiếp tục gom/xuất chuyến. Tại tỉnh giao cuối, hàng chuyển sang **Đã về trạm giao**.

Không tự xác nhận hàng đã tới nơi chỉ vì chuyến đã xuất. Các cập nhật nhiều kiện dùng transaction/khóa dòng MySQL: nếu một kiện không hợp lệ, hoàn tác cả yêu cầu; không đặt một kiện vào hai chuyến hiện hành.

## Giao hàng

Quản lý chọn nhiều kiện đã về trạm đích, bấm **Phân công giao đã chọn**, chọn nhân viên đang hoạt động tại trạm. Có thể đổi người giao trước khi xuất giao.

`Đã phân công giao → Đang giao → Hoàn thành / Chưa hoàn thành`

Kho chỉ giảm tồn khi người giao bắt đầu **Đang giao**. Dữ liệu lưu riêng người lấy và người giao. Đánh giá khách và xếp hạng giao hoàn thành gắn với người giao cuối. Nhân viên có thêm thống kê số đơn nhận lấy và đã bàn giao kho. Hoàn thành bắt buộc chụp ảnh bằng chứng giao hàng (tối đa 15 MiB). Ảnh phải thuộc nhân viên giao, đúng loại, chưa dùng; được gắn với sự kiện hoàn thành và xem trong chi tiết đơn. Giao thất bại vẫn yêu cầu lý do và ảnh; hàng ở người giao chưa tự được tính về kho.

## Hàng đang ở đâu

- **Hàng đang có trong kho**: có `ma_tram_hien_tai`, bao gồm kiện gom chuyến chưa xuất và kiện phân công giao chưa xuất.
- **Chờ nhân viên bàn giao**: chưa cộng tồn kho.
- **Chuyến đi / đến**: số đã nhận / tổng kiện; danh sách kiện thiếu.
- **Nhật ký nhập/xuất**: mã đơn, trạm, chuyến, thời gian, người xác nhận. Web hiện 20 lượt gần nhất; API có phân trang.

## CSDL, API và tương thích

Bốn bảng mới bằng tiếng Việt: `tram_chuyen_phat`, `chuyen_trung_chuyen`, `kien_trung_chuyen`, `nhat_ky_kho`. Đơn lưu trạm lấy/giao, kho hiện tại, người lấy/giao và chuyến hiện tại. Hồ sơ và tài khoản lưu trạm phụ trách. `ma_nhan_vien` cũ giữ tương thích với công đoạn đang phụ trách/người giao cuối; không dùng để suy ra người lấy của đơn qua trạm.

Swagger `/api-docs/` có nhóm **Trạm & kho**. Bộ lọc nhân viên `GET /orders?task=pickup` hoặc `task=delivery`; danh sách tài khoản có `station_id`. Quản lý trạm luôn bị giới hạn theo trạm trong tài khoản đăng nhập.

Migration giữ nguyên dữ liệu cũ, không bịa lịch sử nhập kho. Đơn lịch sử không có trạm tiếp tục luồng cũ; đơn mới nội tỉnh có thể giao thẳng, còn nội miền/liên miền khác tỉnh bắt buộc qua kho gửi và kho giao. Trạm trung gian do quản lý chọn theo chuyến thực tế, không tự sinh lịch sử đi qua mọi tỉnh. Cước vẫn theo báo giá đường bộ từ điểm lấy đến người nhận, không tự cộng quãng đường qua từng kho.

`schema.sql` là schema nền. Luôn chạy `db:migrate` để áp dụng cả schema nền và các migration đến 007, không chỉ import riêng schema.sql.

## Chọn trạm lấy gần nhất

### Bộ lọc kho và chuyến

- **Lọc kho**: mã vận đơn/người nhận, kho giao cuối, gói Tiêu chuẩn/Hỏa tốc và khoảng ngày nhân viên nhận vận chuyển. Bảng hiển thị gói và ngày của từng đơn. Tổng nhóm toàn kho và hàng chờ bàn giao được ghi riêng, không bị bộ lọc tồn che mất.
- **Lọc chuyến**: chuyến đi/chuyến đến so với trạm đang xem, mã chuyến/tên kho, trạng thái, gói dịch vụ và khoảng ngày xuất kho. Chuyến chưa xuất không khớp bộ lọc ngày xuất.
- Ngày lọc theo giờ Việt Nam, bao gồm cả ngày kết thúc. Chuyển trang giữ bộ lọc; thay bộ lọc về trang 1. Chuyến chứa ít nhất một kiện thuộc gói đã chọn được hiển thị; số kiện nhận/tổng vẫn tính toàn chuyến để kiểm nhận chính xác.

Backend dùng OSRM Table cho cả **trạm → điểm lấy** và **trạm → người nhận**, so sánh tất cả trạm đang hoạt động để chọn riêng từng đầu. Trạm có khoảng cách nhỏ nhất được chọn; bằng nhau thì ưu tiên mã trạm nhỏ hơn. Cước khách vẫn chỉ tính **điểm lấy → người nhận**, không cộng các chặng qua kho. Tuyến kho giao → người nhận chỉ hiển thị cho nhân viên được phân công ở bước giao cuối; không thay thế quãng đường/cước đã chốt của đơn.

Theo [tài liệu OSRM](https://project-osrm.org/docs/v5.24.0/api/#table-service), khoảng cách Table là độ dài tuyến được bộ định tuyến chọn theo thời gian đi, không bảo đảm đường có tổng số mét ngắn nhất trong mọi tuyến có thể đi. Hệ thống chọn giá trị khoảng cách nhỏ nhất giữa các trạm trên những tuyến đó; không dùng đường chim bay hoặc fallback_speed. Dữ liệu mạng đường phụ thuộc lần cập nhật của máy chủ OSRM, cache kết quả tối đa 5 phút.

Nếu thiếu ghim trạm, không có đường hoặc dịch vụ gián đoạn, báo lỗi để xử lý; không tự chọn trạm cùng tỉnh thay thế. Báo giá giữ kết quả chọn trạm; nếu cấu hình trạm đổi trước khi đặt đơn, cần tính lại báo giá. Thay vị trí trạm không tự chuyển các đơn đang vận chuyển.

API chặn danh sách, chi tiết, ảnh và nhận đơn chờ từ nhân viên khác trạm. Thông báo đơn mới cũng ẩn khi đơn đã được nhận hoặc đã chuyển sang trạm khác. Nhân viên đã tham gia đơn vẫn xem lịch sử công việc của mình.

## Khiếu nại khách hàng

Khách mở chi tiết đơn → **Khiếu nại đơn hàng**, nhập tiêu đề và nội dung. Mỗi đơn gửi một khiếu nại. Web Admin và quản lý trạm có mục **Khiếu nại**, tìm theo vận đơn/tiêu đề, lọc trạng thái, xem đơn/ảnh bằng chứng và phản hồi. Quản lý trạm chỉ xem khiếu nại của đơn liên quan trạm mình. Khách nhận thông báo và xem phản hồi trong chi tiết đơn.

Trạng thái: Chờ xử lý → Đang xử lý → Đã giải quyết / Từ chối; có thể giải quyết ngay từ Chờ xử lý. Phản hồi bắt buộc. Khiếu nại kết thúc không sửa tiếp; xử lý khiếu nại không tự đổi trạng thái đơn hay hoàn tiền.

App native chỉ mở camera cho bằng chứng giao hàng. API kiểm tra ảnh hợp lệ/quyền sở hữu/mục đích/chưa sử dụng; không xác thực được nội dung ảnh có đúng sự kiện giao hàng hay không. Các đơn đã hoàn thành trước nâng cấp được giữ nguyên, không tự tạo ảnh cho lịch sử cũ.

## Kiểm thử

`npm --prefix Backend run test:logistics`: tách người lấy/giao, nhiều kiện qua trạm trung gian, nhận từng phần, chống gom lẫn tỉnh/trùng kiện, phân quyền và giao diện web quản lý kho. Các lệnh `test:integration`, `test:migration`, `test:ui` kiểm tra hồi quy dữ liệu/API/app.

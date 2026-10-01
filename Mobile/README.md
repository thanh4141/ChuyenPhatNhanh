# CPN Mobile

Expo SDK 57, React Native 0.86, React 19.2, TypeScript .tsx. Khách và nhân viên dùng chung app; Admin dùng web.

## Chạy

```powershell
npm.cmd install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm.cmd start
```

Để trống `EXPO_PUBLIC_API_URL` trong `.env`: Expo Go tự lấy địa chỉ máy tính từ Expo trên mạng hiện tại và kết nối API cổng 3000. Khi đổi Wi-Fi, dừng Expo rồi chạy `npx expo start --lan --clear --port 8082` và quét QR mới. Backend phải đang chạy; điện thoại và máy tính cần kết nối được với nhau. Native lưu token SecureStore; bản web dùng bộ nhớ.

Wi-Fi trường có thể chặn kết nối giữa các thiết bị dù cùng tên mạng. Khi đó dùng điểm phát sóng cá nhân cho cả hai thiết bị hoặc một API triển khai công khai. Expo `--tunnel` chỉ chuyển tiếp Metro, không chuyển tiếp backend cổng 3000: nếu dùng tunnel, cần cấu hình `EXPO_PUBLIC_API_URL` thành URL API truy cập được từ điện thoại. Bản build phát hành cũng phải cấu hình URL API riêng.

## Màn hình

| File                    | Chức năng                                                           |
| ----------------------- | ------------------------------------------------------------------- |
| AuthScreen.tsx          | Đăng nhập, đăng ký khách                                            |
| OrdersScreen.tsx        | Lịch sử khách; đơn chờ/đã nhận của nhân viên; tìm/lọc/phân trang    |
| CreateOrderScreen.tsx   | Ảnh, mô tả, cân nặng, lấy/giao, extras, báo giá, tạo đơn            |
| AddressesScreen.tsx     | Thêm/sửa/xóa địa chỉ, mặc định, tỉnh/xã/thôn/chi tiết và ghim       |
| OrderDetailScreen.tsx   | Chi tiết, ảnh, đường đi, nhận đơn, trạng thái, sự cố, hủy, đánh giá |
| NotificationsScreen.tsx | Cập nhật 15 giây khi mở, đọc thông báo, mở đơn                      |
| ProfileScreen.tsx       | Cá nhân, mật khẩu; hồ sơ nhân viên, thống kê, sao/bình luận         |

MapPicker.tsx dùng WebView native; MapPicker.web.tsx dùng iframe. Cả hai tải MapLibre từ backend, trao đổi vị trí/đường đi bằng kênh riêng. Web kiểm tra origin và cửa sổ gửi. RouteButton hiển thị tuyến đã dùng tính giá. Camera/gallery dùng expo-image-picker, API nhận ảnh multipart ≤15 MiB.

OpenStreetMap không cần Google key. Đặt ghim/xác định tỉnh vẫn hoạt động khi Photon gián đoạn. [Cấu hình bản đồ](../docs/MAPS.md).

## Kiểm tra

```powershell
npm.cmd run typecheck
npm.cmd run check:native-text
npm.cmd run export:web
npx.cmd expo export --platform android --output-dir dist-android
```

Android export là bundle, không phải APK. UI tự động kiểm tra qua Expo web; camera, quyền thiết bị và WebView cần thử thêm trên điện thoại.

Sau khi cập nhật mã hoặc đổi `EXPO_PUBLIC_API_URL`, chạy `npx expo start --clear` rồi tải lại app trong Expo Go. Điện thoại và máy tính cần cùng mạng; mở `http://<IPv4-máy-tính>:3000/api/health` trên điện thoại để kiểm tra kết nối API.

Ảnh riêng tư được tải bằng `fetch` với Bearer token. Native hiển thị dữ liệu ảnh đã tải bằng data URI; web dùng blob URL và giải phóng khi rời màn hình. Lỗi tải ảnh có nút thử lại; HTTP 401 yêu cầu đăng nhập lại, HTTP 404 có thể do tệp không còn hoặc tài khoản không có quyền xem. Không đưa token vào đường dẫn ảnh.

Hoàn thành đơn: chọn Hoàn thành → Chụp ảnh bằng chứng → Xác nhận. App native yêu cầu quyền camera; nút xác nhận khóa đến khi tải ảnh xong. Không có nút chọn thư viện cho bằng chứng giao hàng. Khách thấy ảnh trong chi tiết đơn; cũng có thể gửi khiếu nại và cập nhật phản hồi tại đây.

Tab **Nhiệm vụ mới** chỉ hiển thị đơn quản lý phân công cho chính nhân viên tại trạm của mình. Nhân viên xác nhận hoặc báo không thể nhận kèm lý do. Tài khoản cần được gán trạm trong hồ sơ; nhân viên chưa được phân công không xem được chi tiết/ảnh của đơn chờ. Trạm lấy được chọn theo đường bộ, có thể ở tỉnh lân cận.

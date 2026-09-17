# CPN Mobile

App dùng Expo SDK 57, React Native 0.86, React 19.2 và TypeScript. Khách hàng và nhân viên dùng chung app; giao diện thay đổi theo vai trò do API trả về. Tài khoản Admin được hướng dẫn sử dụng web.

## Chạy

```powershell
npm.cmd install
# Nếu chưa có .env
Copy-Item .env.example .env
npm.cmd start
```

API phải chạy trước. Sửa `EXPO_PUBLIC_API_URL` trong `.env` theo thiết bị; điện thoại thật dùng IPv4 máy tính cùng mạng, Android Emulator dùng `10.0.2.2`, trình duyệt cùng máy dùng `localhost`. Xem [README gốc](../README.md) để cấu hình MySQL và tài khoản mẫu.

## Các màn hình `.tsx`

| File | Chức năng |
|---|---|
| `src/screens/AuthScreen.tsx` | Đăng nhập, đăng ký khách hàng |
| `src/screens/OrdersScreen.tsx` | Danh sách, tìm kiếm, bộ lọc, phân trang, kéo để tải lại |
| `src/screens/CreateOrderScreen.tsx` | Người gửi/nhận, kiện hàng, cước, COD, tạo đơn |
| `src/screens/OrderDetailScreen.tsx` | Chi tiết, lịch sử, cập nhật trạng thái, hủy đơn, gọi người nhận |
| `src/screens/TrackingScreen.tsx` | Tra cứu trạng thái theo mã |
| `src/screens/ProfileScreen.tsx` | Hồ sơ, đổi mật khẩu, đăng xuất |

`src/context/AuthContext.tsx` quản lí phiên. `src/services/api.ts` xử lý HTTP, timeout, lỗi xác thực và token. [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/) lưu token trên Android/iOS; bản web dùng bộ nhớ. Giao diện chung nằm trong `src/components/ui.tsx`.

## Kiểm tra / xuất bundle

```powershell
npm.cmd run typecheck
npx.cmd expo install --check
npm.cmd run export:web
npx.cmd expo export --platform android --output-dir dist-android
```

Bundle Android không phải file APK. Build APK/IPA cần cấu hình môi trường native hoặc dịch vụ build tương ứng. Các luồng giao diện được kiểm tra qua bản Expo web; cần chạy thêm trên thiết bị thật để kiểm tra trải nghiệm gọi điện, bàn phím và lưu token native.

`package.json` override `xcode > uuid` lên nhánh 11.1.1 để tránh bản uuid cũ có cảnh báo bảo mật; API `uuid.v4()` mà xcode sử dụng đã được kiểm tra. Không chạy `npm audit fix --force` vì có thể đổi Expo sang phiên bản không tương thích.

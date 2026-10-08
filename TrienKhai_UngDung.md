## 4.5.2. Triển khai ứng dụng

Mục tiêu của phần này là mô tả cách thức hệ thống chuyển phát nhanh được đóng gói và đưa vào môi trường thực tế (Production) để phục vụ Khách hàng, Nhân viên Shipper, Quản lý trạm và Quản trị viên.

### 1. Sơ đồ triển khai hệ thống (Deployment Diagram)

Biểu đồ dưới đây mô tả kiến trúc phần cứng và phần mềm nơi các thành phần của hệ thống được cài đặt và vận hành.

```plantuml
@startuml
!include https://static.visual-paradigm.com/web/resources/plantuml-stdlib/themes/vp.puml
left to right direction

node "Thiết bị Khách hàng & Shipper\n(Smartphone)" as MobileDevice {
  artifact "Mobile App\n(React Native - APK/IPA)" as MobileApp
}

node "Thiết bị Quản lý & Admin\n(PC / Laptop)" as PCDevice {
  component "Trình duyệt Web\n(Chrome, Edge, Safari)" as WebBrowser
}

node "Cloud Hosting\n(Vercel / Netlify)" as WebServer {
  artifact "Web Admin Frontend\n(ReactJS / Vite)" as WebAdmin
}

node "Cloud Server\n(AWS EC2 / DigitalOcean Droplet)" as APIServer {
  component "Backend API Server\n(Node.js / Express)" as NodeServer
}

node "Database Server\n(AWS RDS / Cloud SQL)" as DBServer {
  database "Cơ sở dữ liệu\n(MySQL 8.0)" as MySQL
}

' Kết nối
WebBrowser --> WebAdmin : HTTP/HTTPS
MobileApp ---> NodeServer : REST API (JSON) over HTTPS
WebAdmin ---> NodeServer : REST API (JSON) over HTTPS
NodeServer ---> MySQL : TCP/IP (Port 3306)
@enduml
```

### 2. Môi trường và Cấu hình triển khai

Hệ thống được chia làm 3 mảng triển khai độc lập nhằm đảm bảo hiệu năng và dễ dàng bảo trì:

**A. Triển khai Cơ sở dữ liệu (Database Tier):**
- **Công nghệ:** MySQL 8.0.
- **Môi trường:** Triển khai trên máy chủ đám mây (Cloud Database) chuyên dụng (ví dụ: Amazon RDS hoặc PlanetScale) nhằm đảm bảo tính toàn vẹn dữ liệu, khả năng sao lưu (backup) tự động và khả năng chịu lỗi (High Availability).
- **Cấu hình tối thiểu:** 2 vCPUs, 4GB RAM, 50GB SSD.

**B. Triển khai Máy chủ nghiệp vụ (Application/API Tier):**
- **Công nghệ:** Node.js (Express Framework).
- **Môi trường:** 
  - Mã nguồn Backend được đóng gói và đưa lên Cloud Server (như AWS EC2, DigitalOcean Droplet, hoặc Render).
  - Sử dụng công cụ `PM2` để quản lý tiến trình (Process Manager), giúp server tự động khởi động lại khi có lỗi (Auto-restart) và hỗ trợ cân bằng tải (Load balancing).
- **Bảo mật:** Cài đặt chứng chỉ SSL/TLS để mã hóa dữ liệu truyền tải (HTTPS), bảo vệ thông tin cá nhân của khách hàng và mã vận đơn.

**C. Triển khai Giao diện người dùng (Client Tier):**
- **Web Admin (Dành cho Quản lý trạm và Quản trị viên):** 
  - Ứng dụng React được build ra các file tĩnh (HTML, CSS, JS).
  - Triển khai lên các nền tảng Hosting tối ưu cho Frontend (như Vercel, Netlify) đi kèm với Mạng phân phối nội dung (CDN) để tăng tốc độ tải trang.
- **Mobile App (Dành cho Khách hàng và Shipper):** 
  - Ứng dụng React Native được xuất ra các file thực thi.
  - **Android:** Build ra file `.apk` / `.aab` và phân phối qua Google Play Store hoặc cài đặt nội bộ trực tiếp cho Shipper.
  - **iOS:** Phân phối qua Apple App Store hoặc thông qua TestFlight.

---

## 4.5.3. Hướng dẫn cài đặt và vận hành hệ thống (Dành cho môi trường phát triển)

Để phục vụ cho việc kiểm thử và chạy thử nghiệm hệ thống trên máy cá nhân (Localhost), hệ thống yêu cầu các công cụ và bước cài đặt như sau:

**1. Yêu cầu hệ thống (Prerequisites)**
- Node.js phiên bản ≥ 22.13.
- Cơ sở dữ liệu MySQL phiên bản 8.0 trở lên.
- Môi trường Mobile: App Expo Go (để test trên thiết bị thật) hoặc Android Studio Emulator.

**2. Khởi tạo Cơ sở dữ liệu (Database)**
- Khởi động service MySQL tại local (mặc định Port `3307` cho môi trường dev).
- Cấu hình file `Backend/.env` với các thông tin kết nối Database, cấu hình JWT Token.
- Tiến hành chạy Migration để tạo cấu trúc bảng và Seed để nạp dữ liệu mẫu:
  ```bash
  npm run db:migrate
  npm run db:seed
  ```

**3. Khởi động Backend API Server**
- Khởi động server Node.js:
  ```bash
  npm start
  ```
- Server Backend sẽ chạy tại: `http://localhost:3000`.
- Tài liệu API (Swagger) có thể truy cập tại: `http://localhost:3000/api-docs/`.

**4. Khởi động Client (Web Admin và Mobile App)**
- **Web Admin:** Phục vụ trực tiếp qua các file tĩnh tại `http://localhost:3000` hoặc export web riêng tại `http://localhost:8081`.
- **Mobile App:** Khởi động thông qua Expo:
  ```bash
  npm --prefix Mobile start
  ```
- Dùng ứng dụng Expo Go trên điện thoại quét mã QR để chạy app, đảm bảo điện thoại và máy tính lập trình cùng kết nối chung một mạng Wi-Fi (LAN).

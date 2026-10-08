# Phân hệ Khách hàng (Customer)

Tài liệu này đặc tả chi tiết quá trình thực hiện (luồng sự kiện) và phân rã các bước luồng sự kiện thành các Use Case con (`<<include>>` / `<<extend>>`) trên từng biểu đồ riêng biệt.

---

## 1. UC_KH1: Quản lý tài khoản & hồ sơ

**Luồng sự kiện (Phân rã UC):**
- **Luồng chính:** Khách hàng bắt buộc phải **Đăng nhập** (`<<include>>`). Sau đó, Khách hàng **Xem hồ sơ cá nhân** (`<<include>>`).
- **Luồng phụ:** Từ chức năng xem hồ sơ, khách hàng có thể chọn **Cập nhật thông tin** (Họ tên, SĐT) (`<<extend>>`) hoặc **Đổi mật khẩu** (`<<extend>>`) nếu có nhu cầu.

```plantuml
@startuml
!include https://static.visual-paradigm.com/web/resources/plantuml-stdlib/themes/vp.puml
left to right direction
skinparam actorBorderColor Black
skinparam usecaseBorderColor Black
skinparam arrowColor Black

actor "Khách hàng" as KH
rectangle "UC_KH1: Quản lý tài khoản & hồ sơ" {
  usecase "Quản lý tài khoản & hồ sơ\n--\nextension points\n- Cập nhật thông tin\n- Đổi mật khẩu" as UC_Base
  usecase "Đăng nhập" as UC_Login
  usecase "Xem hồ sơ cá nhân" as UC_View
  usecase "Cập nhật thông tin" as UC_Update
  usecase "Đổi mật khẩu" as UC_Password
}

KH -- UC_Base
UC_Base ..> UC_Login : <<include>>
UC_Base ..> UC_View : <<include>>
UC_Update ..> UC_Base : <<extend>>
UC_Password ..> UC_Base : <<extend>>
@enduml
```

---

## 2. UC_KH2: Quản lý địa chỉ

**Luồng sự kiện (Phân rã UC):**
- **Luồng chính:** Khách hàng **Đăng nhập** (`<<include>>`), sau đó **Xem danh sách địa chỉ** (`<<include>>`).
- **Luồng phụ:** Khách hàng có thể **Thêm địa chỉ mới** (`<<extend>>`), **Sửa địa chỉ** (`<<extend>>`), hoặc **Xóa địa chỉ** (`<<extend>>`).
- Khi Thêm hoặc Sửa địa chỉ, khách hàng luôn phải **Chọn tọa độ bản đồ** (`<<include>>` từ Thêm/Sửa).

```plantuml
@startuml
!include https://static.visual-paradigm.com/web/resources/plantuml-stdlib/themes/vp.puml
left to right direction
skinparam actorBorderColor Black
skinparam usecaseBorderColor Black
skinparam arrowColor Black

actor "Khách hàng" as KH
rectangle "UC_KH2: Quản lý địa chỉ" {
  usecase "Quản lý địa chỉ\n--\nextension points\n- Thêm địa chỉ mới\n- Sửa địa chỉ\n- Xóa địa chỉ" as UC_Base
  usecase "Đăng nhập" as UC_Login
  usecase "Xem danh sách địa chỉ" as UC_View
  usecase "Thêm địa chỉ mới" as UC_Add
  usecase "Sửa địa chỉ" as UC_Edit
  usecase "Xóa địa chỉ" as UC_Del
  usecase "Chọn tọa độ bản đồ" as UC_Map
}

KH -- UC_Base
UC_Base ..> UC_Login : <<include>>
UC_Base ..> UC_View : <<include>>
UC_Add ..> UC_Base : <<extend>>
UC_Edit ..> UC_Base : <<extend>>
UC_Del ..> UC_Base : <<extend>>

UC_Add ..> UC_Map : <<include>>
UC_Edit ..> UC_Map : <<include>>
@enduml
```

---

## 3. UC_KH3: Tạo đơn hàng

**Luồng sự kiện (Phân rã UC):**
- **Luồng chính:** Khách hàng **Đăng nhập** (`<<include>>`). Để tạo đơn, bắt buộc phải **Chọn địa chỉ gửi/nhận** (`<<include>>`), **Nhập thông tin kiện hàng** (`<<include>>`), **Xem báo giá tính cước** (`<<include>>`), và **Xác nhận tạo đơn** (`<<include>>`).
- **Luồng phụ:** Khi nhập thông tin, khách hàng có thể tùy chọn **Chọn dịch vụ gia tăng (COD, Bảo hiểm)** (`<<extend>>`).

```plantuml
@startuml
!include https://static.visual-paradigm.com/web/resources/plantuml-stdlib/themes/vp.puml
left to right direction
skinparam actorBorderColor Black
skinparam usecaseBorderColor Black
skinparam arrowColor Black

actor "Khách hàng" as KH
rectangle "UC_KH3: Tạo đơn hàng" {
  usecase "Tạo đơn hàng\n--\nextension points\n- Chọn dịch vụ gia tăng" as UC_Base
  usecase "Đăng nhập" as UC_Login
  usecase "Chọn địa chỉ gửi/nhận" as UC_Addr
  usecase "Nhập thông tin kiện hàng" as UC_Info
  usecase "Chọn dịch vụ gia tăng" as UC_Extra
  usecase "Xem báo giá tính cước" as UC_Price
  usecase "Xác nhận tạo đơn" as UC_Confirm
}

KH -- UC_Base
UC_Base ..> UC_Login : <<include>>
UC_Base ..> UC_Addr : <<include>>
UC_Base ..> UC_Info : <<include>>
UC_Extra ..> UC_Base : <<extend>>
UC_Base ..> UC_Price : <<include>>
UC_Base ..> UC_Confirm : <<include>>
@enduml
```

**Biểu đồ Tuần tự (Sequence Diagram) - Tạo đơn hàng:**

```plantuml
@startuml
!include https://static.visual-paradigm.com/web/resources/plantuml-stdlib/themes/vp.puml
skinparam maxMessageSize 150
skinparam actorBorderColor Black
skinparam sequenceParticipantBorderColor Black
skinparam sequenceLifeLineBorderColor Black
skinparam sequenceGroupBodyBackgroundColor White

actor "Khách hàng" as KH
boundary "Màn hình Tạo đơn" as App
control "Order API" as API
entity "Bảng don_hang, cước" as DB

KH -> App: 1.1: Nhập thông tin người gửi, nhận & kiện hàng
activate App
App -> API: 1.1.1: Request tính cước (khối lượng, tuyến đường)
activate API
API -> DB: 1.1.1.1: Query bảng cước & dịch vụ
activate DB
DB --> API: 1.1.1.2: Trả về công thức/đơn giá
deactivate DB
API --> App: 1.1.2: Trả về báo giá & thời gian dự kiến
deactivate API
App --> KH: 1.2: Hiển thị báo giá trên màn hình

KH -> App: 2.1: Chọn dịch vụ thêm (nếu có) & Xác nhận
App -> API: 2.1.1: Gửi request tạo đơn hàng (POST /orders)
activate API

alt Thông tin hợp lệ
    API -> DB: 2.1.1.1: Insert record vào 'don_hang' (trạng thái pending)
    activate DB
    DB --> API: 2.1.1.2: Trả về kết quả (ID, Mã vận đơn)
    deactivate DB
    API --> App: 2.1.2: Tạo đơn thành công
    App --> KH: 2.2: Hiển thị mã vận đơn & mã QR
else Thiếu thông tin / Lỗi cước
    API --> App: 2.1.3: Trả về lỗi (Bad Request)
    App --> KH: 2.3: Hiển thị thông báo lỗi, yêu cầu thử lại
end
deactivate API
deactivate App
@enduml
```

**Biểu đồ Hoạt động (Activity Diagram) - Tạo đơn hàng:**

```plantuml
@startuml
!include https://static.visual-paradigm.com/web/resources/plantuml-stdlib/themes/vp.puml

start
:Khách hàng chọn chức năng "Tạo đơn hàng";
:Nhập thông tin người gửi và người nhận;
:Nhập thông tin kiện hàng (Khối lượng, Kích thước);
:Chọn Dịch vụ vận chuyển (Hỏa tốc, Tiêu chuẩn, ...);
if (Kiểm tra dữ liệu?) then (Hợp lệ)
  :Hệ thống tính toán và hiển thị Báo giá cước;
  if (Xác nhận tạo đơn?) then (Đồng ý)
    :Lưu đơn hàng vào cơ sở dữ liệu;
    :Tạo mã vận đơn thành công;
  else (Hủy bỏ)
  endif
elseif (Thiếu thông tin bắt buộc) then ( )
  :Hiển thị thông báo yêu cầu nhập đầy đủ;
elseif (Dịch vụ không hỗ trợ tuyến đường) then ( )
  :Thông báo tuyến đường chưa được khai thác;
endif
stop
@enduml
```

---

## 4. UC_KH4: Theo dõi & Quản lý đơn hàng

**Luồng sự kiện (Phân rã UC):**
- **Luồng chính:** Khách hàng **Đăng nhập** (`<<include>>`), sau đó **Xem danh sách đơn hàng** (`<<include>>`).
- **Luồng phụ:** Từ danh sách, khách hàng có thể **Xem chi tiết lộ trình tracking** (`<<extend>>`) hoặc **Yêu cầu hủy đơn** (`<<extend>>`) nếu đơn đang chờ lấy.

**Biểu đồ Hoạt động (Activity Diagram) - Theo dõi & Quản lý đơn hàng:**

```plantuml
@startuml
!include https://static.visual-paradigm.com/web/resources/plantuml-stdlib/themes/vp.puml

start
:Khách hàng chọn chức năng "Theo dõi đơn hàng";
:Nhập mã vận đơn (hoặc chọn từ danh sách);
if (Kiểm tra mã vận đơn?) then (Tồn tại)
  :Truy vấn lịch sử hành trình từ CSDL;
  :Hiển thị chi tiết trạng thái hiện tại (Đang giao, Đã lấy, ...);
  :Hiển thị vị trí/tọa độ hiện tại (nếu có);
else (Không tồn tại)
  :Hiển thị thông báo "Không tìm thấy đơn hàng";
endif
stop
@enduml
```

```plantuml
@startuml
!include https://static.visual-paradigm.com/web/resources/plantuml-stdlib/themes/vp.puml
left to right direction
skinparam actorBorderColor Black
skinparam usecaseBorderColor Black
skinparam arrowColor Black

actor "Khách hàng" as KH
rectangle "UC_KH4: Theo dõi & Quản lý đơn hàng" {
  usecase "Quản lý đơn hàng\n--\nextension points\n- Xem chi tiết lộ trình\n- Yêu cầu hủy đơn" as UC_Base
  usecase "Đăng nhập" as UC_Login
  usecase "Xem danh sách đơn hàng" as UC_List
  usecase "Xem chi tiết lộ trình" as UC_Track
  usecase "Yêu cầu hủy đơn" as UC_Cancel
}

KH -- UC_Base
UC_Base ..> UC_Login : <<include>>
UC_Base ..> UC_List : <<include>>
UC_Track ..> UC_Base : <<extend>>
UC_Cancel ..> UC_Base : <<extend>>
@enduml
```

---

## 5. UC_KH5: Đánh giá chất lượng phục vụ

**Luồng sự kiện (Phân rã UC):**
- **Luồng chính:** Khách hàng **Đăng nhập** (`<<include>>`), **Chọn đơn hàng đã hoàn thành** (`<<include>>`), bắt buộc **Chấm điểm sao (1-5)** (`<<include>>`) và **Gửi đánh giá** (`<<include>>`).
- **Luồng phụ:** Trong lúc đánh giá, khách hàng có thể tùy chọn **Viết nhận xét văn bản** (`<<extend>>`).

```plantuml
@startuml
!include https://static.visual-paradigm.com/web/resources/plantuml-stdlib/themes/vp.puml
left to right direction
skinparam actorBorderColor Black
skinparam usecaseBorderColor Black
skinparam arrowColor Black

actor "Khách hàng" as KH
rectangle "UC_KH5: Đánh giá chất lượng phục vụ" {
  usecase "Đánh giá dịch vụ\n--\nextension points\n- Viết nhận xét" as UC_Base
  usecase "Đăng nhập" as UC_Login
  usecase "Chọn đơn hàng hoàn thành" as UC_Select
  usecase "Chấm điểm sao" as UC_Star
  usecase "Viết nhận xét" as UC_Comment
  usecase "Gửi đánh giá" as UC_Submit
}

KH -- UC_Base
UC_Base ..> UC_Login : <<include>>
UC_Base ..> UC_Select : <<include>>
UC_Base ..> UC_Star : <<include>>
UC_Comment ..> UC_Base : <<extend>>
UC_Base ..> UC_Submit : <<include>>
@enduml
```

---

## 6. UC_KH6: Gửi khiếu nại đơn hàng

**Luồng sự kiện (Phân rã UC):**
- **Luồng chính:** Khách hàng **Đăng nhập** (`<<include>>`), **Chọn đơn hàng gặp sự cố** (`<<include>>`), **Nhập nội dung khiếu nại** (`<<include>>`), và **Gửi yêu cầu khiếu nại** (`<<include>>`).
- **Luồng phụ:** Khách hàng có thể đính kèm thêm **Tải ảnh minh chứng** (`<<extend>>`) để làm bằng chứng.

```plantuml
@startuml
!include https://static.visual-paradigm.com/web/resources/plantuml-stdlib/themes/vp.puml
left to right direction
skinparam actorBorderColor Black
skinparam usecaseBorderColor Black
skinparam arrowColor Black

actor "Khách hàng" as KH
rectangle "UC_KH6: Gửi khiếu nại đơn hàng" {
  usecase "Gửi khiếu nại\n--\nextension points\n- Tải ảnh minh chứng" as UC_Base
  usecase "Đăng nhập" as UC_Login
  usecase "Chọn đơn hàng sự cố" as UC_Select
  usecase "Nhập nội dung khiếu nại" as UC_Text
  usecase "Tải ảnh minh chứng" as UC_Image
  usecase "Gửi yêu cầu" as UC_Submit
}

KH -- UC_Base
UC_Base ..> UC_Login : <<include>>
UC_Base ..> UC_Select : <<include>>
UC_Base ..> UC_Text : <<include>>
UC_Image ..> UC_Base : <<extend>>
UC_Base ..> UC_Submit : <<include>>
@enduml
```

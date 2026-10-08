# Phân hệ Quản lý trạm (Station Manager)

Tài liệu này đặc tả chi tiết quá trình thực hiện (luồng sự kiện) và phân rã các bước luồng sự kiện thành các Use Case con (`<<include>>` / `<<extend>>`) trên từng biểu đồ riêng biệt.

---

## 1. UC_QL1: Quản lý nhân viên tại trạm

**Luồng sự kiện (Phân rã UC):**
- **Luồng chính:** Quản lý trạm **Đăng nhập** (`<<include>>`), **Xem danh sách shipper thuộc trạm** (`<<include>>`).
- **Luồng phụ:** Có thể **Thêm nhân viên mới** (`<<extend>>`) hoặc **Sửa/Khóa hồ sơ nhân viên** (`<<extend>>`).

```plantuml
@startuml
!include https://static.visual-paradigm.com/web/resources/plantuml-stdlib/themes/vp.puml
left to right direction
skinparam actorBorderColor Black
skinparam usecaseBorderColor Black
skinparam arrowColor Black

actor "Quản lý trạm" as QL
rectangle "UC_QL1: Quản lý nhân viên tại trạm" {
  usecase "Quản lý nhân viên\n--\nextension points\n- Thêm nhân viên mới\n- Sửa/Khóa hồ sơ" as UC_Base
  usecase "Đăng nhập" as UC_Login
  usecase "Xem danh sách shipper" as UC_List
  usecase "Thêm nhân viên mới" as UC_Add
  usecase "Sửa/Khóa hồ sơ" as UC_Edit
}

QL -- UC_Base
UC_Base ..> UC_Login : <<include>>
UC_Base ..> UC_List : <<include>>
UC_Add ..> UC_Base : <<extend>>
UC_Edit ..> UC_Base : <<extend>>
@enduml
```

---

## 2. UC_QL2: Phân công lấy hàng

**Luồng sự kiện (Phân rã UC):**
- **Luồng chính:** Quản lý trạm **Đăng nhập** (`<<include>>`), **Xem danh sách đơn chờ lấy** (`<<include>>`), **Chọn Shipper trực thuộc** (`<<include>>`), và **Gửi lệnh phân công** (`<<include>>`).

```plantuml
@startuml
!include https://static.visual-paradigm.com/web/resources/plantuml-stdlib/themes/vp.puml
left to right direction
skinparam actorBorderColor Black
skinparam usecaseBorderColor Black
skinparam arrowColor Black

actor "Quản lý trạm" as QL
rectangle "UC_QL2: Phân công lấy hàng" {
  usecase "Phân công lấy hàng (Base)" as UC_Base
  usecase "Đăng nhập" as UC_Login
  usecase "Xem danh sách đơn chờ lấy" as UC_List
  usecase "Chọn Shipper trực thuộc" as UC_Select
  usecase "Gửi lệnh phân công" as UC_Assign
}

QL -- UC_Base
UC_Base ..> UC_Login : <<include>>
UC_Base ..> UC_List : <<include>>
UC_Base ..> UC_Select : <<include>>
UC_Base ..> UC_Assign : <<include>>
@enduml
```

**Biểu đồ Tuần tự (Sequence Diagram) - Phân công lấy hàng:**

```plantuml
@startuml
!include https://static.visual-paradigm.com/web/resources/plantuml-stdlib/themes/vp.puml
skinparam maxMessageSize 150
skinparam actorBorderColor Black
skinparam sequenceParticipantBorderColor Black
skinparam sequenceLifeLineBorderColor Black
skinparam sequenceGroupBodyBackgroundColor White

actor "Quản lý trạm" as QL
boundary "Màn hình Điều phối" as App
control "Order API" as API
entity "Bảng don_hang, thong_bao" as DB
actor "Nhân viên" as NV

QL -> App: 1.1: Xem danh sách đơn 'pending' & Chọn Shipper
activate App
App -> API: 1.1.1: Request phân công (POST /orders/assign)
activate API

alt Chọn Shipper hợp lệ
    API -> DB: 1.1.1.1: Update 'don_hang' (nhan_vien_id, trạng thái: awaiting_pickup)
    activate DB
    DB --> API: 1.1.1.2: Ghi log 'lich_su_don_hang'
    deactivate DB
    
    API -> DB: 1.1.1.3: Tạo bản ghi 'thong_bao' cho Shipper
    activate DB
    DB --> API: 1.1.1.4: Xác nhận lưu thông báo
    deactivate DB
    
    API -> NV: 1.1.2: Push Notification: "Bạn có đơn hàng mới cần lấy"
    API --> App: 1.1.3: Xác nhận phân công thành công
    App --> QL: 1.2: Hiển thị thông báo thành công & Cập nhật danh sách
else Shipper đang quá tải / Offline
    API --> App: 1.1.4: Trả về lỗi (Shipper unavailable)
    App --> QL: 1.3: Hiển thị cảnh báo, yêu cầu chọn Shipper khác
end
deactivate API
deactivate App
@enduml
```

**Biểu đồ Hoạt động (Activity Diagram) - Phân công lấy hàng:**

```plantuml
@startuml
!include https://static.visual-paradigm.com/web/resources/plantuml-stdlib/themes/vp.puml

start
:Quản lý trạm chọn chức năng "Phân công lấy hàng";
:Hiển thị danh sách đơn hàng 'Pending' trong khu vực;
:Chọn các đơn hàng cần phân công;
:Chọn Shipper đang hoạt động (Online);
if (Kiểm tra trạng thái Shipper?) then (Sẵn sàng)
  :Bấm "Xác nhận phân công";
  :Hệ thống cập nhật ID người lấy vào đơn hàng;
  :Gửi thông báo (Push Notification) đến Shipper;
elseif (Shipper đang quá tải / Offline) then ( )
  :Hiển thị cảnh báo không thể phân công;
  :Yêu cầu chọn Shipper khác;
endif
stop
@enduml
```

---

## 3. UC_QL3: Vận hành kho trạm

**Luồng sự kiện (Phân rã UC):**
- **Luồng chính:** Quản lý trạm **Đăng nhập** (`<<include>>`), **Xem tồn kho hiện tại** (`<<include>>`).
- **Luồng phụ:** Thực hiện **Quét mã vạch nhập kho** (`<<extend>>`). Nếu có kiện nhập kho, bắt buộc **Xác nhận nhập kho** (`<<include>>` từ Quét mã).

```plantuml
@startuml
!include https://static.visual-paradigm.com/web/resources/plantuml-stdlib/themes/vp.puml
left to right direction
skinparam actorBorderColor Black
skinparam usecaseBorderColor Black
skinparam arrowColor Black

actor "Quản lý trạm" as QL
rectangle "UC_QL3: Vận hành kho trạm" {
  usecase "Vận hành kho\n--\nextension points\n- Quét mã vạch nhập kho" as UC_Base
  usecase "Đăng nhập" as UC_Login
  usecase "Xem tồn kho hiện tại" as UC_List
  usecase "Quét mã vạch nhập kho" as UC_Scan
  usecase "Xác nhận nhập kho" as UC_Confirm
}

QL -- UC_Base
UC_Base ..> UC_Login : <<include>>
UC_Base ..> UC_List : <<include>>
UC_Scan ..> UC_Base : <<extend>>
UC_Scan ..> UC_Confirm : <<include>>
@enduml
```

**Biểu đồ Hoạt động (Activity Diagram) - Vận hành kho trạm (Nhập kho):**

```plantuml
@startuml
!include https://static.visual-paradigm.com/web/resources/plantuml-stdlib/themes/vp.puml

start
:Quản lý trạm chọn chức năng "Nhập kho";
:Dùng máy quét Barcode quét mã trên kiện hàng;
if (Kiểm tra mã đơn hàng?) then (Tồn tại & Hợp lệ)
  :Hệ thống ghi nhận kiện hàng đã vào kho (In-stock);
  :Cập nhật trạng thái và lịch sử đơn hàng;
  :Hiển thị thông báo "Nhập kho thành công";
elseif (Mã không hợp lệ / Sai tuyến) then ( )
  :Phát tín hiệu cảnh báo lỗi;
  :Hiển thị thông báo "Mã không khớp trạm";
endif
stop
@enduml
```

---

## 4. UC_QL4: Quản lý chuyến trung chuyển

**Luồng sự kiện (Phân rã UC):**
- **Luồng chính:** Quản lý trạm **Đăng nhập** (`<<include>>`), xử lý luồng in/out.
- **Luồng phụ (Xuất chuyến):** **Gom đơn tạo chuyến xe** (`<<extend>>`) và **Xuất chuyến đi** (`<<extend>>`).
- **Luồng phụ (Nhận chuyến):** **Nhận chuyến xe đến** (`<<extend>>`). Khi nhận chuyến đến bắt buộc phải **Kiểm nhận kiện hàng** (`<<include>>` từ Nhận chuyến).

```plantuml
@startuml
!include https://static.visual-paradigm.com/web/resources/plantuml-stdlib/themes/vp.puml
left to right direction
skinparam actorBorderColor Black
skinparam usecaseBorderColor Black
skinparam arrowColor Black

actor "Quản lý trạm" as QL
rectangle "UC_QL4: Quản lý chuyến trung chuyển" {
  usecase "Quản lý trung chuyển\n--\nextension points\n- Gom đơn tạo chuyến\n- Xuất chuyến đi\n- Nhận chuyến xe đến" as UC_Base
  usecase "Đăng nhập" as UC_Login
  usecase "Gom đơn tạo chuyến" as UC_Group
  usecase "Xuất chuyến đi" as UC_Dispatch
  usecase "Nhận chuyến xe đến" as UC_Arrive
  usecase "Kiểm nhận kiện hàng" as UC_Verify
}

QL -- UC_Base
UC_Base ..> UC_Login : <<include>>
UC_Group ..> UC_Base : <<extend>>
UC_Dispatch ..> UC_Base : <<extend>>
UC_Arrive ..> UC_Base : <<extend>>
UC_Arrive ..> UC_Verify : <<include>>
@enduml
```

**Biểu đồ Tuần tự (Sequence Diagram) - Quản lý chuyến trung chuyển (Xuất chuyến đi):**

```plantuml
@startuml
!include https://static.visual-paradigm.com/web/resources/plantuml-stdlib/themes/vp.puml
skinparam maxMessageSize 150
skinparam actorBorderColor Black
skinparam sequenceParticipantBorderColor Black
skinparam sequenceLifeLineBorderColor Black
skinparam sequenceGroupBodyBackgroundColor White

actor "Quản lý trạm" as QL
boundary "Màn hình Tạo chuyến" as App
control "Transport API" as API
entity "Bảng chuyen_trung_chuyen" as DB

QL -> App: 1.1: Chọn các đơn hàng & Tạo chuyến xe
activate App
App -> API: 1.1.1: Request tạo chuyến (POST /transport-trips)
activate API

alt Danh sách đơn hàng hợp lệ
    API -> DB: 1.1.1.1: Insert 'chuyen_trung_chuyen' (trạm gửi, trạm đích)
    activate DB
    DB --> API: 1.1.1.2: Trả về ID chuyến
    deactivate DB
    
    API -> DB: 1.1.1.3: Insert vào 'kien_trung_chuyen' cho từng đơn
    activate DB
    DB --> API: 1.1.1.4: Update trạng thái 'don_hang' (delivering)
    deactivate DB
    
    API -> DB: 1.1.1.5: Ghi 'nhat_ky_kho' (Xuất kho)
    activate DB
    DB --> API: 1.1.1.6: Hoàn tất giao dịch (Commit)
    deactivate DB
    
    API --> App: 1.1.2: Trả về mã chuyến xe & Xác nhận
    App --> QL: 1.2: Hiển thị thông báo Xuất chuyến thành công
else Lỗi xe hoặc Trạm đích không khả dụng
    API --> App: 1.1.3: Trả về lỗi không thể tạo chuyến
    App --> QL: 1.3: Thông báo lỗi, hủy thao tác
end
deactivate API
deactivate App
@enduml
```

**Biểu đồ Hoạt động (Activity Diagram) - Xuất chuyến đi (Tạo chuyến xe):**

```plantuml
@startuml
!include https://static.visual-paradigm.com/web/resources/plantuml-stdlib/themes/vp.puml

start
:Quản lý trạm chọn chức năng "Tạo chuyến xe";
:Chọn trạm đích đến;
:Quét mã hoặc chọn các kiện hàng cần xuất kho;
if (Kiểm tra tuyến đường & sức chứa?) then (Hợp lệ)
  :Bấm xác nhận "Xuất chuyến đi";
  :Hệ thống tạo bản ghi Chuyến trung chuyển;
  :Gán các kiện hàng vào chuyến xe;
  :Cập nhật trạng thái đơn hàng (Delivering);
  :Ghi nhật ký Xuất kho thành công;
elseif (Không có xe khả dụng) then ( )
  :Hiển thị thông báo xe đang bận;
elseif (Hàng hóa không cùng tuyến) then ( )
  :Thông báo kiện hàng không khớp trạm đích;
endif
stop
@enduml
```

---

## 5. UC_QL5: Phân công giao hàng

**Luồng sự kiện (Phân rã UC):**
- **Luồng chính:** Quản lý trạm **Đăng nhập** (`<<include>>`), **Xem danh sách đơn chờ phát** (`<<include>>`), **Chọn Shipper tuyến phát** (`<<include>>`), và **Gửi lệnh phân công giao** (`<<include>>`).

```plantuml
@startuml
!include https://static.visual-paradigm.com/web/resources/plantuml-stdlib/themes/vp.puml
left to right direction
skinparam actorBorderColor Black
skinparam usecaseBorderColor Black
skinparam arrowColor Black

actor "Quản lý trạm" as QL
rectangle "UC_QL5: Phân công giao hàng" {
  usecase "Phân công giao (Base)" as UC_Base
  usecase "Đăng nhập" as UC_Login
  usecase "Xem danh sách đơn chờ phát" as UC_List
  usecase "Chọn Shipper tuyến phát" as UC_Select
  usecase "Gửi lệnh phân công giao" as UC_Assign
}

QL -- UC_Base
UC_Base ..> UC_Login : <<include>>
UC_Base ..> UC_List : <<include>>
UC_Base ..> UC_Select : <<include>>
UC_Base ..> UC_Assign : <<include>>
@enduml
```

**Biểu đồ Hoạt động (Activity Diagram) - Phân công giao hàng:**

```plantuml
@startuml
!include https://static.visual-paradigm.com/web/resources/plantuml-stdlib/themes/vp.puml

start
:Quản lý trạm chọn chức năng "Phân công giao hàng";
:Hiển thị danh sách đơn hàng đã tới trạm đích;
:Chọn các đơn hàng cần giao;
:Chọn Shipper phụ trách khu vực giao;
if (Kiểm tra trạng thái Shipper?) then (Sẵn sàng)
  :Bấm "Xác nhận phân công";
  :Hệ thống cập nhật ID người giao vào đơn hàng;
  :Gửi thông báo (Push Notification) đến Shipper;
elseif (Shipper đang quá tải / Offline) then ( )
  :Hiển thị cảnh báo không thể phân công;
endif
stop
@enduml
```

---

## 6. UC_QL6: Xử lý sự cố & Khiếu nại tại trạm

**Luồng sự kiện (Phân rã UC):**
- **Luồng chính:** Quản lý trạm **Đăng nhập** (`<<include>>`), **Xem báo cáo sự cố (từ Shipper)** (`<<include>>`), và **Phản hồi hướng giải quyết** (`<<include>>`).
- **Luồng phụ:** Trước khi giải quyết, có thể cần **Liên hệ xác minh khách hàng** (`<<extend>>`).

```plantuml
@startuml
!include https://static.visual-paradigm.com/web/resources/plantuml-stdlib/themes/vp.puml
left to right direction
skinparam actorBorderColor Black
skinparam usecaseBorderColor Black
skinparam arrowColor Black

actor "Quản lý trạm" as QL
rectangle "UC_QL6: Xử lý sự cố & Khiếu nại" {
  usecase "Xử lý sự cố trạm\n--\nextension points\n- Liên hệ xác minh khách" as UC_Base
  usecase "Đăng nhập" as UC_Login
  usecase "Xem báo cáo sự cố" as UC_List
  usecase "Liên hệ xác minh khách" as UC_Call
  usecase "Phản hồi hướng giải quyết" as UC_Reply
}

QL -- UC_Base
UC_Base ..> UC_Login : <<include>>
UC_Base ..> UC_List : <<include>>
UC_Call ..> UC_Base : <<extend>>
UC_Base ..> UC_Reply : <<include>>
@enduml
```

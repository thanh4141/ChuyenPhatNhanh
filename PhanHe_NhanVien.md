# Phân hệ Nhân viên (Shipper)

Tài liệu này đặc tả chi tiết quá trình thực hiện (luồng sự kiện) và phân rã các bước luồng sự kiện thành các Use Case con (`<<include>>` / `<<extend>>`) trên từng biểu đồ riêng biệt.

---

## 1. UC_NV1: Tiếp nhận nhiệm vụ lấy/giao hàng

**Luồng sự kiện (Phân rã UC):**
- **Luồng chính:** Nhân viên **Đăng nhập** (`<<include>>`), sau đó **Xem danh sách nhiệm vụ được phân công** (`<<include>>`).
- **Luồng phụ:** Nhân viên có thể **Chấp nhận nhiệm vụ** (`<<extend>>`) hoặc **Từ chối nhiệm vụ** (`<<extend>>`). Nếu từ chối, bắt buộc phải **Ghi lý do từ chối** (`<<include>>` từ Từ chối nhiệm vụ).

```plantuml
@startuml
!include https://static.visual-paradigm.com/web/resources/plantuml-stdlib/themes/vp.puml
left to right direction
skinparam actorBorderColor Black
skinparam usecaseBorderColor Black
skinparam arrowColor Black

actor "Nhân viên" as NV
rectangle "UC_NV1: Tiếp nhận nhiệm vụ lấy/giao hàng" {
  usecase "Tiếp nhận nhiệm vụ\n--\nextension points\n- Chấp nhận nhiệm vụ\n- Từ chối nhiệm vụ" as UC_Base
  usecase "Đăng nhập" as UC_Login
  usecase "Xem danh sách nhiệm vụ" as UC_List
  usecase "Chấp nhận nhiệm vụ" as UC_Accept
  usecase "Từ chối nhiệm vụ" as UC_Reject
  usecase "Ghi lý do từ chối" as UC_Reason
}

NV -- UC_Base
UC_Base ..> UC_Login : <<include>>
UC_Base ..> UC_List : <<include>>
UC_Accept ..> UC_Base : <<extend>>
UC_Reject ..> UC_Base : <<extend>>
UC_Reject ..> UC_Reason : <<include>>
@enduml
```

---

## 2. UC_NV2: Thực hiện lấy hàng

**Luồng sự kiện (Phân rã UC):**
- **Luồng chính:** Nhân viên **Đăng nhập** (`<<include>>`), tiến hành lấy hàng và bắt buộc **Xác nhận đã lấy hàng (Cập nhật trạng thái)** (`<<include>>`).
- **Luồng phụ:** Trong quá trình di chuyển, nhân viên có thể **Xem bản đồ chỉ đường** (`<<extend>>`) và **Gọi điện liên hệ khách hàng** (`<<extend>>`).

```plantuml
@startuml
!include https://static.visual-paradigm.com/web/resources/plantuml-stdlib/themes/vp.puml
left to right direction
skinparam actorBorderColor Black
skinparam usecaseBorderColor Black
skinparam arrowColor Black

actor "Nhân viên" as NV
rectangle "UC_NV2: Thực hiện lấy hàng" {
  usecase "Thực hiện lấy hàng\n--\nextension points\n- Xem bản đồ chỉ đường\n- Gọi điện liên hệ khách" as UC_Base
  usecase "Đăng nhập" as UC_Login
  usecase "Xác nhận đã lấy hàng" as UC_Confirm
  usecase "Xem bản đồ chỉ đường" as UC_Map
  usecase "Gọi điện liên hệ khách" as UC_Call
}

NV -- UC_Base
UC_Base ..> UC_Login : <<include>>
UC_Base ..> UC_Confirm : <<include>>
UC_Map ..> UC_Base : <<extend>>
UC_Call ..> UC_Base : <<extend>>
@enduml
```

**Biểu đồ Tuần tự (Sequence Diagram) - Thực hiện lấy hàng:**

```plantuml
@startuml
!include https://static.visual-paradigm.com/web/resources/plantuml-stdlib/themes/vp.puml
skinparam maxMessageSize 150
skinparam actorBorderColor Black
skinparam sequenceParticipantBorderColor Black
skinparam sequenceLifeLineBorderColor Black
skinparam sequenceGroupBodyBackgroundColor White

actor "Nhân viên" as NV
boundary "Màn hình Lấy hàng" as App
control "Order API" as API
entity "Bảng don_hang, lich_su" as DB

NV -> App: 1.1: Chọn đơn cần lấy & Quét mã QR/Barcode
activate App
App -> API: 1.1.1: Request thông tin đơn hàng
activate API
API -> DB: 1.1.1.1: Query bảng 'don_hang'
activate DB
DB --> API: 1.1.1.2: Trả về dữ liệu
deactivate DB

alt Đơn hàng tồn tại & Hợp lệ
    API --> App: 1.1.2: Hiển thị thông tin đơn hàng
    App --> NV: 1.2: Hiển thị chi tiết đơn trên màn hình

    NV -> App: 2.1: Kiểm tra & Bấm Xác nhận đã lấy hàng
    App -> API: 2.1.1: Gửi request cập nhật trạng thái (PUT /orders/{id}/status)
    API -> DB: 2.1.1.1: Update 'don_hang' (trạng thái: picked_up)
    activate DB
    DB --> API: 2.1.1.2: Ghi log vào 'lich_su_don_hang'
    deactivate DB
    API --> App: 2.1.2: Xác nhận cập nhật thành công
    App --> NV: 2.2: Hiển thị thông báo thành công
else Mã QR sai / Đơn không tồn tại
    API --> App: 1.1.3: Trả về lỗi (Not Found)
    App --> NV: 1.3: Thông báo mã không hợp lệ
end
deactivate API
deactivate App
@enduml
```

**Biểu đồ Hoạt động (Activity Diagram) - Thực hiện lấy hàng:**

```plantuml
@startuml
!include https://static.visual-paradigm.com/web/resources/plantuml-stdlib/themes/vp.puml

start
:Nhân viên mở danh sách đơn cần lấy (Awaiting Pickup);
:Di chuyển đến địa chỉ người gửi;
:Xác minh kiện hàng với người gửi;
if (Kiểm tra thông tin đơn?) then (Hợp lệ)
  :Hiển thị thông tin chi tiết đơn hàng;
  if (Tình trạng kiện hàng?) then (Đạt chuẩn)
    :Bấm xác nhận "Đã lấy hàng";
    :Hệ thống cập nhật trạng thái đơn (Picked Up);
    :Ghi nhận lịch sử lấy hàng thành công;
  elseif (Hàng cấm / Quá tải trọng) then ( )
    :Bấm từ chối nhận hàng;
    :Ghi nhận lý do sự cố (Báo cáo sự cố);
  else (Khách đổi ý hủy đơn)
    :Cập nhật trạng thái Hủy đơn;
  endif
else (Không tìm thấy mã)
  :Hiển thị thông báo mã không hợp lệ;
endif
stop
@enduml
```

---

## 3. UC_NV3: Thực hiện giao hàng

**Luồng sự kiện (Phân rã UC):**
- **Luồng chính:** Nhân viên **Đăng nhập** (`<<include>>`). Tại điểm giao, bắt buộc **Chụp ảnh bằng chứng (PoD)** (`<<include>>`) và **Xác nhận giao thành công** (`<<include>>`).
- **Luồng phụ:** Có thể **Xem bản đồ chỉ đường** (`<<extend>>`). Nếu đơn hàng có thu tiền, nhân viên phải **Thu tiền COD/Cước phí** (`<<extend>>`).

**Biểu đồ Hoạt động (Activity Diagram) - Thực hiện giao hàng:**

```plantuml
@startuml
!include https://static.visual-paradigm.com/web/resources/plantuml-stdlib/themes/vp.puml

start
:Nhân viên di chuyển đến địa chỉ người nhận;
:Tìm kiếm và chọn đơn hàng trên ứng dụng;
if (Hệ thống kiểm tra mã đơn?) then (Hợp lệ)
  :Hiển thị thông tin giao hàng & Số tiền COD cần thu;
  :Nhân viên giao hàng cho khách;
  if (Khách có nhận hàng không?) then (Đồng ý nhận)
    :Khách thanh toán tiền COD (nếu có);
    :Chụp ảnh bằng chứng giao hàng (PoD);
    :Bấm xác nhận "Giao hàng thành công";
    :Hệ thống cập nhật trạng thái "Delivered";
  else (Từ chối nhận/Không liên lạc được)
    :Bấm "Giao hàng thất bại";
    :Nhập lý do (Sai số điện thoại, khách hủy, ...);
    :Hệ thống cập nhật trạng thái "Delivery Failed";
  endif
else (Không tìm thấy đơn)
  :Hiển thị thông báo không tìm thấy đơn;
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

actor "Nhân viên" as NV
rectangle "UC_NV3: Thực hiện giao hàng" {
  usecase "Thực hiện giao hàng\n--\nextension points\n- Xem bản đồ chỉ đường\n- Thu tiền COD/Cước phí" as UC_Base
  usecase "Đăng nhập" as UC_Login
  usecase "Chụp ảnh bằng chứng (PoD)" as UC_Photo
  usecase "Xác nhận giao thành công" as UC_Success
  usecase "Xem bản đồ chỉ đường" as UC_Map
  usecase "Thu tiền COD/Cước phí" as UC_Collect
}

NV -- UC_Base
UC_Base ..> UC_Login : <<include>>
UC_Base ..> UC_Photo : <<include>>
UC_Base ..> UC_Success : <<include>>
UC_Map ..> UC_Base : <<extend>>
UC_Collect ..> UC_Base : <<extend>>
@enduml
```

**Biểu đồ Tuần tự (Sequence Diagram) - Thực hiện giao hàng:**

```plantuml
@startuml
!include https://static.visual-paradigm.com/web/resources/plantuml-stdlib/themes/vp.puml
skinparam maxMessageSize 150
skinparam actorBorderColor Black
skinparam sequenceParticipantBorderColor Black
skinparam sequenceLifeLineBorderColor Black
skinparam sequenceGroupBodyBackgroundColor White

actor "Nhân viên" as NV
boundary "Màn hình Giao hàng" as App
control "Order & Upload API" as API
entity "Bảng don_hang, tep_tai_len" as DB

NV -> App: 1.1: Đến điểm giao, Chọn đơn & Quét mã QR
activate App
App -> API: 1.1.1: Request thông tin giao hàng & Số tiền COD
activate API
API --> App: 1.1.2: Trả về thông tin (Tiền cước + COD)
deactivate API
App --> NV: 1.2: Hiển thị màn hình thu tiền & yêu cầu PoD

NV -> App: 2.1: Thu tiền khách, Chụp ảnh bằng chứng (PoD)
App -> API: 2.1.1: Upload file ảnh (POST /uploads)
activate API
API -> DB: 2.1.1.1: Lưu thông tin file vào 'tep_tai_len'
activate DB
DB --> API: 2.1.1.2: Trả về ID ảnh
deactivate DB
API --> App: 2.1.2: Xác nhận upload thành công
deactivate API
App --> NV: 2.2: Hiển thị ảnh đã tải lên

NV -> App: 3.1: Bấm Xác nhận giao thành công
App -> API: 3.1.1: Gửi request cập nhật trạng thái đơn
activate API

alt Giao thành công
    API -> DB: 3.1.1.1: Cập nhật 'don_hang' (completed) & Lưu 'anh_don_hang'
    activate DB
    DB --> API: 3.1.1.2: Ghi log 'lich_su_don_hang'
    deactivate DB
    API --> App: 3.1.2: Xác nhận giao hàng hoàn tất
    App --> NV: 3.2: Hiển thị thông báo giao thành công
else Khách không nhận hàng / Có sự cố
    API -> DB: 3.1.1.3: Cập nhật 'don_hang' (trạng thái: incomplete)
    activate DB
    DB --> API: 3.1.1.4: Ghi log 'lich_su_don_hang' (lý do thất bại)
    deactivate DB
    API --> App: 3.1.3: Cập nhật thất bại
    App --> NV: 3.3: Chuyển đơn sang mục cần xử lý sự cố
end
deactivate API
deactivate App
@enduml
```

---

## 4. UC_NV4: Báo cáo sự cố giao/lấy hàng

**Luồng sự kiện (Phân rã UC):**
- **Luồng chính:** Nhân viên **Đăng nhập** (`<<include>>`), **Chọn lý do sự cố** (`<<include>>`), **Chụp ảnh hiện trường** (`<<include>>`), và **Gửi báo cáo sự cố** (`<<include>>`).

```plantuml
@startuml
!include https://static.visual-paradigm.com/web/resources/plantuml-stdlib/themes/vp.puml
left to right direction
skinparam actorBorderColor Black
skinparam usecaseBorderColor Black
skinparam arrowColor Black

actor "Nhân viên" as NV
rectangle "UC_NV4: Báo cáo sự cố" {
  usecase "Báo cáo sự cố (Base)" as UC_Base
  usecase "Đăng nhập" as UC_Login
  usecase "Chọn lý do sự cố" as UC_Reason
  usecase "Chụp ảnh hiện trường" as UC_Photo
  usecase "Gửi báo cáo sự cố" as UC_Submit
}

NV -- UC_Base
UC_Base ..> UC_Login : <<include>>
UC_Base ..> UC_Reason : <<include>>
UC_Base ..> UC_Photo : <<include>>
UC_Base ..> UC_Submit : <<include>>
@enduml
```

---

## 5. UC_NV5: Theo dõi hiệu suất cá nhân

**Luồng sự kiện (Phân rã UC):**
- **Luồng chính:** Nhân viên **Đăng nhập** (`<<include>>`) và truy cập Dashboard cá nhân để **Xem thống kê số lượng đơn** (`<<include>>`).
- **Luồng phụ:** Nhân viên có thể **Xem chi tiết tiền COD đang giữ** (`<<extend>>`) hoặc **Xem điểm đánh giá từ khách** (`<<extend>>`).

```plantuml
@startuml
!include https://static.visual-paradigm.com/web/resources/plantuml-stdlib/themes/vp.puml
left to right direction
skinparam actorBorderColor Black
skinparam usecaseBorderColor Black
skinparam arrowColor Black

actor "Nhân viên" as NV
rectangle "UC_NV5: Theo dõi hiệu suất cá nhân" {
  usecase "Theo dõi hiệu suất\n--\nextension points\n- Xem chi tiết tiền COD\n- Xem điểm đánh giá" as UC_Base
  usecase "Đăng nhập" as UC_Login
  usecase "Xem thống kê số đơn" as UC_Stats
  usecase "Xem chi tiết tiền COD" as UC_COD
  usecase "Xem điểm đánh giá" as UC_Rating
}

NV -- UC_Base
UC_Base ..> UC_Login : <<include>>
UC_Base ..> UC_Stats : <<include>>
UC_COD ..> UC_Base : <<extend>>
UC_Rating ..> UC_Base : <<extend>>
@enduml
```

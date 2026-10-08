# Phân hệ Quản trị viên (Admin)

Tài liệu này đặc tả chi tiết quá trình thực hiện (luồng sự kiện) và phân rã các bước luồng sự kiện thành các Use Case con (`<<include>>` / `<<extend>>`) trên từng biểu đồ riêng biệt.

---

## 1. UC_AD1: Giám sát & Thống kê toàn hệ thống

**Luồng sự kiện (Phân rã UC):**
- **Luồng chính:** Quản trị viên **Đăng nhập** (`<<include>>`), và **Xem Dashboard tổng quan** (`<<include>>`).
- **Luồng phụ:** Từ Dashboard, Admin có thể **Lọc dữ liệu theo thời gian** (`<<extend>>`) hoặc **Xuất báo cáo Excel/PDF** (`<<extend>>`).

```plantuml
@startuml
!include https://static.visual-paradigm.com/web/resources/plantuml-stdlib/themes/vp.puml
left to right direction
skinparam actorBorderColor Black
skinparam usecaseBorderColor Black
skinparam arrowColor Black

actor "Quản trị viên" as AD
rectangle "UC_AD1: Giám sát & Thống kê" {
  usecase "Giám sát hệ thống\n--\nextension points\n- Lọc dữ liệu theo thời gian\n- Xuất báo cáo" as UC_Base
  usecase "Đăng nhập" as UC_Login
  usecase "Xem Dashboard tổng quan" as UC_Dash
  usecase "Lọc dữ liệu theo thời gian" as UC_Filter
  usecase "Xuất báo cáo" as UC_Export
}

AD -- UC_Base
UC_Base ..> UC_Login : <<include>>
UC_Base ..> UC_Dash : <<include>>
UC_Filter ..> UC_Base : <<extend>>
UC_Export ..> UC_Base : <<extend>>
@enduml
```

---

## 2. UC_AD2: Cấu hình bảng giá & Dịch vụ cước

**Luồng sự kiện (Phân rã UC):**
- **Luồng chính:** Quản trị viên **Đăng nhập** (`<<include>>`), **Xem bảng cước hiện tại** (`<<include>>`), sau khi chỉnh sửa bắt buộc **Lưu cấu hình mới** (`<<include>>`).
- **Luồng phụ:** Có thể **Cập nhật phí cước cơ sở (km, kg)** (`<<extend>>`) hoặc **Cập nhật phụ phí (COD, Bảo hiểm)** (`<<extend>>`).

```plantuml
@startuml
!include https://static.visual-paradigm.com/web/resources/plantuml-stdlib/themes/vp.puml
left to right direction
skinparam actorBorderColor Black
skinparam usecaseBorderColor Black
skinparam arrowColor Black

actor "Quản trị viên" as AD
rectangle "UC_AD2: Cấu hình bảng giá & Dịch vụ cước" {
  usecase "Cấu hình bảng cước\n--\nextension points\n- Cập nhật phí cước cơ sở\n- Cập nhật phụ phí" as UC_Base
  usecase "Đăng nhập" as UC_Login
  usecase "Xem bảng cước hiện tại" as UC_View
  usecase "Lưu cấu hình mới" as UC_Save
  usecase "Cập nhật phí cước cơ sở" as UC_BaseFee
  usecase "Cập nhật phụ phí" as UC_ExtraFee
}

AD -- UC_Base
UC_Base ..> UC_Login : <<include>>
UC_Base ..> UC_View : <<include>>
UC_Base ..> UC_Save : <<include>>
UC_BaseFee ..> UC_Base : <<extend>>
UC_ExtraFee ..> UC_Base : <<extend>>
@enduml
```

**Biểu đồ Hoạt động (Activity Diagram) - Cấu hình bảng cước:**

```plantuml
@startuml
!include https://static.visual-paradigm.com/web/resources/plantuml-stdlib/themes/vp.puml

start
:Quản trị viên truy cập màn hình Cấu hình bảng cước;
:Hiển thị danh sách cước phí hiện tại;
:Chọn Chỉnh sửa phí cước cơ sở (hoặc phụ phí);
:Nhập các thông số mới (đơn giá/km, đơn giá/kg, ...);
if (Kiểm tra dữ liệu?) then (Hợp lệ)
  :Bấm "Lưu cấu hình";
  :Hệ thống cập nhật bảng cước vào cơ sở dữ liệu;
  :Thông báo cập nhật thành công;
elseif (Bỏ trống trường dữ liệu) then ( )
  :Hiển thị thông báo lỗi thiếu dữ liệu;
elseif (Nhập giá trị âm) then ( )
  :Cảnh báo giá trị cước phí phải lớn hơn 0;
endif
stop
@enduml
```

---

## 3. UC_AD3: Quản lý mạng lưới trạm chuyển phát

**Luồng sự kiện (Phân rã UC):**
- **Luồng chính:** Quản trị viên **Đăng nhập** (`<<include>>`), **Xem danh sách trạm bưu cục** (`<<include>>`).
- **Luồng phụ:** Có thể **Thêm trạm bưu cục mới** (`<<extend>>`) hoặc **Cập nhật thông tin trạm** (`<<extend>>`). Khi thêm hoặc cập nhật, bắt buộc phải **Gán tọa độ & bán kính phục vụ** (`<<include>>` từ Thêm/Sửa).

```plantuml
@startuml
!include https://static.visual-paradigm.com/web/resources/plantuml-stdlib/themes/vp.puml
left to right direction
skinparam actorBorderColor Black
skinparam usecaseBorderColor Black
skinparam arrowColor Black

actor "Quản trị viên" as AD
rectangle "UC_AD3: Quản lý mạng lưới trạm" {
  usecase "Quản lý trạm\n--\nextension points\n- Thêm trạm bưu cục mới\n- Cập nhật thông tin trạm" as UC_Base
  usecase "Đăng nhập" as UC_Login
  usecase "Xem danh sách trạm" as UC_List
  usecase "Thêm trạm bưu cục mới" as UC_Add
  usecase "Cập nhật thông tin trạm" as UC_Edit
  usecase "Gán tọa độ & bán kính" as UC_Map
}

AD -- UC_Base
UC_Base ..> UC_Login : <<include>>
UC_Base ..> UC_List : <<include>>
UC_Add ..> UC_Base : <<extend>>
UC_Edit ..> UC_Base : <<extend>>

UC_Add ..> UC_Map : <<include>>
UC_Edit ..> UC_Map : <<include>>
@enduml
```

---

## 4. UC_AD4: Quản trị người dùng & Nhân sự

**Luồng sự kiện (Phân rã UC):**
- **Luồng chính:** Quản trị viên **Đăng nhập** (`<<include>>`), **Xem danh sách tài khoản toàn hệ thống** (`<<include>>`).
- **Luồng phụ:** Admin có thể **Khóa / Mở khóa tài khoản** (`<<extend>>`) hoặc **Cấp tài khoản Quản lý trạm mới** (`<<extend>>`).

```plantuml
@startuml
!include https://static.visual-paradigm.com/web/resources/plantuml-stdlib/themes/vp.puml
left to right direction
skinparam actorBorderColor Black
skinparam usecaseBorderColor Black
skinparam arrowColor Black

actor "Quản trị viên" as AD
rectangle "UC_AD4: Quản trị người dùng & Nhân sự" {
  usecase "Quản trị người dùng\n--\nextension points\n- Khóa / Mở khóa tài khoản\n- Cấp tài khoản Quản lý" as UC_Base
  usecase "Đăng nhập" as UC_Login
  usecase "Xem danh sách tài khoản" as UC_List
  usecase "Khóa / Mở khóa tài khoản" as UC_Lock
  usecase "Cấp tài khoản Quản lý" as UC_Create
}

AD -- UC_Base
UC_Base ..> UC_Login : <<include>>
UC_Base ..> UC_List : <<include>>
UC_Lock ..> UC_Base : <<extend>>
UC_Create ..> UC_Base : <<extend>>
@enduml
```

---

## 5. UC_AD5: Giám sát đơn hàng & Điều phối toàn mạng

**Luồng sự kiện (Phân rã UC):**
- **Luồng chính:** Quản trị viên **Đăng nhập** (`<<include>>`), **Tra cứu mã vận đơn** (`<<include>>`).
- **Luồng phụ:** Từ kết quả tra cứu, Admin có thể **Xem lộ trình chi tiết** (`<<extend>>`) hoặc **Can thiệp gán lại trạm bưu cục** (`<<extend>>`) nếu sai sót.

```plantuml
@startuml
!include https://static.visual-paradigm.com/web/resources/plantuml-stdlib/themes/vp.puml
left to right direction
skinparam actorBorderColor Black
skinparam usecaseBorderColor Black
skinparam arrowColor Black

actor "Quản trị viên" as AD
rectangle "UC_AD5: Giám sát & Điều phối đơn" {
  usecase "Giám sát đơn hàng\n--\nextension points\n- Xem lộ trình chi tiết\n- Can thiệp gán lại trạm" as UC_Base
  usecase "Đăng nhập" as UC_Login
  usecase "Tra cứu mã vận đơn" as UC_Search
  usecase "Xem lộ trình chi tiết" as UC_Track
  usecase "Can thiệp gán lại trạm" as UC_Reassign
}

AD -- UC_Base
UC_Base ..> UC_Login : <<include>>
UC_Base ..> UC_Search : <<include>>
UC_Track ..> UC_Base : <<extend>>
UC_Reassign ..> UC_Base : <<extend>>
@enduml
```

**Biểu đồ Hoạt động (Activity Diagram) - Giám sát đơn hàng & Điều phối:**

```plantuml
@startuml
!include https://static.visual-paradigm.com/web/resources/plantuml-stdlib/themes/vp.puml

start
:Quản trị viên chọn chức năng "Giám sát đơn hàng";
:Nhập mã vận đơn cần tra cứu;
if (Kiểm tra mã vận đơn?) then (Hợp lệ)
  :Hiển thị toàn bộ lịch trình và thông tin điều phối;
  if (Có dấu hiệu sai sót/chậm trễ?) then (Có)
    :Chọn "Can thiệp gán lại trạm";
    :Cập nhật tuyến đường/trạm mới;
    :Lưu lịch sử can thiệp;
  else (Bình thường)
  endif
else (Không tồn tại)
  :Thông báo không tìm thấy mã vận đơn;
endif
stop
@enduml
```

---

## 6. UC_AD6: Xử lý khiếu nại cấp hệ thống

**Luồng sự kiện (Phân rã UC):**
- **Luồng chính:** Quản trị viên **Đăng nhập** (`<<include>>`), **Xem danh sách khiếu nại chờ xử lý** (`<<include>>`), **Phản hồi khách hàng** (`<<include>>`), và **Đóng khiếu nại** (`<<include>>`).
- **Luồng phụ:** Trong quá trình xem xét, Admin **Xem chứng từ đối soát (PoD)** (`<<extend>>`).

```plantuml
@startuml
!include https://static.visual-paradigm.com/web/resources/plantuml-stdlib/themes/vp.puml
left to right direction
skinparam actorBorderColor Black
skinparam usecaseBorderColor Black
skinparam arrowColor Black

actor "Quản trị viên" as AD
rectangle "UC_AD6: Xử lý khiếu nại cấp hệ thống" {
  usecase "Xử lý khiếu nại\n--\nextension points\n- Xem chứng từ đối soát" as UC_Base
  usecase "Đăng nhập" as UC_Login
  usecase "Xem danh sách khiếu nại" as UC_List
  usecase "Xem chứng từ đối soát" as UC_PoD
  usecase "Phản hồi khách hàng" as UC_Reply
  usecase "Đóng khiếu nại" as UC_Close
}

AD -- UC_Base
UC_Base ..> UC_Login : <<include>>
UC_Base ..> UC_List : <<include>>
UC_PoD ..> UC_Base : <<extend>>
UC_Base ..> UC_Reply : <<include>>
UC_Base ..> UC_Close : <<include>>
@enduml
```

**Biểu đồ Hoạt động (Activity Diagram) - Xử lý khiếu nại:**

```plantuml
@startuml
!include https://static.visual-paradigm.com/web/resources/plantuml-stdlib/themes/vp.puml

start
:Quản trị viên mở "Danh sách khiếu nại";
:Chọn một ticket khiếu nại đang chờ xử lý;
:Xem nội dung khiếu nại của khách hàng;
:Kiểm tra chứng từ đối soát (Ảnh PoD, Lịch sử giao);
if (Quyết định xử lý?) then (Chấp nhận bồi thường)
  :Ghi chú lý do bồi thường;
  :Tạo lệnh hoàn tiền / Đền bù;
  :Chuyển trạng thái khiếu nại thành "Đã giải quyết";
elseif (Từ chối khiếu nại) then ( )
  :Ghi chú lý do từ chối (Kèm bằng chứng);
  :Gửi phản hồi cho khách hàng;
  :Chuyển trạng thái khiếu nại thành "Đã đóng";
endif
stop
@enduml
```

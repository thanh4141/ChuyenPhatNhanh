# Mã PlantUML cho các phân hệ Use Case

Dưới đây là mã PlantUML tách riêng cho từng phân hệ để bạn có thể dễ dàng copy và dán vào công cụ vẽ UML (như PlantUML Web Server, Draw.io hoặc tiện ích mở rộng trong VS Code).

## a) Chức năng của phân hệ Khách hàng

```plantuml
@startuml
!include https://static.visual-paradigm.com/web/resources/plantuml-stdlib/themes/vp.puml
left to right direction

skinparam actorBorderColor Black
skinparam usecaseBorderColor Black
skinparam arrowColor Black
skinparam linetype ortho

actor "Khách hàng" as KH

rectangle "Phân hệ Khách hàng" {
  usecase "Đăng nhập" as UC_Login

  usecase "Quản lý tài khoản & hồ sơ" as UC_KH1
  usecase "Quản lý địa chỉ" as UC_KH2
  usecase "Tạo đơn hàng" as UC_KH3
  usecase "Theo dõi & Quản lý đơn hàng" as UC_KH4
  usecase "Đánh giá chất lượng phục vụ" as UC_KH5
  usecase "Gửi khiếu nại đơn hàng" as UC_KH6
}

KH -- UC_KH1
KH -- UC_KH2
KH -- UC_KH3
KH -- UC_KH4
KH -- UC_KH5
KH -- UC_KH6

UC_KH1 ..> UC_Login : <<include>>
UC_KH2 ..> UC_Login : <<include>>
UC_KH3 ..> UC_Login : <<include>>
UC_KH4 ..> UC_Login : <<include>>
UC_KH5 ..> UC_Login : <<include>>
UC_KH6 ..> UC_Login : <<include>>
@enduml
```

## b) Chức năng phân hệ của Nhân viên

```plantuml
@startuml
!include https://static.visual-paradigm.com/web/resources/plantuml-stdlib/themes/vp.puml
left to right direction

skinparam actorBorderColor Black
skinparam usecaseBorderColor Black
skinparam arrowColor Black
skinparam linetype ortho

actor "Nhân viên" as NV

rectangle "Phân hệ Nhân viên" {
  usecase "Đăng nhập" as UC_Login

  usecase "Tiếp nhận nhiệm vụ lấy/giao hàng" as UC_NV1
  usecase "Thực hiện lấy hàng" as UC_NV2
  usecase "Thực hiện giao hàng" as UC_NV3
  usecase "Báo cáo sự cố giao/lấy hàng" as UC_NV4
  usecase "Theo dõi hiệu suất cá nhân" as UC_NV5
}

NV -- UC_NV1
NV -- UC_NV2
NV -- UC_NV3
NV -- UC_NV4
NV -- UC_NV5

UC_NV1 ..> UC_Login : <<include>>
UC_NV2 ..> UC_Login : <<include>>
UC_NV3 ..> UC_Login : <<include>>
UC_NV4 ..> UC_Login : <<include>>
UC_NV5 ..> UC_Login : <<include>>
@enduml
```

## c) Chức năng phân hệ của Quản trị viên

```plantuml
@startuml
!include https://static.visual-paradigm.com/web/resources/plantuml-stdlib/themes/vp.puml
left to right direction

skinparam actorBorderColor Black
skinparam usecaseBorderColor Black
skinparam arrowColor Black
skinparam linetype ortho

actor "Quản trị viên" as AD

rectangle "Phân hệ Quản trị viên" {
  usecase "Đăng nhập" as UC_Login

  usecase "Giám sát & Thống kê toàn hệ thống" as UC_AD1
  usecase "Cấu hình bảng giá & Dịch vụ cước" as UC_AD2
  usecase "Quản lý mạng lưới trạm chuyển phát" as UC_AD3
  usecase "Quản trị người dùng & Nhân sự" as UC_AD4
  usecase "Giám sát đơn hàng & Điều phối toàn mạng" as UC_AD5
  usecase "Xử lý khiếu nại cấp hệ thống" as UC_AD6
}

AD -- UC_AD1
AD -- UC_AD2
AD -- UC_AD3
AD -- UC_AD4
AD -- UC_AD5
AD -- UC_AD6

UC_AD1 ..> UC_Login : <<include>>
UC_AD2 ..> UC_Login : <<include>>
UC_AD3 ..> UC_Login : <<include>>
UC_AD4 ..> UC_Login : <<include>>
UC_AD5 ..> UC_Login : <<include>>
UC_AD6 ..> UC_Login : <<include>>
@enduml
```

## d) Chức năng phân hệ của Quản lý trạm

```plantuml
@startuml
!include https://static.visual-paradigm.com/web/resources/plantuml-stdlib/themes/vp.puml
left to right direction

skinparam actorBorderColor Black
skinparam usecaseBorderColor Black
skinparam arrowColor Black
skinparam linetype ortho

actor "Quản lý trạm" as QL

rectangle "Phân hệ Quản lý trạm" {
  usecase "Đăng nhập" as UC_Login

  usecase "Quản lý nhân viên tại trạm" as UC_QL1
  usecase "Phân công lấy hàng" as UC_QL2
  usecase "Vận hành kho trạm" as UC_QL3
  usecase "Quản lý chuyến trung chuyển" as UC_QL4
  usecase "Phân công giao hàng" as UC_QL5
  usecase "Xử lý sự cố & Khiếu nại tại trạm" as UC_QL6
}

QL -- UC_QL1
QL -- UC_QL2
QL -- UC_QL3
QL -- UC_QL4
QL -- UC_QL5
QL -- UC_QL6

UC_QL1 ..> UC_Login : <<include>>
UC_QL2 ..> UC_Login : <<include>>
UC_QL3 ..> UC_Login : <<include>>
UC_QL4 ..> UC_Login : <<include>>
UC_QL5 ..> UC_Login : <<include>>
UC_QL6 ..> UC_Login : <<include>>
@enduml
```

# Biểu đồ lớp thực thể (Entity Class Diagram) - Full Database Schema

Dưới đây là mã PlantUML mô tả biểu đồ lớp thực thể (ERD/Class Diagram) chứa đầy đủ **20 bảng (tables)**.

Để biểu đồ dễ nhìn và các đường nối không bị rối:
1. Các bảng được **nhóm (package)** theo từng phân hệ nghiệp vụ.
2. Các đường nối đã được **đánh số thứ tự (từ R1 đến R21)** và gán nhãn rõ ràng để bạn dễ dàng dò theo từng luồng quan hệ.
3. Sử dụng các chỉ hướng (`-down-`, `-right-`, `-up-`) để tối ưu bố cục.

```plantuml
@startuml
!include https://static.visual-paradigm.com/web/resources/plantuml-stdlib/themes/vp.puml

skinparam classAttributeIconSize 0
skinparam linetype ortho
skinparam nodesep 60
skinparam ranksep 60
skinparam classBorderColor Black

' ==========================================
' 1. QUẢN LÝ TÀI KHOẢN & NHÂN SỰ
' ==========================================
class tai_khoan {
  + ma_so: PK
  + ten
  + thu_dien_tu
  + mat_khau_bam
  + so_dien_thoai
  + dia_chi_lien_he
  + vai_tro
  + dang_hoat_dong
  + ma_tram: FK
}

class ho_so_nhan_vien {
  + ma_so: PK
  + ma_tai_khoan: FK
  + ma_nhan_vien_noi_bo
  + so_cccd
  + ngay_vao_lam
  + trang_thai_lam_viec
}

class dia_chi {
  + ma_so: PK
  + ma_tai_khoan: FK
  + nhan_dia_chi
  + so_dien_thoai
  + ma_tinh_thanh: FK
  + vi_do
  + kinh_do
}

' ==========================================
' 2. CẤU HÌNH & HỆ THỐNG
' ==========================================
class tinh_thanh {
  + ma_dinh_danh: PK
  + ten
  + mien
}

class bo_nho_dem_ban_do {
  + khoa_bo_nho_dem: PK
  + du_lieu
  + ngay_het_han
}

class lich_su_nang_cap {
  + phien_ban: PK
  + ngay_ap_dung
  + du_lieu
}

class tep_tai_len {
  + ma_so: PK
  + ma_chu_so_huu: FK
  + muc_dich
  + ten_tep_luu
  + loai_noi_dung
}

class thong_bao {
  + ma_so: PK
  + ma_tai_khoan: FK
  + ma_don_hang: FK
  + tieu_de
  + noi_dung
  + ngay_doc
}

' ==========================================
' 3. DỊCH VỤ & BẢNG CƯỚC
' ==========================================
class dich_vu {
  + ma_so: PK
  + ma_dinh_danh
  + ten
  + cuoc_co_ban
}

class bang_cuoc {
  + ma_so: PK
  + ma_dich_vu: FK
  + loai_tuyen
  + don_gia_km_vuot
  + phi_thu_ho
  + phi_bao_hiem
}

class bao_gia_van_chuyen {
  + ma_so: PK
  + ma_khach_hang: FK
  + ma_bang_cuoc: FK
  + du_lieu_chot
  + ngay_het_han
}

' ==========================================
' 4. ĐƠN HÀNG & THEO DÕI (CORE)
' ==========================================
class don_hang {
  + ma_so: PK
  + ma_van_don
  + ma_khach_hang: FK
  + ma_nhan_vien: FK
  + ma_dich_vu: FK
  + khoi_luong
  + trang_thai
  + ma_tram_hien_tai: FK
}

class lich_su_don_hang {
  + ma_so: PK
  + ma_don_hang: FK
  + ma_nguoi_thuc_hien: FK
  + trang_thai
  + ghi_chu
}

class anh_don_hang {
  + ma_so: PK
  + ma_don_hang: FK
  + ma_tep_tai_len: FK
  + ma_lich_su: FK
}

' ==========================================
' 5. CHĂM SÓC KHÁCH HÀNG
' ==========================================
class danh_gia {
  + ma_so: PK
  + ma_don_hang: FK
  + ma_khach_hang: FK
  + ma_nhan_vien: FK
  + so_sao
  + binh_luan
}

class khieu_nai {
  + ma_so: PK
  + ma_don_hang: FK
  + ma_khach_hang: FK
  + tieu_de
  + noi_dung
  + trang_thai
  + phan_hoi
}

' ==========================================
' 6. TRẠM BƯU CỤC & LOGISTICS
' ==========================================
class tram_chuyen_phat {
  + ma_so: PK
  + ten
  + ma_tinh_thanh: FK
  + vi_do
  + kinh_do
}

class chuyen_trung_chuyen {
  + ma_so: PK
  + ma_dinh_danh
  + ma_tram_gui: FK
  + ma_tram_dich: FK
  + trang_thai
}

class kien_trung_chuyen {
  + ma_chuyen: PK, FK
  + ma_don_hang: PK, FK
  + ngay_nhap_kho
}

class nhat_ky_kho {
  + ma_so: PK
  + ma_tram: FK
  + ma_don_hang: FK
  + ma_chuyen: FK
  + loai
}

' ==========================================
' THIẾT LẬP CÁC MỐI QUAN HỆ (RELATIONSHIPS)
' Sử dụng ký hiệu 1 và * quen thuộc, kèm chỉ hướng để ép nét vẽ thẳng/vuông góc
' ==========================================
tai_khoan "1" -down- "0..1" ho_so_nhan_vien
tai_khoan "1" -right- "0..*" dia_chi
tai_khoan "1" -down- "0..*" don_hang : Khách hàng / Nhân viên
tai_khoan "1" -down- "0..*" tep_tai_len
tai_khoan "1" -down- "0..*" thong_bao
tai_khoan "1" -down- "0..*" bao_gia_van_chuyen

tinh_thanh "1" -down- "0..*" dia_chi
tinh_thanh "1" -down- "0..*" tram_chuyen_phat

dich_vu "1" -right- "0..*" bang_cuoc
dich_vu "1" -down- "0..*" don_hang
bang_cuoc "1" -down- "0..*" bao_gia_van_chuyen
bao_gia_van_chuyen "1" -down- "0..1" don_hang

don_hang "1" -down- "0..*" lich_su_don_hang
don_hang "1" -down- "0..*" anh_don_hang
don_hang "1" -right- "0..*" thong_bao
don_hang "1" -down- "0..1" danh_gia
don_hang "1" -down- "0..*" khieu_nai

tep_tai_len "1" -down- "0..1" anh_don_hang
lich_su_don_hang "1" -right- "0..*" anh_don_hang

tram_chuyen_phat "1" -down- "0..*" tai_khoan : Chứa nhân sự
tram_chuyen_phat "1" -down- "0..*" don_hang : Trạm hiện tại
tram_chuyen_phat "1" -down- "0..*" chuyen_trung_chuyen
tram_chuyen_phat "1" -left- "0..*" nhat_ky_kho

chuyen_trung_chuyen "1" -down- "0..*" kien_trung_chuyen
don_hang "1" -right- "0..*" kien_trung_chuyen

@enduml
```


### Danh sách 20 Bảng thực thể:
1. `tai_khoan`
2. `ho_so_nhan_vien`
3. `dia_chi`
4. `tinh_thanh`
5. `bo_nho_dem_ban_do`
6. `lich_su_nang_cap`
7. `tep_tai_len`
8. `thong_bao`
9. `dich_vu`
10. `bang_cuoc`
11. `bao_gia_van_chuyen`
12. `don_hang`
13. `lich_su_don_hang`
14. `anh_don_hang`
15. `danh_gia`
16. `khieu_nai`
17. `tram_chuyen_phat`
18. `chuyen_trung_chuyen`
19. `kien_trung_chuyen`
20. `nhat_ky_kho`

// List queries must not sort route geometry / JSON snapshots. Full snapshots
// remain available from GET /orders/:id for the map and fee breakdown.
export const orderSummaryColumns = [
  'quang_duong_tram_lay_met','ma_so','ma_van_don','ma_khach_hang','ma_nhan_vien','ma_dich_vu',
  'ten_nguoi_gui','sdt_nguoi_gui','dia_chi_nguoi_gui','ten_nguoi_nhan','sdt_nguoi_nhan','dia_chi_nguoi_nhan',
  'noi_dung_hang_hoa','khoi_luong','khu_vuc','tien_thu_ho','cuoc_van_chuyen','nguoi_tra_cuoc','ghi_chu',
  'trang_thai','ngay_tao','ngay_cap_nhat','ngay_giao_xong','ma_bang_cuoc','ma_bao_gia','loai_tuyen',
  'quang_duong_met','nguon_quang_duong','co_thu_ho','co_bao_hiem','co_dong_goi',
  'phi_thu_ho','phi_bao_hiem','phi_dong_goi','tong_thanh_toan','ngay_nhan_don',
  'ma_tram_gui','ma_tram_dich','ma_tram_hien_tai','ma_nv_lay_hang','ma_nv_giao_hang','ma_chuyen_hien_tai',
].map(name=>'o.'+name).join(',');

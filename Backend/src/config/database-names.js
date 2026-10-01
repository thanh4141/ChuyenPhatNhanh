// Tên vật lý trong MySQL. Khóa JSON của API được giữ ổn định cho web/app.
export const tableNames = {
  users: 'tai_khoan', services: 'dich_vu', orders: 'don_hang', order_events: 'lich_su_don_hang',
  schema_migrations: 'lich_su_nang_cap', provinces: 'tinh_thanh', employee_profiles: 'ho_so_nhan_vien',
  service_rates: 'bang_cuoc', addresses: 'dia_chi', uploads: 'tep_tai_len', shipping_quotes: 'bao_gia_van_chuyen',
  order_media: 'anh_don_hang', notifications: 'thong_bao', reviews: 'danh_gia', map_cache: 'bo_nho_dem_ban_do',
};

export const columnNames = {
  pickup_station_distance_meters:'quang_duong_tram_lay_met',response:'phan_hoi',handler_id:'ma_nguoi_xu_ly',handled_at:'ngay_xu_ly',
  station_id:'ma_tram',origin_station_id:'ma_tram_gui',destination_station_id:'ma_tram_dich',current_station_id:'ma_tram_hien_tai',
  pickup_employee_id:'ma_nv_lay_hang',delivery_employee_id:'ma_nv_giao_hang',current_batch_id:'ma_chuyen_hien_tai',
  batch_id:'ma_chuyen',final_station_id:'ma_tram_giao_cuoi',dispatched_at:'ngay_xuat_kho',received_at:'ngay_nhap_kho',fully_received_at:'ngay_nhan_du',
  id: 'ma_so', name: 'ten', email: 'thu_dien_tu', password_hash: 'mat_khau_bam', phone: 'so_dien_thoai',
  address: 'dia_chi_lien_he', role: 'vai_tro', active: 'dang_hoat_dong', token_version: 'phien_ban_token',
  created_at: 'ngay_tao', updated_at: 'ngay_cap_nhat', code: 'ma_dinh_danh', description: 'mo_ta',
  base_fee: 'cuoc_co_ban', extra_half_kg: 'cuoc_them_nua_kg', domestic_surcharge: 'phu_phi_ngoai_tinh',
  estimated_days: 'thoi_gian_du_kien', tracking_code: 'ma_van_don', customer_id: 'ma_khach_hang',
  employee_id: 'ma_nhan_vien', service_id: 'ma_dich_vu', sender_name: 'ten_nguoi_gui', sender_phone: 'sdt_nguoi_gui',
  sender_address: 'dia_chi_nguoi_gui', receiver_name: 'ten_nguoi_nhan', receiver_phone: 'sdt_nguoi_nhan',
  receiver_address: 'dia_chi_nguoi_nhan', package_name: 'noi_dung_hang_hoa', weight: 'khoi_luong', zone: 'khu_vuc',
  cod_amount: 'tien_thu_ho', shipping_fee: 'cuoc_van_chuyen', payer: 'nguoi_tra_cuoc', note: 'ghi_chu',
  status: 'trang_thai', delivered_at: 'ngay_giao_xong', order_id: 'ma_don_hang', actor_id: 'ma_nguoi_thuc_hien',
  version: 'phien_ban', applied_at: 'ngay_ap_dung', region: 'mien', user_id: 'ma_tai_khoan',
  employee_code: 'ma_nhan_vien_noi_bo', hometown: 'que_quan', identity_number: 'so_cccd', hired_at: 'ngay_vao_lam',
  employment_status: 'trang_thai_lam_viec', route_type: 'loai_tuyen', included_km: 'so_km_bao_gom',
  extra_km_fee: 'don_gia_km_vuot', included_weight: 'khoi_luong_bao_gom', weight_step: 'buoc_khoi_luong',
  extra_weight_fee: 'don_gia_khoi_luong_vuot', cod_fee: 'phi_thu_ho', insurance_fee: 'phi_bao_hiem',
  packaging_fee: 'phi_dong_goi', min_days: 'so_ngay_toi_thieu', max_days: 'so_ngay_toi_da',
  label: 'nhan_dia_chi', contact_name: 'ten_lien_he', province_code: 'ma_tinh_thanh', ward: 'xa_phuong',
  village: 'thon_xom', detail: 'dia_chi_chi_tiet', latitude: 'vi_do', longitude: 'kinh_do',
  formatted_address: 'dia_chi_day_du', is_default: 'la_mac_dinh', default_user_id: 'ma_tai_khoan_mac_dinh',
  owner_id: 'ma_chu_so_huu', purpose: 'muc_dich', storage_name: 'ten_tep_luu', mime_type: 'loai_noi_dung',
  size_bytes: 'dung_luong_byte', original_size_bytes: 'dung_luong_goc_byte', rate_id: 'ma_bang_cuoc',
  snapshot: 'du_lieu_chot', expires_at: 'ngay_het_han', upload_id: 'ma_tep_tai_len', event_id: 'ma_lich_su',
  type: 'loai', title: 'tieu_de', message: 'noi_dung', read_at: 'ngay_doc', stars: 'so_sao', comment: 'binh_luan',
  cache_key: 'khoa_bo_nho_dem', payload: 'du_lieu', quote_id: 'ma_bao_gia', pickup_snapshot: 'thong_tin_lay_hang',
  delivery_snapshot: 'thong_tin_giao_hang', pricing_snapshot: 'chi_tiet_cuoc', distance_meters: 'quang_duong_met',
  distance_source: 'nguon_quang_duong', has_cod: 'co_thu_ho', has_insurance: 'co_bao_hiem',
  has_packaging: 'co_dong_goi', total_amount: 'tong_thanh_toan', accepted_at: 'ngay_nhan_don',
};

const apiNames = Object.fromEntries(Object.entries(columnNames).map(([api, db]) => [db, api]));
export function dbColumn(apiName) {
  const name = columnNames[apiName];
  if (!name) throw new Error(`Chưa khai báo tên cột: ${apiName}`);
  return name;
}

// Chỉ ánh xạ khóa của hàng SQL; không đổi giá trị ENUM, nội dung JSON hay dữ liệu người dùng.
export function apiRows(rows) {
  if (!Array.isArray(rows)) return rows;
  return rows.map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [apiNames[key] || key, value])));
}

export function apiConnection(connection) {
  return new Proxy(connection, {
    get(target, name) {
      if (name === 'query' || name === 'execute') return async (...args) => {
        const [rows, fields] = await target[name](...args);
        return [apiRows(rows), fields];
      };
      const value = Reflect.get(target, name);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

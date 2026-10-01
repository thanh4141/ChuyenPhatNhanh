import bcrypt from 'bcryptjs';
import { pool, transaction } from '../config/database.js';

async function seed() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminPassword || adminPassword.length < 8 || Buffer.byteLength(adminPassword) > 72) throw new Error('Đặt SEED_ADMIN_PASSWORD trong .env (ít nhất 8 ký tự, tối đa 72 byte).');
  const hash = await bcrypt.hash(adminPassword, 12);
  await pool.execute("INSERT IGNORE INTO tai_khoan (ten,thu_dien_tu,mat_khau_bam,so_dien_thoai,vai_tro) VALUES (?,?,?,?,?)", ['Quản trị viên', process.env.SEED_ADMIN_EMAIL || 'admin@chuyenphat.vn', hash, '0901000000', 'admin']);
  if (process.env.SEED_DEMO !== 'true') { console.log('Đã tạo Admin (không thay đổi tài khoản đã tồn tại).'); return; }
  const demoPassword = process.env.SEED_DEMO_PASSWORD;
  if (!demoPassword || demoPassword.length < 8 || Buffer.byteLength(demoPassword) > 72) throw new Error('Đặt SEED_DEMO_PASSWORD hợp lệ khi bật SEED_DEMO.');
  const demoHash = await bcrypt.hash(demoPassword, 12);
  const people = [
    ['Nguyễn Minh Anh','khachhang@chuyenphat.vn','0902000001','customer','25 Nguyễn Thị Minh Khai, Quận 1, TP. Hồ Chí Minh'],
    ['Trần Hoàng Nam','nhanvien@chuyenphat.vn','0902000002','employee','TP. Hồ Chí Minh'],
    ['Lê Thu Hà','thuha@chuyenphat.vn','0902000003','customer','18 Trần Phú, Đà Nẵng'],
    ['Phạm Đức Huy','huy@chuyenphat.vn','0902000004','employee','TP. Hồ Chí Minh'],
  ];
  for (const [name,email,phone,role,address] of people) await pool.execute("INSERT IGNORE INTO tai_khoan (ten,thu_dien_tu,mat_khau_bam,so_dien_thoai,vai_tro,dia_chi_lien_he) VALUES (?,?,?,?,?,?)", [name,email,demoHash,phone,role,address]);
  await pool.query("INSERT IGNORE INTO ho_so_nhan_vien(ma_tai_khoan,ma_nhan_vien_noi_bo,ngay_vao_lam) SELECT ma_so,CONCAT('NV',LPAD(ma_so,6,'0')),DATE(ngay_tao) FROM tai_khoan WHERE vai_tro='employee'");
  const [users] = await pool.query("SELECT ma_so,thu_dien_tu FROM tai_khoan");
  const userId = email => users.find(u => u.email === email).id;
  const adminId = userId(process.env.SEED_ADMIN_EMAIL || 'admin@chuyenphat.vn');
  const customerId = userId('khachhang@chuyenphat.vn');
  const employeeId = userId('nhanvien@chuyenphat.vn');
  const [services] = await pool.query("SELECT * FROM dich_vu ORDER BY ma_so");
  const statuses = ['pending','awaiting_pickup','delivering','completed','delivering','incomplete','completed','picked_up','cancelled','completed','pending','awaiting_pickup'];
  const receivers = ['Lê Bảo Ngọc','Trần Gia Hân','Nguyễn Đức Minh','Võ Thanh Tâm','Phạm Khánh Linh','Đỗ Quốc Bảo'];
  for (let i=0; i<statuses.length; i++) {
    await transaction(async connection => {
      const code = `CPNDEMO${String(i + 1).padStart(6,'0')}`;
      const [[existing]] = await connection.execute("SELECT ma_so FROM don_hang WHERE ma_van_don=?", [code]);
      if (existing) return;
      const status = statuses[i]; const service = services[i % services.length];
      const date = new Date(Date.now() - (11-i) * 11 * 3600000);
      const [result] = await connection.execute("INSERT INTO don_hang (ma_van_don,ma_khach_hang,ma_nhan_vien,ma_dich_vu,ten_nguoi_gui,sdt_nguoi_gui,dia_chi_nguoi_gui,ten_nguoi_nhan,sdt_nguoi_nhan,dia_chi_nguoi_nhan,noi_dung_hang_hoa,khoi_luong,khu_vuc,tien_thu_ho,cuoc_van_chuyen,nguoi_tra_cuoc,trang_thai,ngay_tao,ngay_giao_xong)\n        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", [code, customerId, ['pending','cancelled'].includes(status) ? null : employeeId, service.id, 'Nguyễn Minh Anh','0902000001','25 Nguyễn Thị Minh Khai, Quận 1, TP. Hồ Chí Minh', receivers[i%6], '0903000000', i%2 ? '36 Hai Bà Trưng, Hoàn Kiếm, Hà Nội' : '120 Võ Văn Ngân, TP. Thủ Đức, TP. Hồ Chí Minh', ['Tài liệu văn phòng','Quần áo & phụ kiện','Đồ dùng gia đình'][i%3], 1.5, i%2 ? 'domestic' : 'same_city', i%3 === 0 ? 0 : 250000 + i*30000, Number(service.base_fee)+Number(service.extra_half_kg)+(i%2?Number(service.domestic_surcharge):0),'sender',status,date,status === 'completed' ? new Date(date.getTime()+3600000) : null]);
      await connection.execute("UPDATE don_hang SET tong_thanh_toan=cuoc_van_chuyen,co_thu_ho=(tien_thu_ho>0) WHERE ma_so=?",[result.insertId]);
      const stages = status === 'pending' ? ['pending'] : status === 'cancelled' ? ['pending','cancelled'] : ['pending','accepted','awaiting_pickup','picked_up','delivering',status === 'incomplete' ? 'incomplete' : 'completed'];
      const last = stages.indexOf(status);
      for (let n=0;n<=last;n++) await connection.execute("INSERT INTO lich_su_don_hang (ma_don_hang,ma_nguoi_thuc_hien,trang_thai,ghi_chu,ngay_tao) VALUES (?,?,?,?,?)", [result.insertId,adminId,stages[n],stages[n] === 'incomplete' ? 'Không liên hệ được người nhận.' : stages[n] === 'cancelled' ? 'Khách hàng thay đổi kế hoạch gửi.' : 'Dữ liệu minh họa.',new Date(date.getTime()+n*600000)]);
    });
  }
  console.log('Đã tạo tài khoản và 12 đơn minh họa. Seed có thể chạy lại, không ghi đè dữ liệu đã có.');
}
seed().catch(error => { console.error(error.message); process.exitCode=1; }).finally(() => pool.end());

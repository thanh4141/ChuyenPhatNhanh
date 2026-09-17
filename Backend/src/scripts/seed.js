import bcrypt from 'bcryptjs';
import { pool, transaction } from '../config/database.js';
import { calculateFee } from '../modules/orders/order.domain.js';

async function seed() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminPassword || adminPassword.length < 8 || Buffer.byteLength(adminPassword) > 72) throw new Error('Đặt SEED_ADMIN_PASSWORD trong .env (ít nhất 8 ký tự, tối đa 72 byte).');
  const hash = await bcrypt.hash(adminPassword, 12);
  await pool.execute("INSERT IGNORE INTO users (name,email,password_hash,phone,role) VALUES (?,?,?,?,?)", ['Quản trị viên', process.env.SEED_ADMIN_EMAIL || 'admin@chuyenphat.vn', hash, '0901000000', 'admin']);
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
  for (const [name,email,phone,role,address] of people) await pool.execute('INSERT IGNORE INTO users (name,email,password_hash,phone,role,address) VALUES (?,?,?,?,?,?)', [name,email,demoHash,phone,role,address]);
  const [users] = await pool.query('SELECT id,email FROM users');
  const userId = email => users.find(u => u.email === email).id;
  const adminId = userId(process.env.SEED_ADMIN_EMAIL || 'admin@chuyenphat.vn');
  const customerId = userId('khachhang@chuyenphat.vn');
  const employeeId = userId('nhanvien@chuyenphat.vn');
  const [services] = await pool.query('SELECT * FROM services ORDER BY id');
  const statuses = ['pending','assigned','in_transit','delivered','out_for_delivery','failed','delivered','picked_up','cancelled','delivered','pending','assigned'];
  const receivers = ['Lê Bảo Ngọc','Trần Gia Hân','Nguyễn Đức Minh','Võ Thanh Tâm','Phạm Khánh Linh','Đỗ Quốc Bảo'];
  for (let i=0; i<statuses.length; i++) {
    await transaction(async connection => {
      const code = `CPNDEMO${String(i + 1).padStart(6,'0')}`;
      const [[existing]] = await connection.execute('SELECT id FROM orders WHERE tracking_code=?', [code]);
      if (existing) return;
      const status = statuses[i]; const service = services[i % services.length];
      const date = new Date(Date.now() - (11-i) * 11 * 3600000);
      const [result] = await connection.execute(`INSERT INTO orders (tracking_code,customer_id,employee_id,service_id,sender_name,sender_phone,sender_address,receiver_name,receiver_phone,receiver_address,package_name,weight,zone,cod_amount,shipping_fee,payer,status,created_at,delivered_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [code, customerId, ['pending','cancelled'].includes(status) ? null : employeeId, service.id, 'Nguyễn Minh Anh','0902000001','25 Nguyễn Thị Minh Khai, Quận 1, TP. Hồ Chí Minh', receivers[i%6], '0903000000', i%2 ? '36 Hai Bà Trưng, Hoàn Kiếm, Hà Nội' : '120 Võ Văn Ngân, TP. Thủ Đức, TP. Hồ Chí Minh', ['Tài liệu văn phòng','Quần áo & phụ kiện','Đồ dùng gia đình'][i%3], 1.5, i%2 ? 'domestic' : 'same_city', i%3 === 0 ? 0 : 250000 + i*30000, calculateFee(service,1.5,i%2 ? 'domestic':'same_city'),'sender',status,date,status === 'delivered' ? new Date(date.getTime()+3600000) : null]);
      const stages = status === 'pending' ? ['pending'] : status === 'cancelled' ? ['pending','cancelled'] : ['pending','assigned','picked_up','in_transit','out_for_delivery',status === 'failed' ? 'failed' : 'delivered'];
      const last = stages.indexOf(status);
      for (let n=0;n<=last;n++) await connection.execute('INSERT INTO order_events (order_id,actor_id,status,note,created_at) VALUES (?,?,?,?,?)', [result.insertId,adminId,stages[n],stages[n] === 'failed' ? 'Không liên hệ được người nhận.' : stages[n] === 'cancelled' ? 'Khách hàng thay đổi kế hoạch gửi.' : 'Dữ liệu minh họa.',new Date(date.getTime()+n*600000)]);
    });
  }
  console.log('Đã tạo tài khoản và 12 đơn minh họa. Seed có thể chạy lại, không ghi đè dữ liệu đã có.');
}
seed().catch(error => { console.error(error.message); process.exitCode=1; }).finally(() => pool.end());

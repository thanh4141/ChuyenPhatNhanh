import bcrypt from "bcryptjs";
import { pool, transaction } from "../config/database.js";

async function seed() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Admin@12345";
  if (adminPassword.length < 8 || Buffer.byteLength(adminPassword) > 72) {
    throw new Error("SEED_ADMIN_PASSWORD phải có ít nhất 8 ký tự, tối đa 72 byte.");
  }
  const hash = await bcrypt.hash(adminPassword, 12);
  await pool.execute(
    "INSERT IGNORE INTO tai_khoan (ten,thu_dien_tu,mat_khau_bam,so_dien_thoai,vai_tro) VALUES (?,?,?,?,?)",
    [
      "Quản trị viên",
      process.env.SEED_ADMIN_EMAIL || "admin@chuyenphat.vn",
      hash,
      "0901000000",
      "admin",
    ]
  );

  if (process.env.SEED_DEMO !== "true") {
    console.log("Đã tạo Admin (SEED_DEMO=false).");
    return;
  }

  const demoPassword = process.env.SEED_DEMO_PASSWORD || "Demo@12345";
  if (demoPassword.length < 8 || Buffer.byteLength(demoPassword) > 72) {
    throw new Error("SEED_DEMO_PASSWORD phải có ít nhất 8 ký tự, tối đa 72 byte.");
  }
  const demoHash = await bcrypt.hash(demoPassword, 12);

  // 1. Khởi tạo Trạm chuyển phát mặc định nếu chưa có
  const defaultStations = [
    ["Kho Hà Nội", "01", "126 Cầu Giấy, Quan Hoa, Cầu Giấy, Hà Nội", 21.033333, 105.783333],
    ["Kho Nghệ An", "40", "45 Lê Duẩn, Bến Thủy, TP. Vinh, Nghệ An", 18.666667, 105.683333],
    ["Kho Đà Nẵng", "48", "18 Trần Phú, Thạch Thang, Hải Châu, Đà Nẵng", 16.066667, 108.216667],
    ["Kho Đắk Lắk", "66", "10 Hai Bà Trưng, Thắng Lợi, TP. Buôn Ma Thuột, Đắk Lắk", 12.666667, 108.050000],
    ["Kho Hồ Chí Minh", "79", "25 Nguyễn Thị Minh Khai, Bến Nghé, Quận 1, TP. Hồ Chí Minh", 10.783333, 106.700000],
  ];
  for (const [name, province, address, lat, lng] of defaultStations) {
    await pool.execute(
      "INSERT IGNORE INTO tram_chuyen_phat (ten, ma_tinh_thanh, dia_chi_lien_he, vi_do, kinh_do, dang_hoat_dong) VALUES (?,?,?,?,?,TRUE)",
      [name, province, address, lat, lng]
    );
  }

  const [stations] = await pool.query("SELECT * FROM tram_chuyen_phat ORDER BY ma_so");
  const stationHn = stations.find((s) => (s.province_code || s.ma_tinh_thanh) === "01") || stations[0];
  const stationHcm = stations.find((s) => (s.province_code || s.ma_tinh_thanh) === "79") || stations[stations.length - 1];
  const stationDn = stations.find((s) => (s.province_code || s.ma_tinh_thanh) === "48") || stations[1] || stations[0];

  const stationHnId = Number(stationHn.id || stationHn.ma_so);
  const stationHcmId = Number(stationHcm.id || stationHcm.ma_so);
  const stationDnId = Number(stationDn.id || stationDn.ma_so);

  // 2. Tạo tài khoản mẫu
  const people = [
    ["Đinh Xuân Trường", "khachhang@chuyenphat.vn", "0902000001", "customer", "25 Nguyễn Thị Minh Khai, Quận 1, TP. Hồ Chí Minh", null],
    ["Nguyễn Minh Anh", "minhanh@chuyenphat.vn", "0902000005", "customer", "36 Hai Bà Trưng, Hoàn Kiếm, Hà Nội", null],
    ["Lê Thu Hà", "thuha@chuyenphat.vn", "0902000003", "customer", "18 Trần Phú, Hải Châu, Đà Nẵng", null],
    ["Trần Hoàng Nam", "nhanvien@chuyenphat.vn", "0902000002", "employee", "Kho Hồ Chí Minh", stationHcmId],
    ["Nguyễn Văn Phúc", "nhanvien1@chuyenphat.vn", "0902000011", "employee", "Kho Hà Nội", stationHnId],
    ["Lê Thành Đạt", "nhanvien2@chuyenphat.vn", "0902000012", "employee", "Kho Đà Nẵng", stationDnId],
    ["Trưởng Trạm Hà Nội", "hanoi@chuyenphat.vn", "0902000021", "station_manager", "Kho Hà Nội", stationHnId],
    ["Trưởng Trạm HCM", "hochiminh@chuyenphat.vn", "0902000022", "station_manager", "Kho Hồ Chí Minh", stationHcmId],
  ];

  for (const [name, email, phone, role, address, stationId] of people) {
    await pool.execute(
      "INSERT IGNORE INTO tai_khoan (ten,thu_dien_tu,mat_khau_bam,so_dien_thoai,vai_tro,dia_chi_lien_he,ma_tram) VALUES (?,?,?,?,?,?,?)",
      [name, email, demoHash, phone, role, address, stationId ?? null]
    );
  }

  await pool.query(
    "INSERT IGNORE INTO ho_so_nhan_vien(ma_tai_khoan,ma_nhan_vien_noi_bo,ngay_vao_lam) SELECT ma_so,CONCAT('NV',LPAD(ma_so,6,'0')),DATE(ngay_tao) FROM tai_khoan WHERE vai_tro IN ('employee','station_manager')"
  );

  const [users] = await pool.query("SELECT * FROM tai_khoan");
  const findUser = (email, role) => {
    const found = users.find((u) => (u.email || u.thu_dien_tu) === email);
    if (found) return Number(found.id || found.ma_so);
    const byRole = users.find((u) => (u.role || u.vai_tro) === role);
    return byRole ? Number(byRole.id || byRole.ma_so) : 1;
  };

  const adminId = findUser(process.env.SEED_ADMIN_EMAIL || "admin@chuyenphat.vn", "admin");
  const customerId = findUser("khachhang@chuyenphat.vn", "customer");
  const employeeHnId = findUser("nhanvien1@chuyenphat.vn", "employee");
  const employeeHcmId = findUser("nhanvien@chuyenphat.vn", "employee") || employeeHnId;
  const managerHnId = findUser("hanoi@chuyenphat.vn", "station_manager") || adminId;

  const [services] = await pool.query("SELECT * FROM dich_vu ORDER BY ma_so");
  const stdServiceId = Number(services[0]?.id || services[0]?.ma_so || 1);
  const fastServiceId = Number(services[1]?.id || services[1]?.ma_so || stdServiceId);

  // 3. Danh sách 12 trạng thái hệ thống, mỗi trạng thái 5 đơn hàng mẫu (tổng cộng 60 đơn)
  const targetStatuses = [
    { code: "pending", name: "Chờ nhận", prefix: "CPN-PEND" },
    { code: "accepted", name: "Đã nhận", prefix: "CPN-ACPT" },
    { code: "awaiting_pickup", name: "Chờ lấy hàng", prefix: "CPN-AWPK" },
    { code: "picked_up", name: "Đã lấy hàng", prefix: "CPN-PKUP" },
    { code: "at_origin", name: "Đã về kho / Chờ trung chuyển", prefix: "CPN-ORIG" },
    { code: "in_transit", name: "Đang trung chuyển", prefix: "CPN-TRAN" },
    { code: "at_destination", name: "Đã về trạm giao", prefix: "CPN-DEST" },
    { code: "ready_delivery", name: "Đã phân công giao", prefix: "CPN-REDY" },
    { code: "delivering", name: "Đang giao", prefix: "CPN-DELV" },
    { code: "completed", name: "Hoàn thành", prefix: "CPN-DONE" },
    { code: "incomplete", name: "Chưa hoàn thành", prefix: "CPN-FAIL" },
    { code: "cancelled", name: "Đã hủy", prefix: "CPN-CANC" },
  ];

  // Dữ liệu mẫu phong phú
  const samplePackages = [
    { name: "Hồ sơ & Tài liệu thầu", weight: 0.8, cod: 0, is_fragile: 0 },
    { name: "Bộ quần áo thời trang thiết kế", weight: 1.5, cod: 450000, is_fragile: 0 },
    { name: "Linh kiện vi tính & Tai nghe Gaming", weight: 2.2, cod: 1200000, is_fragile: 1 },
    { name: "Mỹ phẩm chăm sóc da & Nước hoa", weight: 1.0, cod: 680000, is_fragile: 1 },
    { name: "Đặc sản hạt điều & Trà Ô Long", weight: 3.5, cod: 320000, is_fragile: 0 },
  ];

  const senderList = [
    { name: "Đinh Xuân Trường", phone: "0902000001", address: "25 Nguyễn Thị Minh Khai, Bến Nghé, Quận 1, TP. Hồ Chí Minh", prov: "79", lat: 10.7833, lng: 106.7000 },
    { name: "Nguyễn Minh Anh", phone: "0902000005", address: "36 Hai Bà Trưng, Tràng Tiền, Hoàn Kiếm, Hà Nội", prov: "01", lat: 21.0285, lng: 105.8542 },
    { name: "Lê Thu Hà", phone: "0902000003", address: "18 Trần Phú, Thạch Thang, Hải Châu, Đà Nẵng", prov: "48", lat: 16.0667, lng: 108.2167 },
    { name: "Phạm Quốc Huy", phone: "0903112233", address: "102 Lê Hồng Phong, TP. Vinh, Nghệ An", prov: "40", lat: 18.6732, lng: 105.6811 },
    { name: "Hoàng Gia Bảo", phone: "0904556677", address: "55 Lê Thánh Tông, Thắng Lợi, TP. Buôn Ma Thuột, Đắk Lắk", prov: "66", lat: 12.6711, lng: 108.0433 },
  ];

  const receiverList = [
    { name: "Trần Bảo Ngọc", phone: "0981112233", address: "88 Cầu Giấy, Quan Hoa, Cầu Giấy, Hà Nội", prov: "01", lat: 21.0333, lng: 105.7833 },
    { name: "Võ Thanh Tâm", phone: "0982223344", address: "120 Võ Văn Ngân, Bình Thọ, TP. Thủ Đức, TP. Hồ Chí Minh", prov: "79", lat: 10.8500, lng: 106.7667 },
    { name: "Phạm Khánh Linh", phone: "0983334455", address: "45 Nguyễn Văn Linh, Nam Dương, Hải Châu, Đà Nẵng", prov: "48", lat: 16.0594, lng: 108.2120 },
    { name: "Nguyễn Đức Minh", phone: "0984445566", address: "230 Nguyễn Trãi, Thanh Xuân Trung, Thanh Xuân, Hà Nội", prov: "01", lat: 20.9950, lng: 105.8080 },
    { name: "Đỗ Quốc Bảo", phone: "0985556677", address: "354 Cộng Hòa, Phường 13, Tân Bình, TP. Hồ Chí Minh", prov: "79", lat: 10.8033, lng: 106.6433 },
  ];

  // Tạo chuyến xe trung chuyển mẫu cho trạng thái in_transit
  let transitBatchId = null;
  const transitBatchCode = "CHUYEN-HN-HCM-01";
  const [[existingBatch]] = await pool.execute(
    "SELECT * FROM chuyen_trung_chuyen WHERE ma_dinh_danh=?",
    [transitBatchCode]
  );
  if (existingBatch) {
    transitBatchId = Number(existingBatch.id || existingBatch.ma_so);
  } else {
    const [batchRes] = await pool.execute(
      "INSERT INTO chuyen_trung_chuyen (ma_dinh_danh, ma_tram_gui, ma_tram_dich, ma_tram_giao_cuoi, trang_thai, ma_nguoi_thuc_hien, ngay_tao, ngay_xuat_kho) VALUES (?,?,?,?,'dispatched',?,NOW(),NOW())",
      [transitBatchCode, stationHnId, stationHcmId, stationHcmId, managerHnId]
    );
    transitBatchId = Number(batchRes.insertId);
  }

  let totalInserted = 0;

  for (const st of targetStatuses) {
    for (let i = 1; i <= 5; i++) {
      const code = `${st.prefix}-${String(i).padStart(3, "0")}`;
      const pkg = samplePackages[(i - 1) % samplePackages.length];
      const snd = senderList[(i - 1) % senderList.length];
      const rcv = receiverList[(i - 1) % receiverList.length];
      const serviceId = i % 2 === 0 ? fastServiceId : stdServiceId;

      const isSameCity = snd.prov === rcv.prov;
      const routeType = isSameCity ? "same_province" : "inter_region";
      const baseFee = isSameCity ? 22000 : 45000;
      const extraFee = Math.round(pkg.weight * 5000);
      const shippingFee = baseFee + extraFee;
      const totalAmount = shippingFee;

      const originStationId = snd.prov === "01" ? stationHnId : stationHcmId;
      const destStationId = rcv.prov === "01" ? stationHnId : stationHcmId;

      let currentStation = null;
      let pickupEmp = null;
      let deliveryEmp = null;
      let activeEmp = null;
      let currentBatch = null;

      if (["accepted", "awaiting_pickup"].includes(st.code)) {
        pickupEmp = employeeHnId;
        activeEmp = employeeHnId;
      } else if (st.code === "picked_up") {
        pickupEmp = employeeHnId;
        activeEmp = employeeHnId;
      } else if (st.code === "at_origin") {
        pickupEmp = employeeHnId;
        currentStation = originStationId;
      } else if (st.code === "in_transit") {
        pickupEmp = employeeHnId;
        currentBatch = transitBatchId;
      } else if (st.code === "at_destination") {
        currentStation = destStationId;
      } else if (st.code === "ready_delivery") {
        currentStation = destStationId;
        deliveryEmp = employeeHcmId;
      } else if (["delivering", "incomplete", "completed"].includes(st.code)) {
        pickupEmp = employeeHnId;
        deliveryEmp = employeeHcmId;
        activeEmp = employeeHcmId;
      }

      const dateBase = new Date(Date.now() - (6 - i) * 86400000 - 3600000 * (12 - targetStatuses.indexOf(st)));
      const deliveredAt = st.code === "completed" ? new Date(dateBase.getTime() + 7200000) : null;

      const pickupSnapshot = {
        contact_name: snd.name,
        phone: snd.phone,
        province_code: snd.prov,
        province_name: snd.prov === "01" ? "Hà Nội" : "Hồ Chí Minh",
        ward: "Phường Trung Tâm",
        detail: snd.address,
        formatted_address: snd.address,
        latitude: snd.lat,
        longitude: snd.lng,
      };

      const deliverySnapshot = {
        contact_name: rcv.name,
        phone: rcv.phone,
        province_code: rcv.prov,
        province_name: rcv.prov === "01" ? "Hà Nội" : "Hồ Chí Minh",
        ward: "Phường Trung Tâm",
        detail: rcv.address,
        formatted_address: rcv.address,
        latitude: rcv.lat,
        longitude: rcv.lng,
      };

      const pricingSnapshot = {
        base_fee: baseFee,
        weight_fee: extraFee,
        distance_fee: 0,
        shipping_fee: shippingFee,
        total_amount: totalAmount,
        distance_meters: isSameCity ? 8500 : 1720000,
        route_type: routeType,
      };

      await transaction(async (c) => {
        const [[existing]] = await c.execute("SELECT * FROM don_hang WHERE ma_van_don=?", [code]);
        let orderId;

        if (existing) {
          orderId = Number(existing.id || existing.ma_so);
          await c.execute(
            `UPDATE don_hang SET
              trang_thai=?, ma_nhan_vien=?, ma_tram_gui=?, ma_tram_dich=?, ma_tram_hien_tai=?,
              ma_nv_lay_hang=?, ma_nv_giao_hang=?, ma_chuyen_hien_tai=?, ngay_giao_xong=?,
              noi_dung_hang_hoa=?, khoi_luong=?, tien_thu_ho=?, cuoc_van_chuyen=?, tong_thanh_toan=?,
              hang_de_vo=?, co_thu_ho=?
            WHERE ma_so=?`,
            [
              st.code, activeEmp, originStationId, destStationId, currentStation,
              pickupEmp, deliveryEmp, currentBatch, deliveredAt,
              pkg.name, pkg.weight, pkg.cod, shippingFee, totalAmount,
              pkg.is_fragile, pkg.cod > 0 ? 1 : 0, orderId
            ]
          );
        } else {
          const [insertRes] = await c.execute(
            `INSERT INTO don_hang (
              ma_van_don, ma_khach_hang, ma_nhan_vien, ma_dich_vu,
              ten_nguoi_gui, sdt_nguoi_gui, dia_chi_nguoi_gui,
              ten_nguoi_nhan, sdt_nguoi_nhan, dia_chi_nguoi_nhan,
              noi_dung_hang_hoa, khoi_luong, khu_vuc, tien_thu_ho,
              cuoc_van_chuyen, tong_thanh_toan, nguoi_tra_cuoc, trang_thai,
              ngay_tao, ngay_giao_xong, ma_tram_gui, ma_tram_dich, ma_tram_hien_tai,
              ma_nv_lay_hang, ma_nv_giao_hang, ma_chuyen_hien_tai, loai_tuyen,
              hang_de_vo, co_thu_ho, thong_tin_lay_hang, thong_tin_giao_hang, chi_tiet_cuoc,
              quang_duong_met, nguon_quang_duong
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'sender',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
              code, customerId, activeEmp, serviceId,
              snd.name, snd.phone, snd.address,
              rcv.name, rcv.phone, rcv.address,
              pkg.name, pkg.weight, isSameCity ? "same_city" : "domestic", pkg.cod,
              shippingFee, totalAmount, st.code,
              dateBase, deliveredAt, originStationId, destStationId, currentStation,
              pickupEmp, deliveryEmp, currentBatch, routeType,
              pkg.is_fragile, pkg.cod > 0 ? 1 : 0,
              JSON.stringify(pickupSnapshot), JSON.stringify(deliverySnapshot), JSON.stringify(pricingSnapshot),
              isSameCity ? 8500 : 1720000, "osrm"
            ]
          );
          orderId = Number(insertRes.insertId);
          totalInserted++;
        }

        // Nếu là hàng đang trung chuyển, liên kết vào kien_trung_chuyen
        if (st.code === "in_transit" && transitBatchId) {
          await c.execute(
            "INSERT IGNORE INTO kien_trung_chuyen (ma_chuyen, ma_don_hang, ngay_nhap_kho) VALUES (?,?,NOW())",
            [transitBatchId, orderId]
          );
        }

        // Xóa lịch sử cũ và tạo lại toàn bộ dòng thời gian cho chuẩn xác
        await c.execute("DELETE FROM lich_su_don_hang WHERE ma_don_hang=?", [orderId]);

        // Xây dựng mốc sự kiện logic theo từng trạng thái
        const stages = [];
        stages.push({ st: "pending", note: "Đơn hàng đã được tạo thành công trên hệ thống.", t: 0, actor: customerId });

        if (st.code === "cancelled") {
          stages.push({ st: "cancelled", note: "Khách hàng đã hủy đơn do thay đổi kế hoạch.", t: 1800000, actor: customerId });
        } else {
          if (["accepted", "awaiting_pickup", "picked_up", "at_origin", "in_transit", "at_destination", "ready_delivery", "delivering", "completed", "incomplete"].includes(st.code)) {
            stages.push({ st: "accepted", note: "Trạm gửi đã tiếp nhận và xác nhận đơn vận chuyển.", t: 900000, actor: managerHnId });
          }
          if (["awaiting_pickup", "picked_up", "at_origin", "in_transit", "at_destination", "ready_delivery", "delivering", "completed", "incomplete"].includes(st.code)) {
            stages.push({ st: "awaiting_pickup", note: "Shipper đang di chuyển đến địa chỉ người gửi để nhận bưu phẩm.", t: 1800000, actor: employeeHnId });
          }
          if (["picked_up", "at_origin", "in_transit", "at_destination", "ready_delivery", "delivering", "completed", "incomplete"].includes(st.code)) {
            stages.push({ st: "picked_up", note: "Shipper đã kiểm tra, cân đo và lấy hàng thành công.", t: 3600000, actor: employeeHnId });
          }
          if (["at_origin", "in_transit", "at_destination", "ready_delivery", "delivering", "completed", "incomplete"].includes(st.code)) {
            stages.push({ st: "at_origin", note: `Bưu phẩm đã nhập kho tại trạm gửi, chuẩn bị đóng chuyến.`, t: 5400000, actor: managerHnId });
          }
          if (["in_transit", "at_destination", "ready_delivery"].includes(st.code)) {
            stages.push({ st: "in_transit", note: `Đang trung chuyển trên tuyến xe tải đến trạm đích.`, t: 7200000, actor: managerHnId });
          }
          if (["at_destination", "ready_delivery"].includes(st.code)) {
            stages.push({ st: "at_destination", note: `Kiện hàng đã đến kho bưu cục phát.`, t: 10800000, actor: adminId });
          }
          if (st.code === "ready_delivery") {
            stages.push({ st: "ready_delivery", note: "Bưu cục đã phân công nhân viên phụ trách tuyến phát.", t: 12600000, actor: adminId });
          }
          if (["delivering", "completed", "incomplete"].includes(st.code)) {
            stages.push({ st: "delivering", note: "Shipper đang trên đường giao hàng đến địa chỉ người nhận.", t: 14400000, actor: employeeHcmId });
          }
          if (st.code === "completed") {
            stages.push({ st: "completed", note: "Giao hàng thành công! Người nhận đã kiểm tra và ký nhận đủ.", t: 18000000, actor: employeeHcmId });
          }
          if (st.code === "incomplete") {
            stages.push({ st: "incomplete", note: "Giao hàng chưa thành công: Người nhận hẹn giao lại vào ngày hôm sau.", t: 16200000, actor: employeeHcmId });
          }
        }

        for (const item of stages) {
          await c.execute(
            "INSERT INTO lich_su_don_hang (ma_don_hang, ma_nguoi_thuc_hien, trang_thai, ghi_chu, ngay_tao) VALUES (?,?,?,?,?)",
            [orderId, item.actor, item.st, item.note, new Date(dateBase.getTime() + item.t)]
          );
        }
      });
    }
  }

  console.log(`\n Hoàn tất nạp dữ liệu mẫu:`);
  console.log(`- Đã khởi tạo 60 đơn hàng mẫu (mỗi trạng thái đúng 5 đơn cho đủ 12 trạng thái hệ thống).`);
  console.log(`- Tài khoản kiểm thử khách hàng: khachhang@chuyenphat.vn / Demo@12345`);
  console.log(`- Tài khoản shipper Hà Nội: nhanvien1@chuyenphat.vn / Demo@12345`);
  console.log(`- Tài khoản shipper TP.HCM: nhanvien@chuyenphat.vn / Demo@12345`);
  console.log(`- Tài khoản quản trị viên: admin@chuyenphat.vn / Admin@12345`);
}

seed()
  .catch((error) => {
    console.error("Lỗi khi seed dữ liệu:", error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());

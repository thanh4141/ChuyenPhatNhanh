import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import sharp from "sharp";
import { readFile, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { mapsFixture, locationFixture } from "./maps.fixture.js";
process.env.DB_NAME = `cpn_test_${Date.now()}_${process.pid}`;
process.env.JWT_SECRET = "integration-test-only-secret-more-than-32-characters";

const { env } = await import("../src/config/env.js"),
  { migrate } = await import("../src/scripts/migrate.js"),
  { pool } = await import("../src/config/database.js"),
  { createApp } = await import("../src/app.js");
const directory = fileURLToPath(
  new URL(
    "../../.local/test-uploads/" + process.env.DB_NAME + "/",
    import.meta.url,
  ),
);
let app, image, pickupId, stationId;
const users = {},
  tokens = {},
  password = "TestPass123!";
const auth = (method, path, role = "customer", target = app) =>
  request(target)
    [method]("/api" + path)
    .set("Authorization", "Bearer " + tokens[role]);
const quoteInput = () => ({
  pickup_address_id: pickupId,
  delivery: locationFixture,
  service_id: 1,
  weight: 1.51,
  has_cod: true,
  cod_amount: 250000,
  has_insurance: true,
  has_packaging: true,
});
async function quote(extra = {}) {
  return (
    await auth("post", "/services/quote")
      .send({ ...quoteInput(), ...extra })
      .expect(200)
  ).body;
}
async function upload(
  role = "customer",
  purpose = role === "customer" ? "parcel" : "incident",
) {
  return (
    await auth("post", "/media/" + purpose, role)
      .attach("image", image, "photo.png")
      .expect(201)
  ).body.id;
}
// These regression cases exercise historical orders already in progress before station rollout. New station orders have their own end-to-end suite.
async function create() {
  const q = await quote(),
    photo = await upload();
  const order = (
    await auth("post", "/orders")
      .send({
        quote_id: q.quote_id,
        parcel_photo_id: photo,
        package_name: "Kiện hàng kiểm thử",
        note: "Gọi trước khi giao",
      })
      .expect(201)
  ).body.order;
  await auth("post", "/logistics/assign-pickup", "admin")
    .send({
      station_id: order.origin_station_id,
      employee_id: users.employee.id,
      order_ids: [order.id],
    })
    .expect(200);
  return order;
}
const update = (o, status, extra = {}) =>
  auth("patch", "/orders/" + o.id + "/status", "employee").send({
    status,
    ...extra,
  });
const accept = async (o) => {
  await auth("post", "/orders/" + o.id + "/accept", "employee").expect(200);
  await pool.execute(
    "UPDATE don_hang SET ma_tram_gui=NULL,ma_tram_dich=NULL WHERE ma_so=?",
    [o.id],
  );
};
before(async () => {
  await mkdir(directory, { recursive: true });
  // Build an old-version database with a delivered order to test real upgrade preservation.
  const c = await mysql.createConnection({ ...env.db, database: undefined });
  try {
    await c.query(
      `CREATE DATABASE \`${env.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    await c.changeUser({ database: env.db.database });
    const sql = await readFile(
      new URL("../src/scripts/legacy/schema.sql", import.meta.url),
      "utf8",
    );
    for (const s of sql
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean))
      await c.query(s);
    await c.query(
      "INSERT INTO users(name,email,password_hash,phone,role) VALUES ('Legacy','legacy@test.vn','unusable','0901111111','customer')",
    );
    await c.query(
      "INSERT INTO services(code,name,description,base_fee,extra_half_kg,domestic_surcharge,estimated_days) VALUES ('standard','Tiêu chuẩn','Legacy',25000,5000,15000,'2–4 ngày')",
    );
    await c.query(
      "INSERT INTO orders(tracking_code,customer_id,service_id,sender_name,sender_phone,sender_address,receiver_name,receiver_phone,receiver_address,package_name,weight,zone,cod_amount,shipping_fee,status) VALUES ('CPNLEGACY000001',1,1,'Sender','0901111111','Original pickup','Receiver','0902222222','Original destination','Original parcel',1,'same_city',100000,42000,'delivered')",
    );
    await c.query(
      "INSERT INTO order_events(order_id,actor_id,status,note) VALUES (1,1,'delivered','Original event')",
    );
  } finally {
    await c.end();
  }
  await migrate();
  await migrate();
  await pool.query(
    "INSERT INTO tram_chuyen_phat(ten,ma_tinh_thanh,dia_chi_lien_he,vi_do,kinh_do) SELECT ten,ma_dinh_danh,'Trạm kiểm thử',10.78,106.7 FROM tinh_thanh",
  );
  app = createApp({ mapsProvider: mapsFixture, uploadDirectory: directory });
  image = await sharp({
    create: { width: 4, height: 4, channels: 3, background: "#155d4b" },
  })
    .png()
    .toBuffer();
  const hash = await bcrypt.hash(password, 4);
  for (const key of [
    "admin",
    "employee",
    "customer",
    "otherCustomer",
    "otherEmployee",
  ]) {
    const role =
      key === "otherCustomer"
        ? "customer"
        : key === "otherEmployee"
          ? "employee"
          : key;
    const [r] = await pool.execute(
      "INSERT INTO tai_khoan(ten,thu_dien_tu,mat_khau_bam,so_dien_thoai,vai_tro) VALUES (?,?,?,?,?)",
      [key, key.toLowerCase() + "@test.vn", hash, "0901111111", role],
    );
    users[key] = { id: r.insertId };
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: key.toLowerCase() + "@test.vn", password })
      .expect(200);
    tokens[key] = login.body.token;
  }
  const [[station]] = await pool.execute(
    "SELECT ma_so FROM tram_chuyen_phat WHERE ma_tinh_thanh=?",
    ["79"],
  );
  stationId = station.id;
  await pool.execute(
    "UPDATE tai_khoan SET ma_tram=? WHERE vai_tro='employee'",
    [stationId],
  );
  const a = await auth("post", "/addresses")
    .send({ ...locationFixture, label: "Nhà", is_default: true })
    .expect(201);
  pickupId = a.body.id;
});
after(async () => {
  await pool.end();
  assert.match(env.db.database, /^cpn_test_\d+_\d+$/);
  const c = await mysql.createConnection({ ...env.db, database: undefined });
  try {
    await c.query(`DROP DATABASE IF EXISTS \`${env.db.database}\``);
  } finally {
    await c.end();
  }
  // Only this run's owned, resolved upload directory is removed.
  assert.ok(
    directory.includes("/test-uploads/") ||
      directory.includes("\\test-uploads\\"),
  );
  assert.ok(
    directory.endsWith(env.db.database + "/") ||
      directory.endsWith(env.db.database + "\\"),
  );
  await rm(directory, { recursive: true, force: true });
});
test("Migration preserves old data and fees, maps statuses and is idempotent", async () => {
  const [[o]] = await pool.query("SELECT * FROM don_hang WHERE ma_so=1");
  assert.equal(o.status, "completed");
  assert.equal(Number(o.total_amount), 42000);
  assert.equal(o.package_name, "Original parcel");
  assert.equal(o.distance_source, "legacy");
  const [[e]] = await pool.query(
    "SELECT * FROM lich_su_don_hang WHERE ma_don_hang=1",
  );
  assert.equal(e.status, "completed");
  assert.equal(e.note, "Original event");
  const [[{ n }]] = await pool.query("SELECT COUNT(*) AS n FROM bang_cuoc");
  assert.equal(n, 6);
});
test("MySQL health, authentication and non-escalating registration", async () => {
  assert.equal(
    (await request(app).get("/api/health").expect(200)).body.database,
    "mysql",
  );
  await request(app).get("/api/orders").expect(401);
  const input = {
    name: "Khách mới",
    email: "new@test.vn",
    phone: "0901111111",
    password,
  };
  await request(app)
    .post("/api/auth/register")
    .send({ ...input, role: "admin" })
    .expect(400);
  const r = await request(app)
    .post("/api/auth/register")
    .send(input)
    .expect(201);
  assert.equal(r.body.user.role, "customer");
  assert.equal(r.body.user.password_hash, undefined);
  await request(app).post("/api/auth/register").send(input).expect(409);
});
test("Admin orders are read-only; customer accounts only lock/unlock", async () => {
  await auth("post", "/orders", "admin").send({}).expect(403);
  await auth("patch", "/orders/1/status", "admin")
    .send({ status: "cancelled" })
    .expect(403);
  await auth("patch", "/orders/1/assign", "admin")
    .send({ employee_id: users.employee.id })
    .expect(404);
  await auth("post", "/users", "admin")
    .send({
      name: "Customer",
      email: "other@test.vn",
      phone: "0901111111",
      password,
      role: "customer",
    })
    .expect(400);
  await auth("patch", "/users/" + users.customer.id, "admin")
    .send({ name: "Changed" })
    .expect(403);
  await auth("get", "/users", "employee").expect(403);
  await auth("get", "/dashboard").expect(403);
});
test("Address ownership, verified province and one default address", async () => {
  await auth("get", "/addresses", "employee").expect(403);
  await auth("patch", "/addresses/" + pickupId, "otherCustomer")
    .send({ ...locationFixture, label: "Stolen" })
    .expect(404);
  await auth("post", "/addresses")
    .send({ ...locationFixture, province_code: "01" })
    .expect(422);
  const a = (
    await auth("post", "/addresses")
      .send({ ...locationFixture, label: "Office", is_default: true })
      .expect(201)
  ).body.id;
  let list = (await auth("get", "/addresses").expect(200)).body.items;
  assert.equal(list.filter((a) => a.is_default).length, 1);
  assert.equal(list[0].id, a);
  await auth("delete", "/addresses/" + a).expect(200);
  list = (await auth("get", "/addresses")).body.items;
  assert.equal(list[0].id, pickupId);
  assert.equal(list[0].is_default, 1);
});
test("Quote uses road distance pickup-to-recipient, three routes, exact fees and strict input", async () => {
  const q = await quote();
  assert.equal(q.route_type, "same_province");
  assert.equal(q.distance_meters, 6321);
  assert.equal(q.total_amount, 38863);
  assert.equal(q.shipping_fee, 23963);
  const call = mapsFixture.calls.at(-1);
  assert.equal(Number(call.from.latitude), locationFixture.latitude);
  assert.equal(call.to.longitude, locationFixture.longitude);
  assert.equal(
    (
      await quote({
        delivery: { ...locationFixture, longitude: 107.1, province_code: "75" },
      })
    ).route_type,
    "same_region",
  );
  assert.equal(
    (
      await quote({
        delivery: { ...locationFixture, latitude: 21.02, province_code: "01" },
      })
    ).route_type,
    "inter_region",
  );
  await auth("post", "/services/quote")
    .send({ ...quoteInput(), weight: 1.001 })
    .expect(400);
  await auth("post", "/services/quote")
    .send({ ...quoteInput(), distance_meters: 1 })
    .expect(400);
  await auth("post", "/services/quote")
    .send({ ...quoteInput(), has_cod: false, cod_amount: 10 })
    .expect(400);
  await auth("post", "/services/quote", "otherCustomer")
    .send(quoteInput())
    .expect(404);
});
test("Open maps config needs no API key; provider failure never creates a fake quote", async () => {
  const { AppError } = await import("../src/common/errors.js");
  const broken = createApp({
    mapsProvider: {
      ...mapsFixture,
      route: async () => {
        throw new AppError(502, "Provider offline");
      },
    },
    uploadDirectory: directory,
  });
  await auth("post", "/services/quote", "customer", broken)
    .send(quoteInput())
    .expect(502);
  const c = (await request(broken).get("/api/maps/config")).body;
  assert.equal(c.configured, true);
  assert.equal(c.provider, "openstreetmap");
  assert.equal(c.server_key, undefined);
  assert.equal(c.provinces.length, 34);
});
test("Order creation snapshots quote, rejects tampering, is idempotent and respects expiry", async () => {
  const q = await quote(),
    photo = await upload(),
    body = {
      quote_id: q.quote_id,
      parcel_photo_id: photo,
      package_name: "Ảnh hàng hóa",
    };
  await auth("post", "/orders")
    .send({ ...body, total_amount: 1 })
    .expect(400);
  const o = (await auth("post", "/orders").send(body).expect(201)).body.order;
  assert.equal(Number(o.total_amount), 38863);
  assert.equal(o.pickup_snapshot.id, pickupId);
  assert.ok(Math.abs(Date.now() - new Date(o.created_at)) < 10000);
  assert.equal(
    (await auth("post", "/orders").send(body).expect(200)).body.order.id,
    o.id,
  );
  const expired = await quote();
  await pool.execute(
    "UPDATE bao_gia_van_chuyen SET ngay_het_han=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 1 SECOND) WHERE ma_so=?",
    [expired.quote_id],
  );
  await auth("post", "/orders")
    .send({ ...body, quote_id: expired.quote_id })
    .expect(409);
  await auth("get", "/orders/" + o.id, "otherCustomer").expect(404);
});
test("Two simultaneous employee claims produce one acceptance; ownership changes atomically", async () => {
  const o = await create();
  await auth("get", "/orders/" + o.id, "otherEmployee").expect(404);
  const results = await Promise.all(
    ["employee", "otherEmployee"].map((role) =>
      auth("post", "/orders/" + o.id + "/accept", role),
    ),
  );
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 403]);
  const winner = results[0].status === 200 ? "employee" : "otherEmployee",
    loser = winner === "employee" ? "otherEmployee" : "employee";
  await auth("get", "/orders/" + o.id, loser).expect(404);
  const d = (await auth("get", "/orders/" + o.id, winner)).body;
  assert.equal(d.events.filter((e) => e.status === "accepted").length, 1);
  await auth("get", "/media/" + d.media[0].id + "/content", loser).expect(404);
  await auth("patch", "/orders/" + o.id + "/status")
    .send({ status: "cancelled", note: "Hủy khi đã nhận" })
    .expect(200);
});
test("Full delivery, notification, review uniqueness and staff statistics", async () => {
  const o = await create();
  await accept(o);
  await update(o, "completed").expect(409);
  for (const s of ["awaiting_pickup", "picked_up", "delivering"])
    await update(o, s).expect(200);
  await auth("patch", "/orders/" + o.id + "/status")
    .send({ status: "cancelled", note: "Đã lấy không hủy" })
    .expect(409);
  await update(o, "completed").expect(400);
  const proof = await upload("employee", "delivery");
  await update(o, "completed", { delivery_photo_id: proof }).expect(200);
  await update(o, "delivering").expect(409);
  const d = (await auth("get", "/orders/" + o.id)).body;
  assert.ok(d.order.delivered_at);
  assert.equal(d.events.length, 6);
  const notices = (await auth("get", "/notifications?limit=100")).body;
  const invite = notices.items.find(
    (n) => n.order_id === o.id && n.type === "review_invite",
  );
  assert.ok(invite);
  await auth(
    "patch",
    "/notifications/" + invite.id + "/read",
    "otherCustomer",
  ).expect(404);
  await auth("patch", "/notifications/" + invite.id + "/read").expect(200);
  await auth("post", "/orders/" + o.id + "/review", "otherCustomer")
    .send({ stars: 5, comment: "Tốt" })
    .expect(404);
  await auth("post", "/orders/" + o.id + "/review")
    .send({ stars: 5, comment: "Giao đúng hẹn" })
    .expect(201);
  await auth("post", "/orders/" + o.id + "/review")
    .send({ stars: 1, comment: "Lần hai" })
    .expect(409);
  const stats = (await auth("get", "/employees/me", "employee")).body;
  assert.equal(Number(stats.stats.completed), 1);
  assert.equal(Number(stats.stats.average_stars), 5);
  assert.equal(stats.reviews[0].comment, "Giao đúng hẹn");
});
test("Incident requires reason and valid owned photo, rolls back invalid attachment", async () => {
  const o = await create();
  await accept(o);
  for (const s of ["awaiting_pickup", "picked_up", "delivering"])
    await update(o, s).expect(200);
  await update(o, "incomplete", { note: "Gặp sự cố" }).expect(400);
  const wrong = await upload("otherEmployee");
  await update(o, "incomplete", {
    note: "Gặp sự cố",
    incident_photo_id: wrong,
  }).expect(400);
  assert.equal(
    (await auth("get", "/orders/" + o.id)).body.order.status,
    "delivering",
  );
  const photo = await upload("employee");
  await update(o, "incomplete", {
    note: "Người nhận vắng mặt",
    incident_photo_id: photo,
  }).expect(200);
  const d = (await auth("get", "/orders/" + o.id)).body;
  assert.equal(d.media.filter((m) => m.purpose === "incident").length, 1);
  assert.equal(d.events.length, 6);
  await auth("get", "/media/" + photo + "/content").expect(200);
  await auth("post", "/orders/" + o.id + "/review")
    .send({ stars: 5, comment: "Không hợp lệ" })
    .expect(409);
});
test("Cancellation from awaiting pickup and competing status updates are consistent", async () => {
  const o = await create();
  await accept(o);
  const r = await Promise.all([
    update(o, "awaiting_pickup"),
    update(o, "awaiting_pickup"),
  ]);
  assert.deepEqual(r.map((x) => x.status).sort(), [200, 409]);
  await auth("patch", "/orders/" + o.id + "/status")
    .send({ status: "cancelled" })
    .expect(400);
  await auth("patch", "/orders/" + o.id + "/status")
    .send({ status: "cancelled", note: "Thông tin riêng tư" })
    .expect(200);
  const publicData = (
    await request(app)
      .get("/api/tracking/" + o.tracking_code)
      .expect(200)
  ).body;
  for (const value of [
    "sender_name",
    "receiver_phone",
    "Thông tin riêng tư",
    "actor_name",
    "customer_id",
  ])
    assert.ok(!JSON.stringify(publicData).includes(value));
});
test("Cancel-versus-claim race never leaves cancelled order being delivered", async () => {
  const o = await create();
  const results = await Promise.all([
    auth("post", "/orders/" + o.id + "/accept", "employee"),
    auth("patch", "/orders/" + o.id + "/status").send({
      status: "cancelled",
      note: "Đổi kế hoạch gửi",
    }),
  ]);
  assert.equal(results[1].status, 200);
  assert.ok([200, 409].includes(results[0].status));
  assert.equal(
    (await auth("get", "/orders/" + o.id)).body.order.status,
    "cancelled",
  );
});
test("Tariff edits preserve existing quote and order; new quote uses changed rate", async () => {
  const q = await quote(),
    photo = await upload();
  const rates = (await auth("get", "/services", "admin")).body.items,
    r = rates.find((x) => x.id === q.rate.id),
    body = {};
  for (const k of [
    "base_fee",
    "included_km",
    "extra_km_fee",
    "included_weight",
    "weight_step",
    "extra_weight_fee",
    "cod_fee",
    "insurance_fee",
    "packaging_fee",
    "min_days",
    "max_days",
  ])
    body[k] = Number(r[k]);
  body.active = true;
  body.base_fee += 1000;
  await auth("patch", "/services/" + r.id, "admin")
    .send(body)
    .expect(200);
  const o = (
    await auth("post", "/orders")
      .send({
        quote_id: q.quote_id,
        parcel_photo_id: photo,
        package_name: "Giữ giá",
      })
      .expect(201)
  ).body.order;
  assert.equal(Number(o.total_amount), q.total_amount);
  assert.equal((await quote()).total_amount, q.total_amount + 1000);
  body.base_fee -= 1000;
  await auth("patch", "/services/" + r.id, "admin")
    .send(body)
    .expect(200);
});
test("Employee profiles and blocking accounts respect active deliveries", async () => {
  const p = {
    station_id: stationId,
    user_id: users.employee.id,
    employee_code: "NVTEST",
    hometown: "Hà Nội",
    identity_number: "012345678901",
    hired_at: "2026-01-01",
    employment_status: "active",
  };
  await auth("post", "/employees", "admin").send(p).expect(201);
  const profile = (await auth("get", "/employees?q=NVTEST", "admin")).body
    .items[0];
  assert.equal(profile.user_id, users.employee.id);
  const o = await create();
  await accept(o);
  await auth("patch", "/users/" + users.employee.id, "admin")
    .send({ active: false })
    .expect(409);
  await auth("patch", "/employees/" + profile.id, "admin")
    .send({ ...p, employment_status: "stopped" })
    .expect(409);
  await auth("patch", "/orders/" + o.id + "/status")
    .send({ status: "cancelled", note: "Kết thúc kiểm thử" })
    .expect(200);
  await auth("patch", "/users/" + users.otherCustomer.id, "admin")
    .send({ active: false })
    .expect(200);
  await auth("get", "/auth/me", "otherCustomer").expect(401);
  await auth("patch", "/users/" + users.otherCustomer.id, "admin")
    .send({ active: true })
    .expect(200);
  await auth("get", "/auth/me", "otherCustomer").expect(401);
  await auth("patch", "/users/" + users.admin.id, "admin")
    .send({ active: false })
    .expect(400);
});
test("Upload validates actual image, limits 15 MB and protects unattached media", async () => {
  const id = await upload();
  await auth("get", "/media/" + id + "/content", "otherEmployee").expect(404);
  await auth("get", "/media/" + id + "/content", "admin").expect(200);
  await request(app)
    .get("/api/media/" + id + "/content")
    .expect(401);
  await auth("post", "/media/parcel")
    .attach("image", Buffer.from("<script>bad</script>"), "fake.jpg")
    .expect(400);
  await auth("post", "/media/parcel")
    .attach("image", Buffer.alloc(15 * 1024 * 1024 + 1), "large.jpg")
    .expect(413);
  await auth("post", "/media/incident")
    .attach("image", image, "photo.png")
    .expect(403);
});
test("Dashboard uses Vietnam date boundaries, zero-filled days and completed-delivery ranking", async () => {
  await auth("get", "/dashboard", "customer").expect(403);
  await auth("get", "/dashboard", "employee").expect(403);
  for (const q of [
    "from=2026-02-30",
    "from=2026-02-02&to=2026-02-01",
    "from=2024-01-01&to=2026-01-01",
    "from=bad",
  ])
    await auth("get", "/dashboard?" + q, "admin").expect(400);
  const orders = await Promise.all([create(), create(), create(), create()]);
  for (const [i, o] of orders.entries())
    await pool.execute(
      "UPDATE don_hang SET ngay_tao=?,ngay_giao_xong=?,trang_thai='completed',ma_nhan_vien=? WHERE ma_so=?",
      [
        [
          "2025-12-31 16:59:59",
          "2025-12-31 17:00:00",
          "2026-01-01 16:59:59",
          "2026-01-01 17:00:00",
        ][i],
        [
          "2025-12-31 17:00:00",
          "2026-01-01 16:59:59",
          "2026-01-01 17:00:00",
          "2026-01-01 17:00:00",
        ][i],
        i < 2 ? users.employee.id : users.otherEmployee.id,
        o.id,
      ],
    );
  await pool.execute(
    "INSERT INTO danh_gia(ma_don_hang,ma_khach_hang,ma_nhan_vien,so_sao,binh_luan) VALUES (?,?,?,?,?)",
    [orders[0].id, users.customer.id, users.employee.id, 4, "Đúng hẹn"],
  );
  const { body: d } = await auth(
    "get",
    "/dashboard?from=2026-01-01&to=2026-01-01",
    "admin",
  ).expect(200);
  assert.equal(d.summary.total, 2);
  assert.equal(d.summary.delivered, 2);
  assert.equal(d.daily.length, 1);
  assert.equal(d.daily[0].count, 2);
  assert.deepEqual(
    d.recent.map((o) => o.id).sort((a, b) => a - b),
    [orders[1].id, orders[2].id],
  );
  assert.equal(d.leaderboard.length, 1);
  assert.equal(d.leaderboard[0].employee_id, users.employee.id);
  assert.equal(d.leaderboard[0].completed, 2);
  assert.equal(Number(d.leaderboard[0].average_stars), 4);
  assert.equal(d.leaderboard[0].review_count, 1);
  const empty = (
    await auth(
      "get",
      "/dashboard?from=2020-01-01&to=2020-01-03",
      "admin",
    ).expect(200)
  ).body;
  assert.equal(empty.summary.total, 0);
  assert.deepEqual(
    empty.daily.map((d) => d.count),
    [0, 0, 0],
  );
  assert.deepEqual(empty.leaderboard, []);
});

test("Authenticated media returns a decodable JPEG for native fetch", async () => {
  const id = await upload();
  const r = await auth("get", "/media/" + id + "/content")
    .expect(200)
    .expect("Content-Type", /image\/jpeg/);
  const meta = await sharp(r.body).metadata();
  assert.equal(meta.format, "jpeg");
  assert.equal(meta.width, 4);
  assert.match(r.headers["cache-control"], /private/);
});

test("Create employee profile first, then one linked account from email/password", async () => {
  const input = {
    name: "Nhân viên từ hồ sơ",
    phone: "0905555555",
    address: "Địa chỉ hồ sơ",
    employee_code: "NVMOI",
    hometown: "Hà Nội",
    identity_number: "",
    hired_at: "2026-01-01",
    employment_status: "active",
  };
  const created = await auth("post", "/employees", "admin")
    .send(input)
    .expect(201);
  const profileId = created.body.id;
  let available = (
    await auth("get", "/employees?available=1", "admin").expect(200)
  ).body.items;
  assert.ok(
    available.some(
      (p) => p.id === profileId && p.user_id === null && p.name === input.name,
    ),
  );
  await auth("post", "/users", "customer")
    .send({ profile_id: profileId, email: "linked@test.vn", password })
    .expect(403);
  await auth("post", "/users", "admin")
    .send({ profile_id: profileId, email: "admin@test.vn", password })
    .expect(409);
  assert.ok(
    (await auth("get", "/employees?available=1", "admin")).body.items.some(
      (p) => p.id === profileId,
    ),
  );
  const results = await Promise.all(
    ["linked1@test.vn", "linked2@test.vn"].map((email) =>
      auth("post", "/users", "admin").send({
        profile_id: profileId,
        email,
        password,
      }),
    ),
  );
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  const user = results.find((r) => r.status === 201).body.user;
  assert.equal(user.name, input.name);
  assert.equal(user.phone, input.phone);
  assert.equal(user.address, input.address);
  assert.equal(user.role, "employee");
  await request(app)
    .post("/api/auth/login")
    .send({ email: user.email, password })
    .expect(200);
  assert.ok(
    !(await auth("get", "/employees?available=1", "admin")).body.items.some(
      (p) => p.id === profileId,
    ),
  );
  await auth("patch", "/employees/" + profileId, "admin")
    .send({ ...input, name: "Đã sửa họ tên" })
    .expect(200);
  const [[account]] = await pool.execute(
    "SELECT ten FROM tai_khoan WHERE ma_so=?",
    [user.id],
  );
  assert.equal(account.name, "Đã sửa họ tên");
  const stopped = await auth("post", "/employees", "admin")
    .send({ ...input, employee_code: "NVDUNG", employment_status: "stopped" })
    .expect(201);
  await auth("post", "/users", "admin")
    .send({ profile_id: stopped.body.id, email: "stopped@test.vn", password })
    .expect(409);
  await auth("post", "/users", "admin")
    .send({ profile_id: 999999, email: "missing@test.vn", password })
    .expect(404);
});

test("Pagination validation and password/logout revoke sessions", async () => {
  await auth("get", "/orders?page=-1").expect(400);
  await auth("get", "/orders?status=invalid").expect(400);
  const r = await auth("get", "/orders?limit=2").expect(200);
  assert.equal(r.body.items.length, 2);
  await auth("post", "/auth/change-password", "otherEmployee")
    .send({ current_password: password, new_password: "Changed123!" })
    .expect(200);
  await auth("get", "/auth/me", "otherEmployee").expect(401);
  await auth("post", "/auth/logout").expect(200);
  await auth("get", "/auth/me").expect(401);
});

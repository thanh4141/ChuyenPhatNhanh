import { provinces } from "../config/provinces.js";
import { statusLabels } from "../modules/orders/order.domain.js";

const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const str = (maxLength, extra = {}) => ({
  type: "string",
  ...(maxLength ? { maxLength } : {}),
  ...extra,
});
const integer = (minimum = 0, maximum) => ({
  type: "integer",
  minimum,
  ...(maximum === undefined ? {} : { maximum }),
});
const number = (minimum, maximum) => ({ type: "number", minimum, maximum });
const boolean = { type: "boolean" };
const uuid = str(undefined, { format: "uuid" });
const dateTime = str(undefined, { format: "date-time" });
const object = (properties, required = [], strict = false) => ({
  type: "object",
  properties,
  ...(required.length ? { required } : {}),
  additionalProperties: !strict,
});
const array = (items, extra = {}) => ({ type: "array", items, ...extra });
const anyObject = { type: "object", additionalProperties: true };
const phone = str(undefined, {
  pattern: "^(?:0|\\+84)[0-9]{9,10}$",
  example: "0901234567",
});
const email = str(190, { format: "email", example: "khachhang@chuyenphat.vn" });
const password = str(undefined, {
  minLength: 8,
  format: "password",
  description: "Ít nhất 8 ký tự, tối đa 72 byte UTF-8.",
});
const name = str(120, { minLength: 1 });
const status = str(undefined, {
  enum: Object.keys(statusLabels),
  description: Object.entries(statusLabels)
    .map(([key, label]) => `${key}: ${label}`)
    .join("; "),
});
const routeType = str(undefined, {
  enum: ["same_province", "same_region", "inter_region"],
});
const locationProperties = {
  contact_name: name,
  phone,
  province_code: str(undefined, {
    enum: provinces.map((p) => p.code),
    example: "79",
  }),
  ward: str(120, { minLength: 1 }),
  village: str(120, { default: "" }),
  detail: str(255, { minLength: 1 }),
  latitude: number(-90, 90),
  longitude: number(-180, 180),
};
const locationRequired = [
  "contact_name",
  "phone",
  "province_code",
  "ward",
  "detail",
  "latitude",
  "longitude",
];
const locationExample = {
  contact_name: "Người nhận",
  phone: "0902222222",
  province_code: "79",
  ward: "Phường Thạnh Mỹ Tây",
  village: "",
  detail: "Điểm giao hàng",
  latitude: 10.7951,
  longitude: 106.7218,
};
const rateProperties = {
  base_fee: integer(0, 10000000),
  included_km: { type: "integer", enum: [5] },
  extra_km_fee: integer(0, 10000000),
  included_weight: number(0.01, 1000),
  weight_step: number(0.01, 1000),
  extra_weight_fee: integer(0, 10000000),
  cod_fee: integer(0, 10000000),
  insurance_fee: { type: "integer", enum: [9900] },
  packaging_fee: { type: "integer", enum: [5000] },
  min_days: integer(0, 365),
  max_days: integer(0, 365),
  active: boolean,
};
const schemas = {
  ComplaintInput: object(
    {
      order_id: integer(1),
      title: str(150, { minLength: 3 }),
      message: str(2000, { minLength: 10 }),
    },
    ["order_id", "title", "message"],
    true,
  ),
  ComplaintResponse: object(
    {
      status: str(undefined, { enum: ["processing", "resolved", "rejected"] }),
      response: str(2000, { minLength: 3 }),
    },
    ["status", "response"],
    true,
  ),
  Complaint: object({
    id: integer(1),
    order_id: integer(1),
    customer_id: integer(1),
    tracking_code: str(),
    customer_name: str(),
    title: str(150),
    message: str(2000),
    status: str(undefined, {
      enum: ["open", "processing", "resolved", "rejected"],
    }),
    response: str(2000),
    handler_id: { ...integer(1), nullable: true },
    handler_name: str(undefined, { nullable: true }),
    handled_at: { ...dateTime, nullable: true },
    created_at: dateTime,
    updated_at: dateTime,
  }),
  Error: object({ message: str(), errors: {} }, ["message"]),
  Message: object({ message: str() }, ["message"]),
  User: object({
    station_id: { ...integer(1), nullable: true },
    id: integer(1),
    name,
    email,
    phone,
    address: str(500),
    role: str(undefined, {
      enum: ["admin", "employee", "customer", "station_manager"],
    }),
    active: { oneOf: [boolean, { type: "integer", enum: [0, 1] }] },
    created_at: dateTime,
  }),
  Session: object(
    {
      token: str(undefined, {
        description:
          "Sao chép giá trị này vào Authorize; không thêm chữ Bearer.",
      }),
      user: ref("User"),
    },
    ["token", "user"],
  ),
  Login: object(
    { email, password: str(200, { minLength: 1, format: "password" }) },
    ["email", "password"],
    true,
  ),
  Register: object(
    { name, email, phone, password, address: str(500, { default: "" }) },
    ["name", "email", "phone", "password"],
    true,
  ),
  MyProfile: object(
    { name, phone, address: str(500, { default: "" }) },
    ["name", "phone"],
    true,
  ),
  PasswordChange: object(
    {
      current_password: str(200, { minLength: 1, format: "password" }),
      new_password: password,
    },
    ["current_password", "new_password"],
    true,
  ),
  StationInput: object(
    {
      name,
      province_code: str(undefined, { pattern: "^[0-9]{2}$" }),
      address: str(500),
      latitude: number(-90, 90),
      longitude: number(-180, 180),
    },
    ["name", "province_code", "address", "latitude", "longitude"],
    true,
  ),
  StationLocation: object(
    { latitude: number(-90, 90), longitude: number(-180, 180) },
    ["latitude", "longitude"],
    true,
  ),
  StationManagerInput: object(
    { name, email, password, phone },
    ["name", "email", "password", "phone"],
    true,
  ),
  BatchInput: object(
    {
      station_id: integer(1),
      destination_station_id: integer(1),
      order_ids: {
        ...array(integer(1)),
        minItems: 1,
        maxItems: 100,
        uniqueItems: true,
      },
    },
    ["station_id", "destination_station_id", "order_ids"],
    true,
  ),
  BatchReceive: object(
    {
      order_ids: {
        ...array(integer(1)),
        minItems: 1,
        maxItems: 100,
        uniqueItems: true,
      },
    },
    ["order_ids"],
    true,
  ),
  DeliveryAssign: object(
    {
      station_id: integer(1),
      employee_id: integer(1),
      order_ids: {
        ...array(integer(1)),
        minItems: 1,
        maxItems: 100,
        uniqueItems: true,
      },
    },
    ["station_id", "employee_id", "order_ids"],
    true,
  ),
  EmployeeAccount: object(
    { profile_id: integer(1), email, password },
    ["profile_id", "email", "password"],
    true,
  ),
  AccountUpdate: {
    ...object(
      { name, email, phone, password, address: str(500), active: boolean },
      [],
      true,
    ),
    minProperties: 1,
    description:
      "Khách hàng chỉ được sửa active. Nhân viên được sửa các trường còn lại. Không khóa nhân viên đang có đơn chưa kết thúc.",
  },
  EmployeeProfile: object(
    {
      station_id: { ...integer(1), nullable: true },
      name,
      phone,
      address: str(500),
      user_id: integer(1),
      employee_code: str(30, { minLength: 1, pattern: "^[A-Za-z0-9_-]+$" }),
      hometown: str(255, { default: "" }),
      identity_number: str(undefined, {
        pattern: "^(?:|[0-9]{12})$",
        default: "",
      }),
      hired_at: str(undefined, { format: "date" }),
      employment_status: str(undefined, { enum: ["active", "stopped"] }),
    },
    ["employee_code", "hired_at", "employment_status"],
    true,
  ),
  Location: {
    ...object(locationProperties, locationRequired, true),
    example: locationExample,
  },
  AddressInput: {
    ...object(
      {
        ...locationProperties,
        label: str(80, { minLength: 1, default: "Địa chỉ lấy hàng" }),
        is_default: { ...boolean, default: false },
      },
      locationRequired,
      true,
    ),
    example: { ...locationExample, label: "Nhà riêng", is_default: true },
  },
  Address: object({
    ...locationProperties,
    id: integer(1),
    user_id: integer(1),
    label: str(80),
    is_default: { oneOf: [boolean, { type: "integer", enum: [0, 1] }] },
    formatted_address: str(),
    province_name: str(),
    region: str(),
  }),
  RateUpdate: {
    ...object(rateProperties, Object.keys(rateProperties), true),
    description:
      "Gửi đầy đủ trường. max_days ≥ min_days; khối lượng tối đa 2 chữ số thập phân.",
    example: {
      base_fee: 15000,
      included_km: 5,
      extra_km_fee: 3000,
      included_weight: 1,
      weight_step: 0.5,
      extra_weight_fee: 2500,
      cod_fee: 0,
      insurance_fee: 9900,
      packaging_fee: 5000,
      min_days: 1,
      max_days: 2,
      active: true,
    },
  },
  Rate: object({
    ...rateProperties,
    active: { oneOf: [boolean, { type: "integer", enum: [0, 1] }] },
    id: integer(1),
    service_id: integer(1),
    service_name: str(),
    service_code: str(),
    route_type: routeType,
  }),
  QuoteInput: {
    ...object(
      {
        pickup_address_id: integer(1),
        delivery: ref("Location"),
        service_id: integer(1),
        weight: { ...number(0.01, 1000), multipleOf: 0.01 },
        has_cod: boolean,
        cod_amount: integer(0, 100000000),
        has_insurance: boolean,
        has_packaging: boolean,
      },
      [
        "pickup_address_id",
        "delivery",
        "service_id",
        "weight",
        "has_cod",
        "cod_amount",
        "has_insurance",
        "has_packaging",
      ],
      true,
    ),
    description:
      "service_id là ID dịch vụ, không phải ID bảng cước. Có COD thì cod_amount > 0, không COD thì bằng 0.",
    example: {
      pickup_address_id: 1,
      delivery: locationExample,
      service_id: 1,
      weight: 1.51,
      has_cod: false,
      cod_amount: 0,
      has_insurance: true,
      has_packaging: true,
    },
  },
  Quote: object({
    quote_id: uuid,
    expires_at: dateTime,
    rate: ref("Rate"),
    route_type: routeType,
    source: str(undefined, { enum: ["osrm"] }),
    distance_meters: integer(),
    duration_seconds: integer(),
    route_geometry: object({
      type: str(undefined, { enum: ["LineString"] }),
      coordinates: array({
        type: "array",
        items: { type: "number" },
        minItems: 2,
        maxItems: 2,
      }),
    }),
    route_data_version: str(undefined, { nullable: true }),
    route_fetched_at: dateTime,
    shipping_fee: integer(),
    cod_fee: integer(),
    insurance_fee: integer(),
    packaging_fee: integer(),
    total_amount: integer(),
  }),
  CreateOrder: object(
    {
      quote_id: uuid,
      parcel_photo_id: uuid,
      package_name: str(200, { minLength: 1 }),
      note: str(1000, { default: "" }),
    },
    ["quote_id", "parcel_photo_id", "package_name"],
    true,
  ),
  Order: object({
    id: integer(1),
    tracking_code: str(),
    customer_id: integer(1),
    employee_id: { ...integer(1), nullable: true },
    status,
    package_name: str(),
    sender_name: str(),
    sender_phone: str(),
    sender_address: str(),
    receiver_name: str(),
    receiver_phone: str(),
    receiver_address: str(),
    weight: { type: "number" },
    cod_amount: integer(),
    shipping_fee: integer(),
    total_amount: integer(),
    distance_meters: { ...integer(), nullable: true },
    pricing_snapshot: { ...anyObject, nullable: true },
    created_at: dateTime,
  }),
  StatusUpdate: {
    ...object(
      {
        status,
        note: str(1000, { default: "" }),
        incident_photo_id: { ...uuid, nullable: true },
        delivery_photo_id: {
          ...uuid,
          nullable: true,
          description:
            "Bắt buộc khi status=completed. Ảnh delivery của người giao, chưa gắn vào đơn nào.",
        },
      },
      ["status"],
      true,
    ),
    example: { status: "awaiting_pickup", note: "" },
  },
  ReviewInput: {
    ...object(
      { stars: integer(1, 5), comment: str(1000, { minLength: 1 }) },
      ["stars", "comment"],
      true,
    ),
    example: { stars: 5, comment: "Giao hàng cẩn thận, đúng hẹn." },
  },
  Upload: object(
    {
      id: uuid,
      purpose: str(undefined, { enum: ["parcel", "incident", "delivery"] }),
      size_bytes: integer(),
    },
    ["id", "purpose", "size_bytes"],
  ),
};

const json = (schema) => ({ "application/json": { schema } });
const success = (schema = ref("Message"), description = "Thành công") => ({
  description,
  content: json(schema),
});
const pageSchema = (item) =>
  object({
    items: array(item),
    total: integer(),
    page: integer(1),
    limit: integer(1, 100),
  });
const listSchema = (item) => object({ items: array(item) });
const query = (name, schema, description, required = false) => ({
  name,
  in: "query",
  required,
  schema,
  ...(description ? { description } : {}),
});
const pagination = [
  query("page", { ...integer(1), default: 1 }),
  query("limit", { ...integer(1, 100), default: 20 }),
];
const stationQuery = [
  query(
    "station_id",
    integer(1),
    "Admin phải chọn trạm; quản lý trạm mặc định trạm của mình.",
  ),
];
const search = [...pagination, query("q", str(100), "Từ khóa tìm kiếm")];
const idParam = (schema = integer(1)) => ({
  name: "id",
  in: "path",
  required: true,
  schema,
});
const errors = Object.fromEntries(
  Object.entries({
    400: "Dữ liệu không hợp lệ",
    401: "Chưa đăng nhập hoặc phiên hết hiệu lực",
    403: "Không đủ quyền",
    404: "Không tìm thấy hoặc ngoài phạm vi được xem",
    409: "Xung đột trạng thái, dữ liệu trùng hoặc báo giá hết hạn",
    413: "Nội dung quá lớn",
    422: "Địa chỉ hoặc tuyến không phù hợp",
    429: "Quá nhiều yêu cầu",
    500: "Lỗi máy chủ",
    502: "Dịch vụ bản đồ gián đoạn",
    503: "Dịch vụ bản đồ đang bận",
  }).map(([code, description]) => [code, success(ref("Error"), description)]),
);
const paths = {};
function add(method, path, tag, summary, options = {}) {
  const {
    body,
    response,
    code = 200,
    public: isPublic,
    parameters,
    description,
    roles,
    responses,
    requestBody,
  } = options;
  paths[path] ||= {};
  paths[path][method] = {
    tags: [tag],
    operationId: method + path.replace(/[^a-zA-Z0-9]/g, "_"),
    summary,
    description: [roles && `**Quyền:** ${roles}.`, description]
      .filter(Boolean)
      .join("\n\n"),
    ...(isPublic ? { security: [] } : {}),
    ...(parameters ? { parameters } : {}),
    ...(body
      ? {
          requestBody: {
            required: true,
            content: json(typeof body === "string" ? ref(body) : body),
          },
        }
      : {}),
    ...(requestBody ? { requestBody } : {}),
    responses: { [code]: success(response), ...errors, ...responses },
  };
}

add("get", "/health", "Hệ thống", "Kiểm tra API và MySQL", {
  public: true,
  response: object({ status: str(), database: str() }),
});
add("post", "/auth/register", "Đăng nhập", "Đăng ký tài khoản khách hàng", {
  public: true,
  body: "Register",
  response: ref("Session"),
  code: 201,
});
add("post", "/auth/login", "Đăng nhập", "Đăng nhập lấy JWT", {
  public: true,
  body: "Login",
  response: ref("Session"),
  description:
    "Dùng tài khoản đã có. Sao chép token từ response và bấm Authorize ở đầu trang. Tối đa 30 yêu cầu đăng nhập/đăng ký mỗi 15 phút/IP.",
});
add("get", "/auth/me", "Đăng nhập", "Xem tài khoản của mình", {
  response: object({ user: ref("User") }),
});
add("patch", "/auth/me", "Đăng nhập", "Sửa thông tin cá nhân", {
  body: "MyProfile",
  response: object({ user: ref("User") }),
});
add("post", "/auth/change-password", "Đăng nhập", "Đổi mật khẩu", {
  body: "PasswordChange",
  description: "Thu hồi các token cũ; cần đăng nhập lại.",
});
add("post", "/auth/logout", "Đăng nhập", "Đăng xuất trên các thiết bị", {
  description:
    "Thu hồi JWT cũ. Bấm Logout trong hộp Authorize để xóa token khỏi Swagger.",
});
add("get", "/users", "Tài khoản", "Tìm tài khoản", {
  roles: "Admin / quản lý trạm (chỉ nhân viên, hồ sơ thuộc trạm)",
  parameters: [
    ...search,
    query("station_id", integer(1), "Lọc nhân viên theo trạm"),
    query(
      "role",
      str(undefined, {
        enum: ["admin", "employee", "customer", "station_manager"],
      }),
    ),
    query("active", str(undefined, { enum: ["0", "1"] })),
  ],
  response: pageSchema(ref("User")),
});
add("post", "/users", "Tài khoản", "Thêm tài khoản nhân viên", {
  roles: "Admin / quản lý trạm (chỉ nhân viên, hồ sơ thuộc trạm)",
  body: "EmployeeAccount",
  code: 201,
  response: object({ user: ref("User") }),
});
add(
  "patch",
  "/users/{id}",
  "Tài khoản",
  "Sửa nhân viên hoặc khóa/mở khách hàng",
  {
    roles: "Admin / quản lý trạm (chỉ nhân viên, hồ sơ thuộc trạm)",
    parameters: [idParam()],
    body: "AccountUpdate",
    response: object({ user: ref("User") }),
  },
);
add("get", "/employees", "Nhân viên", "Tìm hồ sơ nhân viên", {
  roles: "Admin / quản lý trạm (chỉ nhân viên, hồ sơ thuộc trạm)",
  parameters: [
    ...search,
    query(
      "available",
      str(undefined, { enum: ["1"] }),
      "Chỉ hồ sơ đang làm việc và chưa có tài khoản",
    ),
  ],
  response: pageSchema(anyObject),
});
add("post", "/employees", "Nhân viên", "Thêm hồ sơ nhân viên", {
  roles: "Admin / quản lý trạm (chỉ nhân viên, hồ sơ thuộc trạm)",
  body: "EmployeeProfile",
  code: 201,
  description:
    "Tạo hồ sơ trước tài khoản: nhập name, phone và thông tin hồ sơ. user_id chỉ dành cho liên kết tài khoản nhân viên cũ chưa có hồ sơ.",
});
add("patch", "/employees/{id}", "Nhân viên", "Sửa hồ sơ nhân viên", {
  roles: "Admin / quản lý trạm (chỉ nhân viên, hồ sơ thuộc trạm)",
  parameters: [idParam()],
  body: "EmployeeProfile",
  description:
    "Gửi name, phone và đầy đủ thông tin hồ sơ. Không chuyển user_id; thông tin liên hệ đồng bộ sang tài khoản đã liên kết. Ngừng làm việc sẽ khóa tài khoản; cần xử lý hết đơn đang nhận.",
});
add(
  "get",
  "/employees/me",
  "Nhân viên",
  "Hồ sơ, thống kê và đánh giá của mình",
  {
    roles: "Nhân viên",
    parameters: pagination,
    response: object({
      profile: { ...anyObject, nullable: true },
      stats: anyObject,
      reviews: array(anyObject),
      page: integer(1),
      limit: integer(1),
    }),
  },
);
add("get", "/addresses", "Địa chỉ", "Danh sách địa chỉ lấy hàng của mình", {
  roles: "Khách hàng",
  response: listSchema(ref("Address")),
});
add("post", "/addresses", "Địa chỉ", "Thêm địa chỉ lấy hàng", {
  roles: "Khách hàng",
  body: "AddressInput",
  code: 201,
  response: object({ id: integer(1), message: str() }),
  description: "province_code phải khớp tọa độ bản đồ.",
});
add("patch", "/addresses/{id}", "Địa chỉ", "Sửa địa chỉ lấy hàng", {
  roles: "Khách hàng",
  parameters: [idParam()],
  body: "AddressInput",
  response: object({ id: integer(1), message: str() }),
  description: "Gửi đầy đủ địa chỉ. Chỉ sửa địa chỉ thuộc tài khoản của mình.",
});
add("delete", "/addresses/{id}", "Địa chỉ", "Xóa địa chỉ lấy hàng", {
  roles: "Khách hàng",
  parameters: [idParam()],
  description: "Địa chỉ đã lưu trên đơn cũ vẫn được giữ nguyên.",
});
add(
  "get",
  "/services",
  "Bảng cước",
  "Danh sách bảng cước theo dịch vụ và tuyến",
  {
    response: listSchema(ref("Rate")),
    description:
      "Cần đăng nhập. Admin thấy mọi bảng cước; người khác chỉ thấy bảng cước/dịch vụ đang bật.",
  },
);
add("patch", "/services/{id}", "Bảng cước", "Cập nhật bảng cước", {
  roles: "Admin",
  parameters: [idParam()],
  body: "RateUpdate",
  description:
    "id là rate_id của bảng cước. Báo giá còn hiệu lực và đơn cũ giữ nguyên giá.",
});
add(
  "post",
  "/services/quote",
  "Bảng cước",
  "Tính cước theo quãng đường thực tế",
  {
    roles: "Khách hàng",
    body: "QuoteInput",
    response: ref("Quote"),
    description:
      "Báo giá có hiệu lực 10 phút. Chỉ tính điểm lấy → điểm giao bằng OSRM. Tiền hàng COD tách khỏi tổng cước. Không có tuyến thì trả lỗi, không tính đường chim bay.",
  },
);
for (const [purpose, role] of [
  ["parcel", "Khách hàng"],
  ["incident", "Nhân viên"],
  ["delivery", "Nhân viên"],
]) {
  add(
    "post",
    `/media/${purpose}`,
    "Ảnh",
    purpose === "parcel"
      ? "Tải ảnh hàng hóa"
      : purpose === "delivery"
        ? "Tải bằng chứng giao hàng"
        : "Tải ảnh sự cố",
    {
      roles: role,
      code: 201,
      response: ref("Upload"),
      description:
        "Một file image, tối đa 15 MiB (15 × 1024 × 1024 byte), 40 triệu pixel. JPEG/PNG/WebP; HEIF tùy bộ giải mã máy chủ. Ảnh được chuẩn hóa JPEG và bỏ metadata. Sao chép id cho parcel_photo_id, incident_photo_id hoặc delivery_photo_id. App yêu cầu camera cho ảnh delivery.",
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: object(
              { image: str(undefined, { format: "binary" }) },
              ["image"],
              true,
            ),
          },
        },
      },
    },
  );
}
add("get", "/media/{id}/content", "Ảnh", "Xem ảnh có phân quyền", {
  parameters: [idParam(uuid)],
  responses: {
    200: {
      description: "Ảnh JPEG; cần JWT và quyền xem.",
      content: {
        "image/jpeg": { schema: str(undefined, { format: "binary" }) },
      },
    },
  },
});
add("get", "/orders", "Đơn hàng", "Tìm đơn trong phạm vi được xem", {
  parameters: [
    ...search,
    query(
      "task",
      str(undefined, { enum: ["pickup", "delivery"] }),
      "Nhân viên lọc nhiệm vụ lấy/giao",
    ),
    query("status", status),
    query(
      "scope",
      str(undefined, { enum: ["mine", "waiting"], default: "mine" }),
    ),
  ],
  response: pageSchema(ref("Order")),
  description:
    "Admin xem tất cả; quản lý trạm xem đơn liên quan trạm; khách xem đơn của mình; nhân viên xem đơn mình lấy/giao. scope=waiting chỉ trả nhiệm vụ pending được quản lý phân công cho chính nhân viên, có trạm lấy trùng trạm tài khoản và đã xác định khoảng cách đường bộ. Nhân viên chưa có trạm và đơn chưa xác định trạm không được nhận/xem chi tiết/ảnh. Danh sách không trả pickup_snapshot/delivery_snapshot/pricing_snapshot; lấy qua GET /orders/{id}.",
});
add("post", "/orders", "Đơn hàng", "Tạo đơn từ báo giá và ảnh đã tải", {
  roles: "Khách hàng",
  body: "CreateOrder",
  code: 201,
  response: object({ order: ref("Order") }),
  responses: {
    200: success(
      object({ order: ref("Order") }),
      "Báo giá đã tạo đơn trước đó; trả lại đơn cũ",
    ),
  },
  description:
    "Tạo địa chỉ → POST /services/quote → POST /media/parcel → POST /orders. Lấy giá, khối lượng, địa chỉ từ báo giá; không nhận giá tự nhập. Báo giá chốt trạm lấy có quãng đường OSRM từ trạm tới điểm lấy nhỏ nhất, có thể khác tỉnh. Trạm giao chọn theo đường bộ gần người nhận nhất, không bắt buộc cùng tỉnh. Mọi trạm hoạt động cần đủ tọa độ. Cấu hình trạm đổi sau báo giá phải báo giá lại (409). Admin không được tạo đơn.",
});
add(
  "get",
  "/orders/{id}",
  "Đơn hàng",
  "Xem chi tiết, lịch sử, ảnh và đánh giá",
  {
    parameters: [idParam()],
    response: object({
      order: ref("Order"),
      events: array(anyObject),
      media: array(ref("Upload")),
      review: { ...anyObject, nullable: true },
    }),
  },
);
add(
  "get",
  "/orders/{id}/delivery-route",
  "Đơn hàng",
  "Xem tuyến đường bộ từ trạm đích tới người nhận",
  {
    parameters: [idParam()],
    response: anyObject,
    description:
      "Áp dụng quyền xem đơn. Chỉ khả dụng khi kiện đã ở trạm đích hoặc đã xuất kho giao. Trả route_geometry, distance_meters, route_data_version, from và to. Lỗi dịch vụ bản đồ không ngăn xem chi tiết đơn.",
  },
);
add("post", "/orders/{id}/accept", "Đơn hàng", "Xác nhận nhiệm vụ lấy hàng", {
  roles: "Nhân viên được phân công",
  parameters: [idParam()],
  description:
    "Chỉ nhân viên được quản lý phân công và còn thuộc trạm lấy được xác nhận pending → accepted. Xác nhận trùng chỉ một lần thành công.",
});
add(
  "post",
  "/orders/{id}/decline-pickup",
  "Đơn hàng",
  "Báo không thể nhận nhiệm vụ",
  {
    roles: "Nhân viên được phân công",
    parameters: [idParam()],
    body: object({ note: str(undefined, { minLength: 3, maxLength: 1000 }) }, [
      "note",
    ]),
    description:
      "Chỉ pending chưa xác nhận. Xóa phân công, lưu lý do vào lịch sử và thông báo quản lý để phân công lại.",
  },
);
add(
  "get",
  "/logistics/pickup-tasks",
  "Trạm & kho",
  "Đơn chờ phân công hoặc xác nhận lấy hàng",
  {
    roles: "Admin / quản lý trạm",
    parameters: [
      ...stationQuery,
      ...search,
      query("service_code", str(undefined, { enum: ["standard", "express"] })),
      query("date_from", str(undefined, { format: "date" })),
      query("date_to", str(undefined, { format: "date" })),
    ],
    response: anyObject,
    description:
      "Tìm mã đơn/người gửi/địa chỉ lấy. Ngày lọc theo ngày tạo tại Việt Nam. Ưu tiên Hỏa tốc rồi đơn tạo trước.",
  },
);
add(
  "post",
  "/logistics/assign-pickup",
  "Trạm & kho",
  "Phân công nhiều đơn đi lấy",
  {
    roles: "Admin / quản lý trạm lấy",
    body: object(
      {
        station_id: integer(1),
        employee_id: integer(1),
        order_ids: array(integer(1), {
          minItems: 1,
          maxItems: 100,
          uniqueItems: true,
        }),
      },
      ["station_id", "employee_id", "order_ids"],
    ),
    description:
      "Đơn pending có trạm lấy và khoảng cách hợp lệ. Nhân viên đang làm việc, thuộc trạm. Có thể phân công lại khi chưa xác nhận. Một đơn không hợp lệ sẽ hoàn tác cả nhóm.",
  },
);
add(
  "patch",
  "/orders/{id}/status",
  "Đơn hàng",
  "Cập nhật trạng thái hoặc hủy đơn",
  {
    roles: "Nhân viên phụ trách / khách sở hữu đơn",
    parameters: [idParam()],
    body: "StatusUpdate",
    description:
      "Nội tỉnh (kể cả trạm lấy nằm ở tỉnh lân cận): người lấy có thể picked_up → delivering để giao thẳng, được lưu là người giao cuối. Khác tỉnh (nội miền/liên miền): người lấy chỉ accepted → awaiting_pickup → picked_up, sau đó phải kiểm nhận kho, trung chuyển và nhận tại trạm đích. Người giao được phân công chỉ ready_delivery → delivering → completed hoặc incomplete. Luồng cũ chỉ dành cho đơn lịch sử không có trạm. incomplete bắt buộc note ≥ 3 ký tự và incident_photo_id của mình. completed bắt buộc delivery_photo_id đúng loại delivery, thuộc người giao, chưa sử dụng; sai ảnh hoàn tác toàn bộ trạng thái/lịch sử/thông báo. Khách chỉ được cancelled từ pending/accepted/awaiting_pickup, cần note ≥ 3 ký tự. Admin chỉ xem đơn.",
  },
);
add("post", "/orders/{id}/review", "Đơn hàng", "Đánh giá nhân viên giao hàng", {
  roles: "Khách sở hữu đơn",
  parameters: [idParam()],
  body: "ReviewInput",
  code: 201,
  description: "Mỗi đơn completed có nhân viên chỉ được đánh giá một lần.",
});
add("get", "/notifications", "Thông báo", "Thông báo của mình", {
  parameters: pagination,
  response: object({
    ...pageSchema(anyObject).properties,
    unread_count: integer(),
  }),
});
add(
  "patch",
  "/notifications/read-all",
  "Thông báo",
  "Đánh dấu tất cả thông báo đã đọc",
);
add(
  "patch",
  "/notifications/{id}/read",
  "Thông báo",
  "Đánh dấu một thông báo đã đọc",
  { parameters: [idParam()] },
);
add(
  "get",
  "/dashboard",
  "Thống kê",
  "Tổng quan quản trị theo thời gian và xếp hạng",
  {
    roles: "Admin",
    parameters: [
      query(
        "from",
        str(undefined, { format: "date" }),
        "Ngày đầu kỳ (giờ Việt Nam). Mặc định 7 ngày kết thúc vào to.",
      ),
      query(
        "to",
        str(undefined, { format: "date" }),
        "Ngày cuối kỳ, bao gồm cả ngày. Mặc định hôm nay. Tối đa 366 ngày.",
      ),
    ],
    description:
      "summary, statuses, daily và recent lọc theo ngày tạo đơn; doanh thu là cước các đơn hiện đã hoàn thành trong nhóm đó, không gồm COD. leaderboard: top 10 theo ngày giao hoàn thành, số đơn giảm dần, rồi điểm đánh giá giảm dần, rồi mã tài khoản tăng dần. Điểm đánh giá tính từ các đơn giao trong kỳ. Số nhân viên/khách hàng là toàn hệ thống.",
    response: object({
      period: anyObject,
      summary: anyObject,
      statuses: array(anyObject),
      daily: array(anyObject),
      recent: array(ref("Order")),
      leaderboard: array(anyObject),
    }),
  },
);
add(
  "get",
  "/complaints",
  "Khiếu nại",
  "Danh sách khiếu nại trong phạm vi được xem",
  {
    roles: "Khách sở hữu / Admin / quản lý trạm liên quan",
    parameters: [
      ...search,
      query("order_id", integer(1)),
      query(
        "status",
        str(undefined, {
          enum: ["open", "processing", "resolved", "rejected"],
        }),
      ),
    ],
    response: pageSchema(ref("Complaint")),
  },
);
add("post", "/complaints", "Khiếu nại", "Gửi khiếu nại đơn hàng", {
  roles: "Khách sở hữu đơn",
  body: "ComplaintInput",
  code: 201,
  response: object({ id: integer(1), message: str() }),
  description:
    "Một khiếu nại cho mỗi đơn của khách. Gửi trùng trả 409. Không thay đổi trạng thái giao hàng.",
});
add("patch", "/complaints/{id}", "Khiếu nại", "Phản hồi và xử lý khiếu nại", {
  roles: "Admin / quản lý trạm liên quan",
  parameters: [idParam()],
  body: "ComplaintResponse",
  description:
    "open → processing/resolved/rejected; processing có thể tiếp tục phản hồi hoặc kết thúc. resolved/rejected không mở lại. Gửi thông báo cho khách.",
});

add("get", "/stations", "Trạm & kho", "Danh sách trạm", {
  roles: "Admin / quản lý trạm",
  response: object({ items: array(anyObject) }),
});
add("post", "/stations", "Trạm & kho", "Tạo trạm cho tỉnh/thành", {
  roles: "Admin",
  body: "StationInput",
  code: 201,
  description:
    "Mỗi tỉnh/thành chỉ một trạm. Tọa độ bắt buộc, đúng tỉnh và gần đường bộ.",
});
add(
  "patch",
  "/stations/{id}/location",
  "Trạm & kho",
  "Cập nhật vị trí kho trên bản đồ",
  {
    roles: "Admin",
    parameters: [idParam()],
    body: "StationLocation",
    description:
      "Không tự đổi trạm của đơn đã nhận. Báo giá chưa tạo đơn cần tính lại nếu cấu hình trạm đổi.",
  },
);
add(
  "post",
  "/orders/{id}/route-pickup",
  "Trạm & kho",
  "Tính lại trạm lấy gần nhất cho đơn chờ",
  {
    roles: "Admin",
    parameters: [idParam()],
    description:
      "Chỉ pending chưa ai nhận, có tọa độ lấy/giao. So sánh đường bộ từ tất cả trạm hoạt động. Không dùng khoảng cách thẳng. Cập nhật thông báo theo trạm mới; đơn đã nhận bị từ chối.",
  },
);
add(
  "post",
  "/stations/{id}/managers",
  "Trạm & kho",
  "Tạo tài khoản quản lý trạm riêng",
  {
    roles: "Admin",
    parameters: [idParam()],
    body: "StationManagerInput",
    code: 201,
  },
);
add(
  "get",
  "/logistics/inventory",
  "Trạm & kho",
  "Tồn kho, nhóm theo kho giao và hàng chờ bàn giao",
  {
    roles: "Admin / quản lý trạm",
    parameters: [
      ...stationQuery,
      ...search,
      query("destination_station_id", integer(1)),
      query("service_code", str(undefined, { enum: ["standard", "express"] })),
      query("date_from", str(undefined, { format: "date" })),
      query("date_to", str(undefined, { format: "date" })),
    ],
    description:
      "Lọc danh sách tồn và total theo ngày nhận vận chuyển, múi giờ Việt Nam (bao gồm ngày cuối). groups là tổng toàn kho; awaiting là các kiện chờ bàn giao, độc lập với bộ lọc tồn.",
    response: anyObject,
  },
);
add("get", "/logistics/ledger", "Trạm & kho", "Nhật ký nhập xuất kho", {
  roles: "Admin / quản lý trạm",
  parameters: [...stationQuery, ...pagination],
  response: anyObject,
});
add(
  "post",
  "/logistics/orders/{id}/receive-pickup",
  "Trạm & kho",
  "Xác nhận kiện thực tế về kho từ người lấy",
  {
    roles: "Admin / quản lý trạm lấy",
    parameters: [idParam()],
    description: "Chỉ picked_up. Lặp lại bị từ chối để không tăng tồn kho sai.",
  },
);
add("get", "/logistics/batches", "Trạm & kho", "Chuyến đi và đến trạm", {
  roles: "Admin / quản lý trạm",
  parameters: [
    ...stationQuery,
    ...search,
    query("direction", str(undefined, { enum: ["outgoing", "incoming"] })),
    query(
      "status",
      str(undefined, {
        enum: ["planned", "dispatched", "received", "cancelled"],
      }),
    ),
    query("service_code", str(undefined, { enum: ["standard", "express"] })),
    query("date_from", str(undefined, { format: "date" })),
    query("date_to", str(undefined, { format: "date" })),
  ],
  description:
    "Tìm mã chuyến/tên kho. Ngày lọc theo ngày xuất kho, múi giờ Việt Nam, bao gồm cả ngày cuối; chuyến chưa xuất không khớp ngày. Gói dịch vụ: chuyến chứa ít nhất một kiện thuộc gói. Trả total sau lọc để phân trang.",
  response: anyObject,
});
add(
  "get",
  "/logistics/batches/{id}",
  "Trạm & kho",
  "Danh sách kiện và từng lần nhập kho",
  {
    roles: "Admin / quản lý trạm gửi hoặc nhận",
    parameters: [idParam()],
    response: anyObject,
  },
);
add(
  "post",
  "/logistics/batches",
  "Trạm & kho",
  "Gom nhiều kiện cùng tỉnh giao cuối thành chuyến",
  {
    roles: "Admin / quản lý trạm gửi",
    body: "BatchInput",
    code: 201,
    description:
      "Chỉ hàng đã ở kho, chưa dành cho chuyến khác. destination_station_id có thể là trạm trung gian; tất cả kiện phải chung trạm giao cuối.",
  },
);
add(
  "post",
  "/logistics/batches/{id}/dispatch",
  "Trạm & kho",
  "Xuất tất cả kiện của chuyến",
  { roles: "Admin / quản lý trạm gửi", parameters: [idParam()] },
);
add(
  "post",
  "/logistics/batches/{id}/receive",
  "Trạm & kho",
  "Kiểm nhận các kiện được chọn ở trạm đến",
  {
    roles: "Admin / quản lý trạm đến",
    parameters: [idParam()],
    body: "BatchReceive",
    description:
      "Cho phép nhận một phần. Kiện chưa nhận vẫn in_transit; chuyến chỉ received khi đủ kiện. Sai một kiện thì toàn bộ yêu cầu được hoàn tác.",
  },
);
add(
  "post",
  "/logistics/batches/{id}/cancel",
  "Trạm & kho",
  "Hủy gom chuyến chưa xuất",
  { roles: "Admin / quản lý trạm gửi", parameters: [idParam()] },
);
add(
  "post",
  "/logistics/assign-delivery",
  "Trạm & kho",
  "Phân công nhiều kiện cho người giao tại trạm đích",
  {
    roles: "Admin / quản lý trạm giao",
    body: "DeliveryAssign",
    description:
      "Có thể đổi người giao trước khi xuất giao. Nhân viên phải đang hoạt động và thuộc trạm. Tồn kho chỉ giảm khi nhân viên bắt đầu delivering.",
  },
);
add("get", "/tracking/{code}", "Tra cứu", "Tra cứu công khai bằng mã vận đơn", {
  public: true,
  parameters: [
    {
      name: "code",
      in: "path",
      required: true,
      schema: str(undefined, { pattern: "^CPN[A-Z0-9]{10,20}$" }),
    },
  ],
  response: object({
    order: object({
      tracking_code: str(),
      status,
      created_at: dateTime,
      delivered_at: { ...dateTime, nullable: true },
    }),
    events: array(anyObject),
  }),
  description: "Không trả thông tin liên hệ. Tối đa 30 yêu cầu/phút/IP.",
});
add("get", "/maps/config", "Bản đồ", "Cấu hình bản đồ mở và danh mục tỉnh", {
  public: true,
  response: object({
    provider: str(),
    configured: boolean,
    style_url: str(),
    provinces: array(anyObject),
  }),
});
add("get", "/maps/search", "Bản đồ", "Tìm tỉnh hoặc địa danh", {
  public: true,
  parameters: [
    query(
      "q",
      str(200, { minLength: 3, example: "Hồ Chí Minh" }),
      "Tên tỉnh hoặc địa danh",
      true,
    ),
  ],
  response: listSchema(anyObject),
  description:
    "Tên tỉnh tra nội bộ; địa danh dùng Photon. Nếu Photon gián đoạn có thể chọn trực tiếp ghim. Giới hạn search/reverse tổng 30 yêu cầu/phút/IP.",
});
add("get", "/maps/reverse", "Bản đồ", "Xác định tỉnh từ tọa độ", {
  public: true,
  parameters: [
    query(
      "latitude",
      { ...number(-90, 90), example: 10.7769 },
      undefined,
      true,
    ),
    query(
      "longitude",
      { ...number(-180, 180), example: 106.7009 },
      undefined,
      true,
    ),
  ],
  response: object({
    province: anyObject,
    province_code: str(),
    latitude: number(-90, 90),
    longitude: number(-180, 180),
    formatted_address: str(),
  }),
  description: "Dùng ranh giới 34 tỉnh nội bộ, không cần API key.",
});

export const openapi = {
  openapi: "3.0.3",
  info: {
    title: "Chuyển Phát Nhanh API",
    version: "1.0.0",
    description:
      "API dùng MySQL, phân quyền Admin / quản lý trạm / nhân viên / khách hàng.\n\n**Cách thử:** Mở POST /auth/login → Try it out → nhập tài khoản → Execute. Sao chép token → Authorize → dán token (không thêm Bearer). Sau đó thử API phù hợp vai trò.\n\nTry it out gọi API thật trên máy chủ hiện tại. JWT chỉ giữ trong bộ nhớ trang. API giới hạn 300 yêu cầu/phút/IP; ảnh 20/phút/IP.",
  },
  servers: [{ url: "/api", description: "API trên máy chủ hiện tại" }],
  security: [{ bearerAuth: [] }],
  tags: [
    "Hệ thống",
    "Đăng nhập",
    "Tài khoản",
    "Nhân viên",
    "Địa chỉ",
    "Bảng cước",
    "Ảnh",
    "Đơn hàng",
    "Thông báo",
    "Thống kê",
    "Tra cứu",
    "Bản đồ",
    "Trạm & kho",
    "Khiếu nại",
  ].map((name) => ({ name })),
  paths,
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description:
          "Dán token nhận từ POST /auth/login; không thêm tiền tố Bearer.",
      },
    },
    schemas,
  },
};

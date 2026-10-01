import { stationCoordinateFields, stationLocationForm } from "./station-map.js";
import { api } from "./api.js";
import {
  esc,
  options,
  heading,
  empty,
  badge,
  modal,
  closeModal,
  formError,
  toast,
  date,
} from "./ui.js";
const input = (name, label, type = "text") =>
  `<label>${label}<input name="${name}" type="${type}" required></label>`;
const save =
  '<div class="form-actions"><button class="button primary">Lưu</button><button type="button" class="button" data-action="close-modal">Đóng</button></div>';
const filterFields = (f = {}) =>
  `<label>Gói dịch vụ<select name="service_code">${options(
    [
      ["", "Tất cả gói"],
      ["standard", "Tiêu chuẩn"],
      ["express", "Hỏa tốc"],
    ],
    f.service_code || "",
  )}</select></label><label>Từ ngày<input type="date" name="date_from" value="${esc(f.date_from || "")}"></label><label>Đến ngày<input type="date" name="date_to" value="${esc(f.date_to || "")}"></label>`;
const batchLabels = {
  planned: "Chờ xuất",
  dispatched: "Đang trung chuyển",
  received: "Đã nhận đủ",
  cancelled: "Đã hủy",
};
export async function stationsPage(state) {
  const [{ items }, config, managers] = await Promise.all([
    api("/stations"),
    api("/maps/config"),
    api("/users?role=station_manager&limit=100"),
  ]);
  state.stations = items;
  state.users = managers.items;
  const missing = items.filter(
    (s) => s.active && (s.latitude == null || s.longitude == null),
  );
  return (
    heading(
      "Trạm chuyển phát",
      "Mỗi tỉnh/thành một trạm. Quản lý trạm đăng nhập tại trang web này bằng tài khoản riêng.",
    ) +
    `${missing.length ? '<p class="error-message">Còn ' + missing.length + " trạm chưa có vị trí. Hãy ghim đủ vị trí để hệ thống tính được trạm lấy gần nhất cho đơn mới.</p>" : ""}<section class="panel"><form id="station-form" class="filter-row">${input("name", "Tên trạm")}<label>Tỉnh / Thành phố<select name="province_code" aria-label="Tỉnh / Thành phố" required>${options(
      config.provinces
        .filter((p) => !items.some((s) => s.province_code === p.code))
        .map((p) => [p.code, p.name]),
      "",
    )}</select></label>${input("address", "Địa chỉ kho")}${stationCoordinateFields()}<button class="button primary">Thêm trạm</button></form></section><section class="panel"><div class="table-scroll"><table><thead><tr><th>Trạm</th><th>Tỉnh/thành</th><th>Địa chỉ / Vị trí</th><th>Tài khoản quản lý</th></tr></thead><tbody>${items.map((s) => `<tr><td>${esc(s.name)}</td><td>${esc(s.province_name)}</td><td>${esc(s.address)}<small>${s.latitude == null ? "Chưa ghim bản đồ" : esc(s.latitude) + ", " + esc(s.longitude)}</small><button class="button small" data-action="station-location" data-id="${s.id}">${s.latitude == null ? "Ghim vị trí" : "Cập nhật vị trí"}</button></td><td><button class="button" data-action="create-manager" data-id="${s.id}">Thêm quản lý trạm</button></td></tr>`).join("")}</tbody></table></div></section><section class="panel"><div class="panel-header"><h3>Tài khoản quản lý trạm</h3></div>${managers.items.map((u) => `<div class="account-row"><span>${esc(u.name)} · ${esc(u.email)} · ${esc(items.find((s) => s.id === u.station_id)?.name)} · ${u.active ? "Đang hoạt động" : "Đã khóa"}</span><button class="button" data-action="edit-user" data-id="${u.id}">Sửa</button></div>`).join("") || empty()}</section>`
  );
}
export async function warehousePage(state) {
  const { items: stations } = await api("/stations");
  state.stations = stations;
  const mine = state.user.role === "station_manager";
  const resolvedStationId = Number(
    mine
      ? (state.user.station_id ?? stations[0]?.id)
      : (state.stationId ?? stations[0]?.id),
  );
  state.stationId = resolvedStationId;
  if (!state.stationId)
    return (
      heading(
        "Kho & trung chuyển",
        "Thêm trạm, tài khoản quản lý và gán nhân viên vào trạm trước khi tiếp nhận đơn.",
      ) + empty("Chưa có trạm", "Admin thêm trạm trong mục Trạm chuyển phát.")
    );
  const stockPage = Number(state.index) || 1;
  const batchPage = Number(state.batchPage) || 1;
  const pickupPage = Number(state.pickupPage) || 1;
  const params = new URLSearchParams({
    station_id: String(state.stationId),
    limit: "50",
    page: String(stockPage),
    q: String(state.q || ""),
    ...(state.stockFilters || {}),
    ...(state.destinationFilter
      ? { destination_station_id: String(state.destinationFilter) }
      : {}),
  });
  const batchParams = new URLSearchParams({
    station_id: String(state.stationId),
    limit: "20",
    page: String(batchPage),
    ...(state.batchFilters || {}),
  });
  const [d, batches, ledger] = await Promise.all([
    api("/logistics/inventory?" + params),
    api("/logistics/batches?" + batchParams),
    api("/logistics/ledger?station_id=" + state.stationId + "&limit=20"),
  ]);
  state.stock = d.items;
  state.batches = batches.items;
  const tasks = await api(
    "/logistics/pickup-tasks?" +
      new URLSearchParams({
        station_id: String(state.stationId),
        limit: "20",
        page: String(pickupPage),
        ...(state.pickupFilters || {}),
      }),
  );
  const pickupPanel = `<section class="panel"><div class="panel-header"><div><h3>Phân công lấy hàng: ${tasks.total} đơn chờ</h3><p>Ưu tiên Hỏa tốc, sau đó đơn tạo trước. Chọn các điểm lấy gần nhau để phân công cùng nhân viên. Ngày lọc là ngày tạo đơn.</p></div></div><form id="pickup-filter" class="filter-row"><input name="q" aria-label="Tìm điểm lấy" placeholder="Mã đơn / địa chỉ / người gửi" value="${esc(state.pickupFilters?.q || "")}">${filterFields(state.pickupFilters)}<button class="button">Lọc nhiệm vụ</button></form><div class="filter-row"><button class="button primary" data-action="assign-pickup">Phân công lấy hàng đã chọn</button></div><div class="table-scroll"><table><thead><tr><th>Chọn</th><th>Đơn / Gói</th><th>Điểm lấy</th><th>Ngày tạo</th><th>Phân công</th></tr></thead><tbody>${tasks.items.map((o) => `<tr><td><input type="checkbox" data-pickup="${o.id}" aria-label="Phân công ${esc(o.tracking_code)}"></td><td><button class="code-link" data-action="order-detail" data-id="${o.id}">${esc(o.tracking_code)}</button><small>${esc(o.service_name)}</small></td><td>${esc(o.sender_name)}<small>${esc(o.sender_address)}</small></td><td>${date(o.created_at, true)}</td><td>${o.pickup_employee_name ? esc(o.pickup_employee_name) + " · Chờ xác nhận" : "Chưa phân công"}</td></tr>`).join("")}</tbody></table></div><div class="table-bottom"><span>Trang ${tasks.page}</span><button class="button" data-action="pickup-prev" ${tasks.page <= 1 ? "disabled" : ""}>Nhiệm vụ trước</button><button class="button" data-action="pickup-next" ${tasks.page * 20 >= tasks.total ? "disabled" : ""}>Nhiệm vụ sau</button></div></section>`;

  return (
    heading(
      "Kho & trung chuyển",
      stations.find((s) => s.id === state.stationId)?.name || "Trạm của bạn",
    ) +
    pickupPanel +
    `<section class="panel"><form id="warehouse-filter" class="filter-row">${
      mine
        ? ""
        : `<label>Trạm đang xem<select name="station_id">${options(
            stations.map((s) => [s.id, s.name]),
            state.stationId,
          )}</select></label>`
    }<label>Kho giao cuối<select name="destination_station_id" aria-label="Kho giao cuối">${options([["", "Tất cả"], ...stations.map((s) => [s.id, s.name])], state.destinationFilter || "")}</select></label><input name="q" aria-label="Tìm kiện trong kho" placeholder="Mã vận đơn / người nhận" value="${esc(state.q)}">${filterFields(state.stockFilters)}<button class="button">Lọc kho</button></form><div class="panel-header"><div><h3>Hàng đang có trong kho: ${d.total}</h3><p>Lọc ngày theo ngày nhân viên nhận vận chuyển (giờ Việt Nam). Chỉ tính kiện đã kiểm nhận, chưa xuất trung chuyển hoặc giao. Chọn nhiều kiện để gom chuyến/phân công giao.</p><p>Tổng nhóm toàn kho: ${d.groups.map((g) => `${esc(g.province_name)}: ${g.count} kiện (${g.available} chờ gom chuyến)`).join(" · ")}</p></div></div><div class="filter-row"><button class="button" data-action="create-batch">Gom chuyến đã chọn</button><button class="button primary" data-action="assign-delivery">Phân công giao đã chọn</button></div>${d.items.length ? `<div class="table-scroll"><table><thead><tr><th>Chọn</th><th>Mã đơn</th><th>Người nhận</th><th>Gói / Ngày nhận vận chuyển</th><th>Kho giao cuối</th><th>Trạng thái</th><th>Người giao / Chuyến</th></tr></thead><tbody>${d.items.map((o) => `<tr><td><input type="checkbox" data-stock="${o.id}" aria-label="Chọn ${esc(o.tracking_code)}"></td><td><button class="code-link" data-action="order-detail" data-id="${o.id}">${esc(o.tracking_code)}</button></td><td>${esc(o.receiver_name)}</td><td>${esc(o.service_name)}<small>${o.accepted_at ? date(o.accepted_at, true) : "Chưa nhận"}</small></td><td>${esc(o.destination_station_name)}</td><td>${badge(o.status)}</td><td>${esc(o.delivery_employee_name || "Chưa phân công")}${o.current_batch_id ? " · Chuyến #" + o.current_batch_id : ""}</td></tr>`).join("")}</tbody></table></div>` : empty("Kho chưa có kiện theo bộ lọc")}<div class="table-bottom"><span>Trang ${d.page}</span><div><button class="button" data-action="prev" ${d.page <= 1 ? "disabled" : ""}>Trước</button><button class="button" data-action="next" ${d.page * 50 >= d.total ? "disabled" : ""}>Sau</button></div></div></section>
 <section class="panel"><div class="panel-header"><div><h3>Chờ nhân viên bàn giao: ${d.awaiting.length}</h3><p>Chỉ xác nhận khi đã kiểm nhận kiện thực tế tại kho.</p></div></div>${d.awaiting.map((o) => `<div class="account-row"><span>${esc(o.tracking_code)} · ${esc(o.package_name)}</span><button class="button" data-action="receive-pickup" data-id="${o.id}">Xác nhận hàng về kho</button></div>`).join("") || empty()}</section>
 <section class="panel"><div class="panel-header"><div><h3>Chuyến trung chuyển đi / đến</h3><p>Lọc ngày theo ngày xuất chuyến (giờ Việt Nam). Lọc gói tìm chuyến có chứa gói đó; tổng kiện vẫn là toàn chuyến.</p></div></div><form id="batch-filter" class="filter-row"><label>Hướng chuyến<select name="direction" aria-label="Hướng chuyến">${options(
   [
     ["", "Đi và đến"],
     ["outgoing", "Chuyến đi"],
     ["incoming", "Chuyến đến"],
   ],
   state.batchFilters?.direction || "",
 )}</select></label><label>Trạng thái chuyến<select name="status">${options([["", "Tất cả trạng thái"], ...Object.entries(batchLabels)], state.batchFilters?.status || "")}</select></label><input name="q" aria-label="Tìm chuyến" placeholder="Mã chuyến / tên kho" value="${esc(state.batchFilters?.q || "")}">${filterFields(state.batchFilters)}<button class="button">Lọc chuyến</button></form><div class="table-scroll"><table><thead><tr><th>Chuyến / Hướng / Ngày xuất</th><th>Tuyến</th><th>Kho giao cuối</th><th>Trạng thái</th><th>Đã nhận / Tổng</th><th></th></tr></thead><tbody>${batches.items.map((b) => `<tr><td>${esc(b.code)}<small>${b.origin_station_id === state.stationId ? "Chuyến đi" : "Chuyến đến"} · ${b.dispatched_at ? date(b.dispatched_at, true) : "Chưa xuất"}</small></td><td>${esc(b.origin_name)} → ${esc(b.destination_name)}</td><td>${esc(b.final_station_name)}</td><td>${batchLabels[b.status]}</td><td>${b.received_count}/${b.parcel_count}</td><td><button class="button" data-action="batch-detail" data-id="${b.id}">Xem kiện</button>${b.origin_station_id === state.stationId && b.status === "planned" ? `<button class="button" data-action="dispatch-batch" data-id="${b.id}">Xuất chuyến</button><button class="button" data-action="cancel-batch" data-id="${b.id}">Hủy gom chuyến</button>` : ""}</td></tr>`).join("")}</tbody></table></div><div class="table-bottom"><span>${batches.total} chuyến · Trang ${state.batchPage || 1}</span><div><button class="button" data-action="batch-prev" ${(state.batchPage || 1) <= 1 ? "disabled" : ""}>Chuyến trước</button><button class="button" data-action="batch-next" ${(state.batchPage || 1) * 20 >= batches.total ? "disabled" : ""}>Chuyến sau</button></div></div></section>
 <section class="panel"><div class="panel-header"><h3>20 lượt nhập / xuất kho gần nhất</h3></div><div class="table-scroll"><table><thead><tr><th>Thời gian</th><th>Đơn</th><th>Nghiệp vụ</th><th>Người xác nhận</th></tr></thead><tbody>${ledger.items.map((l) => `<tr><td>${date(l.created_at, true)}</td><td>${esc(l.tracking_code)}</td><td>${{ pickup_received: "Nhập từ người lấy", transfer_out: "Xuất trung chuyển", transfer_received: "Nhập trung chuyển", delivery_out: "Xuất giao khách" }[l.type]}</td><td>${esc(l.actor_name)}</td></tr>`).join("")}</tbody></table></div></section>`
  );
}
export async function logisticsClick(action, id, state, navigate) {
  if (action === "pickup-prev" || action === "pickup-next") {
    state.pickupPage =
      (state.pickupPage || 1) + (action === "pickup-next" ? 1 : -1);
    await navigate();
    return true;
  }
  if (action === "assign-pickup") {
    const selected = [
      ...document.querySelectorAll("[data-pickup]:checked"),
    ].map((el) => Number(el.dataset.pickup));
    if (!selected.length) throw new Error("Chọn đơn cần phân công lấy hàng.");
    state.selectedPickup = selected;
    const employees = [];
    let page = 1;
    while (true) {
      const d = await api(
        "/users?role=employee&active=1&station_id=" +
          state.stationId +
          "&limit=100&page=" +
          page++,
      );
      employees.push(...d.items);
      if (!d.items.length || employees.length >= d.total) break;
    }
    modal(
      "Phân công lấy hàng",
      `<form id="pickup-assign-form"><label>Nhân viên lấy hàng<select name="employee_id" required>${options(
        employees.map((e) => [e.id, e.name + " · " + e.email]),
        "",
      )}</select></label><p>${selected.length} đơn. Chỉ đổi người phụ trách khi nhiệm vụ chưa được xác nhận.</p>${formError("pickup-assign-form")}${save}</form>`,
    );
    return true;
  }
  if (action === "station-location") {
    stationLocationForm(state.stations.find((s) => s.id === id));
    return true;
  }
  if (action === "create-manager") {
    modal(
      "Thêm quản lý trạm",
      `<form id="manager-form" data-id="${id}"><div class="form-grid">${input("name", "Tên quản lý")}${input("phone", "Số điện thoại")}${input("email", "Email quản lý", "email")}${input("password", "Mật khẩu ban đầu", "password")}${formError("manager-form")}</div>${save}</form>`,
    );
    return true;
  }
  if (action === "batch-prev" || action === "batch-next") {
    state.batchPage =
      (state.batchPage || 1) + (action === "batch-next" ? 1 : -1);
    await navigate();
    return true;
  }
  if (action === "receive-pickup") {
    await api("/logistics/orders/" + id + "/receive-pickup", {
      method: "POST",
    });
    await navigate();
    toast("Đã xác nhận nhập kho");
    return true;
  }
  if (["dispatch-batch", "cancel-batch"].includes(action)) {
    await api(
      "/logistics/batches/" +
        id +
        "/" +
        (action === "dispatch-batch" ? "dispatch" : "cancel"),
      { method: "POST" },
    );
    await navigate();
    return true;
  }
  if (action === "batch-detail") {
    const { batch, items } = await api("/logistics/batches/" + id);
    const receiving =
      batch.status === "dispatched" &&
      (state.user.role === "admin" ||
        batch.destination_station_id === state.user.station_id);
    modal(
      "Kiện trong chuyến " + batch.code,
      `<form id="receive-batch-form" data-id="${id}">${items.map((o) => `<label class="account-row">${receiving && !o.received_at ? `<input type="checkbox" name="order_id" value="${o.order_id}">` : ""}<span>${esc(o.tracking_code)} · ${esc(o.package_name)}<small>${esc(o.service_name)} · ${o.accepted_at ? date(o.accepted_at, true) : "Chưa nhận vận chuyển"}</small></span><span>${o.received_at ? "Đã nhập kho lúc " + date(o.received_at, true) : "Chưa nhập kho đến"}</span></label>`).join("")}${formError("receive-batch-form")}${receiving ? '<button class="button primary">Xác nhận đã nhận các kiện chọn</button>' : ""}</form>`,
    );
    return true;
  }
  if (action === "create-batch" || action === "assign-delivery") {
    const order_ids = [
      ...document.querySelectorAll("[data-stock]:checked"),
    ].map((el) => Number(el.dataset.stock));
    if (!order_ids.length) throw new Error("Chọn ít nhất một kiện trong kho.");
    state.selectedStock = order_ids;
    if (action === "create-batch") {
      modal(
        "Gom các kiện cùng tỉnh giao cuối",
        `<form id="batch-form"><label>Trạm đến của chuyến<select name="destination_station_id" required>${options(
          state.stations
            .filter((s) => s.id !== state.stationId)
            .map((s) => [s.id, s.name]),
          state.stock.find((o) => o.id === order_ids[0])
            ?.destination_station_id,
        )}</select></label><p>${order_ids.length} kiện đã chọn. Có thể chọn trạm trung gian; các kiện phải cùng tỉnh giao cuối. Chưa xuất kho cho đến khi bấm Xuất chuyến.</p>${formError("batch-form")}${save}</form>`,
      );
    } else {
      const employees = [];
      let page = 1;
      while (true) {
        const d = await api(
          "/users?role=employee&active=1&station_id=" +
            state.stationId +
            "&limit=100&page=" +
            page++,
        );
        employees.push(...d.items);
        if (!d.items.length || employees.length >= d.total) break;
      }
      if (!employees.length)
        throw new Error("Chưa có nhân viên đang hoạt động tại trạm.");
      modal(
        "Phân công người giao",
        `<form id="delivery-form"><label>Nhân viên giao hàng<select name="employee_id" required>${options(
          employees.map((e) => [e.id, e.name + " · " + e.email]),
          "",
        )}</select></label><p>${order_ids.length} kiện. Chỉ phân công khi hàng đã về trạm giao cuối.</p>${formError("delivery-form")}${save}</form>`,
      );
    }
    return true;
  }
  return false;
}
export async function logisticsSubmit(f, data, state, navigate) {
  if (f.id === "pickup-filter") {
    state.pickupFilters = data;
    state.pickupPage = 1;
    await navigate();
    return true;
  }
  if (f.id === "pickup-assign-form") {
    await api("/logistics/assign-pickup", {
      method: "POST",
      body: {
        station_id: state.stationId,
        employee_id: Number(data.employee_id),
        order_ids: state.selectedPickup,
      },
    });
    closeModal();
    await navigate();
    toast("Đã phân công, chờ nhân viên xác nhận.");
    return true;
  }
  if (f.id === "batch-filter") {
    state.batchFilters = data;
    state.batchPage = 1;
    await navigate();
    return true;
  }
  if (f.id === "warehouse-filter") {
    state.stationId = Number(data.station_id || state.user.station_id);
    state.stockFilters = {
      service_code: data.service_code || "",
      date_from: data.date_from || "",
      date_to: data.date_to || "",
    };
    state.destinationFilter = data.destination_station_id;
    state.q = data.q || "";
    state.index = 1;
    state.batchPage = 1;
    await navigate();
    return true;
  }
  if (
    ![
      "station-form",
      "station-location-form",
      "manager-form",
      "batch-form",
      "delivery-form",
      "receive-batch-form",
    ].includes(f.id)
  )
    return false;
  if (["station-form", "station-location-form"].includes(f.id)) {
    if (data.latitude === "" || data.longitude === "")
      throw new Error("Chọn vị trí kho trên bản đồ trước khi lưu.");
    data.latitude = Number(data.latitude);
    data.longitude = Number(data.longitude);
  }
  if (f.id === "station-form")
    await api("/stations", { method: "POST", body: data });
  if (f.id === "station-location-form")
    await api("/stations/" + f.dataset.id + "/location", {
      method: "PATCH",
      body: { latitude: data.latitude, longitude: data.longitude },
    });
  if (f.id === "manager-form")
    await api("/stations/" + f.dataset.id + "/managers", {
      method: "POST",
      body: data,
    });
  if (f.id === "batch-form")
    await api("/logistics/batches", {
      method: "POST",
      body: {
        station_id: state.stationId,
        destination_station_id: Number(data.destination_station_id),
        order_ids: state.selectedStock,
      },
    });
  if (f.id === "delivery-form")
    await api("/logistics/assign-delivery", {
      method: "POST",
      body: {
        station_id: state.stationId,
        employee_id: Number(data.employee_id),
        order_ids: state.selectedStock,
      },
    });
  if (f.id === "receive-batch-form") {
    const order_ids = new FormData(f).getAll("order_id").map(Number);
    if (!order_ids.length) throw new Error("Chọn các kiện thực tế đã nhận.");
    await api("/logistics/batches/" + f.dataset.id + "/receive", {
      method: "POST",
      body: { order_ids },
    });
  }
  closeModal();
  await navigate();
  toast("Đã lưu.");
  return true;
}

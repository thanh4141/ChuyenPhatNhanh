# Bản đồ mở, không cần API key

## Thành phần

- MapLibre GL JS 6 hiển thị bản đồ vector; thư viện và worker được phục vụ từ backend, cần trình duyệt/WebView hỗ trợ WebGL.
- OpenFreeMap cung cấp nền bản đồ từ dữ liệu OpenStreetMap; luôn hiển thị attribution và liên kết báo lỗi.
- OSRM trả quãng đường đường bộ ô tô và GeoJSON toàn bộ tuyến, chỉ điểm lấy → điểm giao.
- Ranh giới 34 tỉnh lưu sẵn tại backend xác định tỉnh từ ghim, không cần gọi geocoder.
- Photon tìm địa danh/đường khi bấm Tìm. Tìm tên tỉnh dùng dữ liệu nội bộ.

Tài khoản, địa chỉ, đơn, báo giá, cache đều lưu MySQL. Bộ ranh giới là tệp tham chiếu, không cần SQLite/PostgreSQL/PostGIS để chạy ứng dụng này.

## Cấu hình

```dotenv
OSRM_BASE_URL=https://routing.openstreetmap.de/routed-car
PHOTON_BASE_URL=https://photon.komoot.io
MAP_STYLE_URL=https://tiles.openfreemap.org/styles/liberty
MAP_USER_AGENT=ChuyenPhatNhanh/1.0 (+https://github.com/thanh4141/ChuyenPhatNhanh)
```

Sửa Backend/.env rồi khởi động lại backend. Không cần thẻ hay khóa Google.

Quãng đường theo tuyến ô tô OSRM đề xuất, không phải đường chim bay và không có giao thông thời gian thực. Không cộng đoạn shipper → người gửi. Ghim cách đường quá 1 km hoặc không có đường đi thì API trả lỗi, không tạo báo giá giả.

## Độ mới và giới hạn miễn phí

[FOSSGIS](https://routing.openstreetmap.de/about.html) công bố cập nhật đồ thị đường khoảng **2 ngày/lần**, có thể trễ; tối đa **1 request/giây**, không tải nặng. Không thể cam kết mọi đường thực địa mới nhất đã được cập nhật trên OSM.

Backend giãn request 1,1 giây theo nhà cung cấp, hàng đợi tối đa 8, cache tuyến 5 phút trong MySQL. Dùng **một process backend** với endpoint cộng đồng. Nhiều process cần giới hạn dùng chung hoặc OSRM riêng. Báo giá giữ 10 phút; đơn cũ giữ tuyến/giá lịch sử.

[OpenFreeMap](https://openfreemap.org/) cung cấp nền vector miễn phí, không cần tài khoản/API key, công bố không giới hạn số lượt xem/request và có bản planet hằng tuần. App tải bản đang được máy chủ phục vụ qua MAP_STYLE_URL; không cam kết dữ liệu mới tức thời. Khi thử, nền bản đồ hiển thị thành công trong Chrome cùng tuyến OSRM 4,67 km. Máy chủ ảnh tile.openstreetmap.org bị từ chối kết nối trên mạng này nên không dùng làm mặc định. OpenFreeMap, định tuyến OSRM và tìm kiếm Photon là ba dịch vụ riêng; giới hạn OSRM/Photon vẫn áp dụng.

[Photon](https://github.com/komoot/photon#demo-server) cho dùng demo với lưu lượng hợp lí, có thể gián đoạn hoặc giới hạn. App chỉ tìm khi bấm nút. Khi thử trên máy này, Photon có lúc hết thời gian kết nối. **Đặt ghim, xác định tỉnh, lưu địa chỉ và tính cước vẫn chạy**: tìm tên tỉnh, phóng to/chọn điểm, nhập địa chỉ chi tiết trong form. Không dùng Nominatim công cộng.

## Ranh giới tỉnh

Dữ liệu tại Backend/src/modules/maps/data lấy từ [Vietnamese Provinces Database](https://github.com/thanglequoc/vietnamese-provinces-database), giữ geometry/mã 34 tỉnh, bỏ trường không cần thiết. LICENSE.txt giữ giấy phép MIT; metadata.json có revision, ngày tải, SHA256. Dự án nguồn ghi nhận GIS gốc từ bản đồ tham chiếu của Nhà Xuất Bản Tài Nguyên - Môi Trường và Bản Đồ Việt Nam.

Ngày tải ranh giới **không phải** ngày cập nhật đường đi. Cập nhật ranh giới khi cần:

```powershell
npm.cmd --prefix Backend run maps:update-boundaries
npm.cmd test
```

Script kiểm tra đủ 34 mã đang hỗ trợ; nếu hành chính thay đổi thì dừng để sửa bảng tỉnh/quy tắc. Kiểm tra diff trước khi triển khai.

## Tự chạy OSRM

Không có phí API khi tự chạy, nhưng cần tài nguyên máy tính/lưu trữ. Cài Docker, tải [PBF Việt Nam từ Geofabrik](https://download.geofabrik.de/asia/vietnam.html). Dùng thư mục mới mỗi lần cập nhật, không xây đè dữ liệu đang phục vụ.

Theo [quy trình chính thức OSRM](https://github.com/Project-OSRM/osrm-backend#quick-start), chạy lần lượt từ thư mục chứa vietnam-latest.osm.pbf:

```powershell
$mapDataDir = (Get-Location).Path
$mapImage = 'ghcr.io/project-osrm/osrm-backend:v26.6.1'
docker run --rm -v "${mapDataDir}:/data" $mapImage osrm-extract -p /opt/car.lua /data/vietnam-latest.osm.pbf
docker run --rm -v "${mapDataDir}:/data" $mapImage osrm-partition /data/vietnam-latest.osrm
docker run --rm -v "${mapDataDir}:/data" $mapImage osrm-customize /data/vietnam-latest.osrm
docker run --rm -p 127.0.0.1:5000:5000 -v "${mapDataDir}:/data:ro" $mapImage osrm-routed --algorithm mld /data/vietnam-latest.osrm
```

Dừng nếu có bước báo lỗi. Đổi OSRM_BASE_URL=http://127.0.0.1:5000 rồi khởi động backend. Chưa cài/chạy Docker hoặc tải PBF lớn trong lần triển khai này; mặc định là máy chủ cộng đồng.

Muốn cập nhật đường, tải PBF mới định kì, xây graph mới, kiểm tra tuyến rồi chuyển server sang graph mới. Quote lưu data_version nếu OSRM cung cấp; nếu thiếu giao diện nói rõ chưa công bố ngày dữ liệu.

Có thể [tự chạy Photon](https://github.com/komoot/photon/blob/master/docs/usage.md) và đổi PHOTON_BASE_URL. Tự vận hành toàn bộ bản đồ cần thêm dịch vụ tile; backend nghiệp vụ vẫn dùng MySQL.

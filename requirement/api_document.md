# Tài liệu API: Đăng nhập và Quét thiết bị trong mạng

Tài liệu này mô tả 2 nội dung chính đang được ứng dụng GOADS Driver sử dụng:

1. API đăng nhập tài khoản.
2. Tính năng quét thiết bị màn hình trong mạng LAN.

Mục tiêu là giúp đội tích hợp nắm rõ endpoint, request, response, cách app dùng dữ liệu và các lỗi thường gặp.

---

## 1) API đăng nhập

### 1.1 Endpoint

- `POST /api/user/login`
- Base URL: lấy từ biến `MAIN_SERVER` (xem `lib/src/constants/base_url.dart`).

Ví dụ đầy đủ:

- `https://<main-server>/api/user/login`

### 1.2 Request

- Method: `POST`
- Content type thực tế: `multipart/form-data` (do app dùng `http.MultipartRequest`).

Form fields:

- `email/phone` (string, bắt buộc): email hoặc số điện thoại.
- `password` (string, bắt buộc): mật khẩu.

Ví dụ cURL:

```bash
curl -X POST "https://<main-server>/api/user/login" \
  -F "email/phone=driver@example.com" \
  -F "password=YourPassword"
```

### 1.3 Response thành công (`200`)

App parse về `UserModel` với các field quan trọng:

- `id`, `name`, `email`, `phone`
- `api_key`, `api_key_prefix`, `api_key_enabled`
- `minio_access_key`, `minio_secrect_key`, `minio_region`
- `roles` (mảng role, app dùng phần tử đầu `roles[0].alias`)
- `devices` (mảng thiết bị, app dùng phần tử đầu `devices[0]`)

Response mẫu rút gọn:

```json
{
  "id": 10,
  "name": "Driver A",
  "email": "driver@example.com",
  "phone": "0900000000",
  "api_key": "xxxxx",
  "api_key_prefix": "Bearer",
  "api_key_enabled": 1,
  "minio_access_key": "minio_access",
  "minio_secrect_key": "minio_secret",
  "minio_region": "ap-southeast-1",
  "roles": [
    { "id": 2, "name": "Driver", "alias": "led" }
  ],
  "devices": [
    {
      "id": 113,
      "serial": "2025010910000014",
      "name": "Screen 113",
      "enabled": true,
      "shared": false,
      "shared_public": false,
      "vehicle": { "id": 9, "name": "Xe 9", "enabled": true, "timezone_id": 7 },
      "display": []
    }
  ]
}
```

### 1.4 Response lỗi

- `401/403`: sai thông tin đăng nhập hoặc không có quyền.
- `4xx/5xx` khác: lỗi từ backend hoặc hạ tầng.

Trong app, nếu status code khác `200` thì coi là đăng nhập thất bại và hiển thị thông báo lỗi.

### 1.5 Dữ liệu app lưu sau khi đăng nhập

Sau login thành công, app lưu vào `SharedPreferences`:

- `user_id`, `user_name`, `user_email`, `user_phone`
- `user_server_api_key`
- `user_minio_access_key`, `user_minio_secret_key`, `user_minio_region`
- `user_role`
- `user_device_id`, `user_device_serial`, `user_vehicle_id`
- `user_data` (JSON tổng hợp)

Lưu ý:

- App hiện dùng token từ `user_server_api_key` để gọi các API backend khác qua header `Authorization`.
- Nhiều nơi đang gửi raw token; một số nơi gửi dạng `Bearer <token>`. Đội backend nên hỗ trợ nhất quán hoặc chuẩn hóa cách gửi token.

### 1.6 Luồng dùng thực tế trong app

1. Người dùng nhập email/sđt và mật khẩu.
2. App gọi `POST /api/user/login`.
3. Nếu thành công:
   - lưu thông tin user/device vào local storage,
   - cập nhật `DataSyncCubit`,
   - preload danh sách khu vực hoạt động thiết bị (`/api/device/area/active`),
   - chuyển vào màn hình chính.
4. Nếu thất bại: hiển thị lỗi đăng nhập.

---

## 2) Tính năng quét thiết bị trong mạng (LAN Scan)

Phần này gồm 2 lớp:

1. Quét IP trong mạng LAN bằng local network.
2. Gọi API của màn hình tại IP đó để xác thực thiết bị.

### 2.1 API màn hình dùng để xác thực

- `GET http://<ip>/api/system/status`

Đây là API chạy trên chính thiết bị màn hình trong LAN, không phải API `MAIN_SERVER`.

### 2.2 Cách app quét mạng

Service: `NetworkScanService` (`lib/src/services/network_scan.dart`).

Quy trình:

1. Lấy danh sách interface IPv4 trên máy.
2. Tạo subnet private khả dụng (`10.x.x.*`, `172.16-31.x.*`, `192.168.x.*`, `169.254.x.*`).
3. Với mỗi subnet, quét host từ `.1` đến `.254`.
4. Song song tối đa `40` request (`maxConcurrent=40`), timeout mặc định `2s`.
5. Với từng IP, gọi `GET /api/system/status`.
6. Nếu trả `200` và JSON có một trong các key:
   - `current_song` hoặc
   - `status_name` hoặc
   - `time`
   thì coi là thiết bị hợp lệ.

### 2.3 Response mẫu của `/api/system/status`

API này không có schema cứng trong app, nhưng các key thường dùng:

- `current_song`: bài/video hiện tại
- `status_name`: trạng thái phát (ví dụ `playing`, `idle`)
- `time`: thời gian trên màn hình
- có thể có thêm: `hostname`, `device_name`, `name`, `serial`

Response mẫu:

```json
{
  "hostname": "GOADS-SCREEN-113",
  "status_name": "playing",
  "time": "Thu Jan 09 02:40:45 UTC 2025",
  "current_song": "campaign_2025_001.mp4"
}
```

### 2.4 Cách app hiển thị và chọn thiết bị sau khi quét

Tại màn `Quản lý màn hình`:

1. Người dùng bấm `Quét thiết bị trong mạng`.
2. App chạy scan và lấy danh sách IP hợp lệ.
3. App gọi lại `getSystemStatus` từng IP để lấy thêm tên thiết bị (`hostname/device_name/...`).
4. Hiển thị danh sách thiết bị tìm thấy trong bottom sheet.
5. Khi người dùng chọn 1 IP:
   - lưu vào `ip_screen` và `screenIpAddress`,
   - cập nhật `DataSyncCubit.screenIpAddress`,
   - các luồng giám sát sau đó sẽ dùng IP này.

### 2.5 Sử dụng IP đã quét ở các luồng khác

Sau khi chọn IP, app dùng `http://<ip>/api/system/status` để:

- lấy trạng thái kết nối màn hình,
- lấy `status_name`, `time`,
- theo dõi `current_song` trong camera flow.

Ngoài scan thủ công, app còn có cơ chế tìm IP tự động theo serial:

- gọi backend `GET /api/device/status/?serial=<serial>`
- đọc `advancedView.IPs`
- thử từng IP bằng `GET /api/system/status`
- IP hợp lệ sẽ được cache.

### 2.6 Mã lỗi và xử lý đề xuất

Các tình huống thường gặp:

- Timeout / không kết nối được IP: bỏ qua IP đó, quét IP khác.
- HTTP khác `200`: coi là không hợp lệ.
- Response không phải JSON hoặc thiếu key nhận diện: bỏ qua.
- Không tìm thấy thiết bị nào: app báo `Không tìm thấy thiết bị nào`.

Khuyến nghị cho đội tích hợp:

- Đảm bảo thiết bị màn hình mở endpoint `GET /api/system/status` trong LAN.
- Ưu tiên response JSON ổn định có tối thiểu `status_name`, `time`, `current_song`.
- Nếu hệ thống có nhiều subnet, cân nhắc cho phép cấu hình subnet quét để tăng tốc.

---

## 3) Checklist test nhanh

### 3.1 Test login

1. Gọi `POST /api/user/login` với tài khoản hợp lệ.
2. Kiểm tra response có `api_key`, `roles`, `devices`.
3. Đăng nhập app và xác nhận vào được màn chính.
4. Kiểm tra local storage đã có `user_server_api_key`, `user_device_serial`.

### 3.2 Test scan mạng

1. Đảm bảo điện thoại và màn hình cùng mạng LAN.
2. Trên màn hình có endpoint `GET /api/system/status` trả JSON.
3. Trong app bấm `Quét thiết bị trong mạng`.
4. Chọn 1 thiết bị trong danh sách.
5. Xác nhận trạng thái màn hình cập nhật về `Đã kết nối`.


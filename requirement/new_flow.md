# Hướng dẫn lấy IP thiết bị từ API server (Cách 2)

Tài liệu này mô tả luồng **lấy IP màn hình thông qua API backend** theo `serial`, sau đó **xác thực IP thật sự kết nối được** bằng API chạy trên chính thiết bị màn hình trong LAN.

---

## Mục tiêu

- Lấy danh sách IP mà backend “nhìn thấy” của một thiết bị theo `serial`.
- Thử từng IP để tìm IP **online/đúng thiết bị**.
- Lưu lại IP hợp lệ để dùng cho các luồng kết nối/giám sát.

---

## Điều kiện / thuật ngữ

- **MAIN_SERVER**: base URL backend (xem `lib/src/constants/base_url.dart`).
- **serial**: serial của thiết bị màn hình (thường lấy từ response login: `devices[0].serial`).
- **API trên màn hình**: endpoint chạy trực tiếp trên thiết bị trong LAN:
  - `GET http://<ip>/api/system/status`

---

## Luồng thực hiện (tóm tắt)

1. Có `serial` của thiết bị.
2. Gọi backend để lấy danh sách IP theo serial: `GET /api/device/status/?serial=<serial>`.
3. Đọc danh sách IP trong response tại `advancedView.IPs`.
4. Thử từng IP bằng `GET http://<ip>/api/system/status`.
5. IP nào trả `200` và JSON hợp lệ thì chọn làm IP kết nối (`screenIpAddress`) và cache.

---

## 1) Lấy serial thiết bị

Sau khi login (`POST /api/user/login`), app thường lấy:

- `devices[0].serial`

Ví dụ:

```json
{
  "devices": [
    {
      "serial": "2025010910000014"
    }
  ]
}
```

---

## 2) API backend trả IP theo serial

### 2.1 Endpoint

- `GET /api/device/status/?serial=<serial>`
- Base URL: `MAIN_SERVER`

Ví dụ đầy đủ:

- `https://<main-server>/api/device/status/?serial=2025010910000014`

### 2.2 Headers

App thường gửi token đăng nhập qua header:

- `Authorization: <token>` hoặc `Authorization: Bearer <token>`

Ghi chú: cách prefix (`Bearer`) phụ thuộc backend; app có thể đang gửi không nhất quán.

### 2.3 Response (phần cần dùng)

App đọc mảng IP tại:

- `advancedView.IPs`

Ví dụ (rút gọn minh họa):

```json
{
  "advancedView": {
    "IPs": ["192.168.1.50", "192.168.1.51"]
  }
}
```

---

## 3) Xác thực IP bằng API trên thiết bị màn hình

Với **mỗi IP** trong `advancedView.IPs`, gọi:

- `GET http://<ip>/api/system/status`

### Tiêu chí coi là “đúng thiết bị/online”

IP được coi là hợp lệ khi:

- HTTP status `200`
- Response là JSON và có ít nhất **một** trong các key:
  - `current_song` hoặc `status_name` hoặc `time`

Ví dụ response hợp lệ:

```json
{
  "hostname": "GOADS-SCREEN-113",
  "status_name": "playing",
  "time": "Thu Jan 09 02:40:45 UTC 2025",
  "current_song": "campaign_2025_001.mp4"
}
```

### Chọn IP để kết nối

- Thử lần lượt các IP trong `advancedView.IPs`.
- IP đầu tiên hợp lệ → chọn làm `screenIpAddress` để dùng cho các luồng giám sát/kết nối.
- Nếu không có IP nào hợp lệ → coi như chưa kết nối được thiết bị qua LAN.

---

## 4) Dùng IP đã chọn cho các luồng khác

Sau khi có `screenIpAddress`, các luồng trạng thái/kết nối thường gọi:

- `http://<screenIpAddress>/api/system/status`

---

## Lỗi thường gặp & xử lý đề xuất

- **Backend có IP nhưng không truy cập được**: thiết bị không cùng LAN/VPN, firewall chặn, hoặc IP đã đổi → thử IP khác trong danh sách.
- **Timeout / HTTP khác 200**: bỏ qua IP đó.
- **Response không phải JSON hoặc thiếu key nhận diện**: bỏ qua IP đó.
- **Không có `advancedView.IPs`**: backend chưa trả field này hoặc đổi tên field → cần kiểm tra response thực tế để map đúng.

# API hiện hành

Các trường request/response dùng `snake_case`. Trang khách sạn gọi API công khai không cần đăng nhập. Nhân viên đăng nhập bằng `POST /api/auth/login`; JWT có hiệu lực 15 phút và gửi qua `Authorization: Bearer <token>`.

| Nhóm | API chính | Chức năng |
|---|---|---|
| Khách chưa đăng nhập | `GET /api/public/rooms`, `/api/public/rooms/{roomId}`, `/api/public/rooms/availability`, `/api/public/services` | Xem phòng, tình trạng phòng và dịch vụ quảng cáo |
| Nhân viên | `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`, `POST /api/auth/me/password` | Đăng nhập, hồ sơ và phiên nhân viên |
| Lễ tân | `GET /api/front-desk/dashboard`, `/api/rooms`, `/api/guests`, `/api/reservations` | Tra phòng/khách và booking |
| Lễ tân | `POST /api/guests`, `/api/reservations`, `/api/reservations/{id}/check-in`, `/cancel`, `/check-out`, `/services` | Tạo hồ sơ khách, đặt phòng, nhận/hủy/trả phòng và ghi dịch vụ |
| Quản lý | `/api/auth/employees`, `/api/room-types`, `/api/rooms/admin`, `/api/governance/audit` | Nhân viên, loại phòng, phòng và nhật ký |
| Buồng phòng/Dịch vụ | `/api/rooms/{id}/status`, `/api/services`, `/api/service-usages` | Cập nhật dọn phòng, danh mục và sử dụng dịch vụ |
| Kế toán | `/api/invoices`, `/api/finance/payments`, `/api/finance/receipts`, `/api/invoices/{id}/payments`, `/api/invoices/{id}/receipts` | Hóa đơn, giao dịch, thu khoản còn lại và tra/in biên lai |

Booking chỉ giữ một phòng. Checkout gọi một luồng transaction duy nhất để lưu hóa đơn, khoản thanh toán, biên lai, hoàn tất booking và chuyển phòng sang trạng thái cần dọn. Actor luôn lấy từ JWT.

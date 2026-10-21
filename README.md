# MaM Hotel

Ứng dụng quản lý một khách sạn nhỏ. Khách xem trang giới thiệu phòng và dịch vụ trước khi đăng nhập; nhân viên dùng bốn màn: Lễ tân, Quản lý, Buồng phòng/Dịch vụ và Kế toán.

Trang công khai chỉ giới thiệu khách sạn, phòng và dịch vụ với giá tham khảo từ danh mục đang hoạt động. Khách liên hệ trực tiếp khách sạn; trang không nhận đặt phòng trực tuyến, tài khoản khách hoặc thanh toán.

## Chạy local

SQL Server chạy trong Docker Compose riêng của dự án, cổng host `1434`, volume `web-hotel-standalone-sqlserver-data`:

```powershell
docker compose up -d sqlserver sqlserver-init
```

Chạy API trong terminal thứ nhất:

```powershell
Set-Location backend
$env:DB_URL = 'jdbc:sqlserver://localhost:1434;databaseName=QLKS;encrypt=true;trustServerCertificate=true'
$env:DB_USERNAME = 'sa'
$env:DB_PASSWORD = if ($env:HOTEL_DEMO_SQL_PASSWORD) { $env:HOTEL_DEMO_SQL_PASSWORD } else { 'Hotel_Demo_Only_2026!' }
$env:JWT_SECRET = ([guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N'))
mvn spring-boot:run
```

Chạy giao diện trong terminal khác:

```powershell
Set-Location frontend
npm ci
npm run dev -- --host 127.0.0.1 --port 5173
```

Flyway cài V1–V8 vào database trống. V7 cài procedure backup; backup chỉ được tạo khi chủ động gọi procedure. Bốn tài khoản demo (`FRONTDESK`, `MANAGER`, `HOUSEKEEP`, `ACCOUNTING`) dùng mật khẩu `hotel123`.

## Phạm vi hiện tại

12 bảng nghiệp vụ: `NhanVien`, `LoaiPhong`, `NhatKyKiemSoat`, `KhachLuuTru`, `PhieuDatPhong`, `ChiTietDatPhong`, `Phong`, `DichVu`, `SuDungDichVu`, `HoaDon`, `GiaoDichThanhToan`, `BienLai`. Flyway có V1–V8: schema và baseline seed, 8 index, 12 function, 17 view, 16 procedure, 8 trigger, procedure backup và quyền SQL Server.

`database/demo/reset_demo.sql` chỉ xóa dữ liệu giao dịch; nó chặn xóa nếu đã có hóa đơn thanh toán.

## Tài liệu

- [Chạy và kiểm tra backend](backend/README.md), [frontend](frontend/README.md).
- [Kiến trúc](docs/architecture.md) và [hợp đồng API](docs/api-contract.md).
- [Các migration SQL](backend/src/main/resources/db/migration/README.md) và [vận hành database demo, backup, phân quyền](database/demo/README.md).
- [Báo cáo phần Lễ tân](docs/bao-cao-phan-le-tan.md).
- [Quy tắc dự án](rule.md) và [hướng dẫn làm việc trong repo](AGENTS.md).

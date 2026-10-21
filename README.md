# MaM Hotel

Ứng dụng quản lý một khách sạn nhỏ. Khách xem trang giới thiệu phòng và dịch vụ trước khi đăng nhập; nhân viên dùng bốn màn: Lễ tân, Quản lý, Buồng phòng/Dịch vụ và Kế toán.

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

Flyway cài V1–V6 vào database trống. Bốn tài khoản demo (`FRONTDESK`, `MANAGER`, `HOUSEKEEP`, `ACCOUNTING`) dùng mật khẩu `hotel123`.

## Phạm vi hiện tại

12 bảng nghiệp vụ: `NhanVien`, `LoaiPhong`, `NhatKyKiemSoat`, `KhachLuuTru`, `PhieuDatPhong`, `ChiTietDatPhong`, `Phong`, `DichVu`, `SuDungDichVu`, `HoaDon`, `GiaoDichThanhToan`, `BienLai`. SQL giữ đúng sáu file V1–V6: schema và ít mẫu dữ liệu, 8 index, 5 function, views, 16 procedure và 5 trigger.

`database/demo/reset_demo.sql` chỉ xóa dữ liệu giao dịch; nó chặn xóa nếu đã có hóa đơn thanh toán. Hướng dẫn và hợp đồng API: [backend](backend/README.md), [frontend](frontend/README.md), [API](docs/api-contract.md).

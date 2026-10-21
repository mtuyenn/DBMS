# Backend MaM Hotel

Spring Boot 3 / Java 21 API dùng `JdbcTemplate`, SQL Server, Flyway và JWT. Các thao tác nghiệp vụ ghi qua stored procedure V5.

## Chạy local

Chạy Docker riêng của dự án từ thư mục gốc (`docker compose up -d sqlserver sqlserver-init`), rồi thiết lập môi trường:

```powershell
$env:DB_URL = 'jdbc:sqlserver://localhost:1434;databaseName=QLKS;encrypt=true;trustServerCertificate=true'
$env:DB_USERNAME = 'sa'
$env:DB_PASSWORD = if ($env:HOTEL_DEMO_SQL_PASSWORD) { $env:HOTEL_DEMO_SQL_PASSWORD } else { 'Hotel_Demo_Only_2026!' }
$env:JWT_SECRET = ([guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N'))
mvn spring-boot:run
```

Flyway cài V1–V6 vào database trống. API không tự xóa/reset database. Bốn tài khoản mẫu dùng mật khẩu `hotel123`: `FRONTDESK`, `MANAGER`, `HOUSEKEEP`, `ACCOUNTING`.

## Kiểm tra

```powershell
mvn test
```

Integration test chạy khi có `HOTEL_TEST_DB_URL` trỏ đến database SQL Server riêng, dùng một lần rồi bỏ. Không trỏ bài test vào database demo đang dùng.

## SQL

Giữ đúng sáu migration trong `src/main/resources/db/migration`: V1 schema/seed, V2 index, V3 function, V4 view, V5 procedure, V6 trigger. Xem [chi tiết migration](src/main/resources/db/migration/README.md). Không dùng Flyway repair hoặc sửa lịch sử migration để vượt checksum.

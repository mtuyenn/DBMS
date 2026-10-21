# Kiến trúc

```text
Trang giới thiệu công khai ── API đọc phòng/dịch vụ ─┐
Bốn màn nhân viên ── JWT / API nghiệp vụ ───────────┼── Spring Boot ── SQL Server
                                                     └── Views đọc · Stored procedures ghi
```

Frontend không truy cập database. Backend dùng Spring Boot, `JdbcTemplate`, JWT và Flyway; SQL Server giữ 12 bảng nghiệp vụ, views đọc và stored procedures ghi. Docker Compose của dự án dùng cổng host `1434` và volume riêng.

Booking một phòng; checkout lưu hóa đơn, thanh toán, biên lai và trạng thái phòng trong cùng transaction. Xem [API](api-contract.md) và [các migration](../backend/src/main/resources/db/migration/README.md).

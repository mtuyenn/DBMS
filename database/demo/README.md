# Database demo

Flyway tạo cấu trúc và seed bốn tài khoản, phòng mẫu và dịch vụ mẫu khi `QLKS` còn trống. Ứng dụng không reset database lúc khởi động.

Database nằm riêng trong Docker Compose project `web-hotel-standalone`, host port `1434`, volume `web-hotel-standalone-sqlserver-data`. Không dùng container, database hoặc volume của project khác.

`reset_demo.sql` chỉ xóa dữ liệu giao dịch và đưa trạng thái phòng về sẵn sàng; nó không tạo/sửa SQL object. Script dừng nếu demo có hóa đơn đã thanh toán vì trigger bảo vệ dữ liệu thu tiền.

Chỉ dựng lại database demo `QLKS` riêng khi migration thật sự thay đổi. Không dùng lệnh reset này trên database khác.

## Sao lưu bằng V7

V7 cài procedure `dbo.uspSaoLuuQLKS`. Trong SSMS, chọn `QLKS` rồi chạy đúng một lệnh:

```sql
EXEC dbo.uspSaoLuuQLKS;
```

File luôn có tên `C:\Backup\QLKS.bak`. Chạy lần sau sẽ ghi đè file cũ để chỉ giữ bản backup mới nhất. Procedure tự kiểm tra file sau khi tạo. Nếu SSMS báo thành công, mở `C:\Backup` trên Windows để lấy file nộp.

Trong cấu hình demo ở cổng 1434, SQL Server chạy trong Docker. `docker-compose.yml` nối thư mục `C:\Backup` trên Windows với thư mục backup bên trong SQL Server. Tạo thư mục `C:\Backup` trước, rồi chạy lại container SQL Server để áp dụng kết nối thư mục.

## Khôi phục bằng V7

Khôi phục nghĩa là chép dữ liệu từ file `.bak` trở lại database. Mẫu lệnh nằm ở cuối V7 trong khối chú thích `RESTORE`. Chỉ dùng khi thật sự muốn thay dữ liệu hiện tại của `QLKS` bằng dữ liệu trong file backup, vì lệnh `WITH REPLACE` sẽ ghi đè database. Chép khối lệnh đó sang **New Query** trong SSMS rồi chạy; không chạy chung lúc cài V7.

## Phân quyền bằng V8

V8 tạo Login `login_LeTan`, User `user_LeTan` và role `role_LeTan`, rồi thêm User vào role. Mật khẩu demo là `LeTan@QLKS2026!`; chỉ dùng cho máy demo. Role được xem dữ liệu lễ tân cần dùng, chạy các procedure nghiệp vụ và không được xóa phiếu đặt trực tiếp. Trong SSMS, đăng nhập bằng Login này để thử quyền.

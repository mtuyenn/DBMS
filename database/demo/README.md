# Database demo

Flyway tạo cấu trúc và seed bốn tài khoản, phòng mẫu và dịch vụ mẫu khi `QLKS` còn trống. Ứng dụng không reset database lúc khởi động.

Database nằm riêng trong Docker Compose project `web-hotel-standalone`, host port `1434`, volume `web-hotel-standalone-sqlserver-data`. Không dùng container, database hoặc volume của project khác.

`reset_demo.sql` chỉ xóa dữ liệu giao dịch và đưa trạng thái phòng về sẵn sàng; nó không tạo/sửa SQL object. Script dừng nếu demo có hóa đơn đã thanh toán vì trigger bảo vệ dữ liệu thu tiền.

Chỉ dựng lại database demo `QLKS` riêng khi migration thật sự thay đổi. Không dùng lệnh reset này trên database khác.

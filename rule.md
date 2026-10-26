# Quy tắc dự án — bản gọn

## 1. Phạm vi

- Hệ thống quản lý một khách sạn.
- Cơ sở dữ liệu demo có đúng 12 bảng: `NhanVien`, `LoaiPhong`, `NhatKyKiemSoat`, `KhachLuuTru`, `PhieuDatPhong`, `ChiTietDatPhong`, `Phong`, `DichVu`, `SuDungDichVu`, `HoaDon`, `GiaoDichThanhToan`, `BienLai`.
- Mỗi phiếu đặt gắn với một phòng. Không triển khai chuyển phòng, đặt phòng online, VNPay, kho vật tư, bảo trì, chấm công, phê duyệt, chatbot hoặc OTA.
- Giữ trang quảng cáo khách sạn cho khách chưa đăng nhập. Khách chỉ xem thông tin và liên hệ trực tiếp; trang không nhận booking hay thanh toán.

## 2. Vai trò

Chỉ có bốn vai trò: Lễ tân, Quản lý, Buồng phòng/Dịch vụ và Kế toán. Giao diện ẩn thao tác ngoài vai trò; backend kiểm tra quyền trên mỗi endpoint.

- Lễ tân quản lý khách và booking; nhận/hủy/trả phòng và ghi nhận thu.
- Quản lý quản lý nhân viên, phòng, loại phòng, xem doanh thu và nhật ký.
- Buồng phòng/Dịch vụ cập nhật trạng thái dọn phòng, danh mục dịch vụ và xem tổng hợp/lịch sử dịch vụ đã dùng. Lễ tân ghi nhận và hủy dịch vụ cho lượt lưu trú.
- Kế toán xem hóa đơn/giao dịch/biên lai, ghi nhận thanh toán và xem doanh thu.

## 3. Luồng chính

- Tạo booking và chi tiết phòng trong cùng transaction. Chặn hai booking trùng lịch bằng khóa SQL Server; function kiểm tra lịch riêng không thay thế khóa.
- Nhận phòng đổi trạng thái booking và phòng cùng transaction.
- Giá phòng/dịch vụ được lưu tại lúc phát sinh; thay đổi giá danh mục không làm thay đổi lịch sử.
- Thanh toán tạo giao dịch và biên lai nguyên tử. Checkout lập hóa đơn, thu đủ số dư, phát biên lai, kết thúc booking và đưa phòng sang `Cần dọn` trong một transaction.
- Không sửa/xóa hóa đơn đã thanh toán. Chỉ ghi nhận hoặc hủy dịch vụ trước khi lập hóa đơn.
- Buồng phòng chỉ được đặt phòng sang `Cần dọn`, `Đang dọn`, `Sẵn sàng`; backend không cho đặt `Sẵn sàng` khi còn khách.

## 4. SQL và quyền

Giữ chuỗi SQL Server Flyway V1–V8 hiện có: V1 bảng/seed, V2 index, V3 function, V4 view, V5 stored procedure nghiệp vụ, V6 trigger, V7 procedure backup và V8 phân quyền SQL Server. Mỗi role có 4 stored procedure nghiệp vụ, 3 function và 2 trigger; toàn hệ thống có 16 stored procedure nghiệp vụ, thêm một procedure backup, 12 function và 8 trigger. Chỉ thêm version khi chủ repo đồng ý. Đặt một định nghĩa cuối cho mỗi object trong file sở hữu; không sửa migration đã áp dụng. `reset_demo.sql` chỉ thao tác dữ liệu.

DAO có thể đọc trực tiếp một bảng. Truy vấn đọc JOIN nhiều bảng phải đi qua VIEW trong V4. Không repair checksum hoặc sửa Flyway history. Không dựng lại database khác `QLKS` nếu chưa được cho phép.

## 5. Cấu hình local và kiểm thử

- Trước commit/push, rà chính xác các file định gửi; không gửi `application.yml` khi còn thông tin đăng nhập hoặc secret local.

## 16. SMTP local

- `spring.mail.username` và `spring.mail.password` trong `backend/src/main/resources/application.yml` là cấu hình local/demo do chủ repo quản lý. Giữ nguyên hai dòng và không rotate/xóa/rỗng chúng.
- Giữ `MailConfigurationTest` để phát hiện mất cấu hình SMTP. Bản gọn không có đăng ký khách hàng hoặc API OTP; SMTP không nằm trong luồng sử dụng của bốn vai trò.
- Chủ repo tự quyết định rà soát credential trước khi public. Không tự thay đổi sender local.

# BÁO CÁO PHẦN LỄ TÂN

*Nội dung đóng góp cho Chương 2, 3, 4, 5 và 6 của báo cáo nhóm.*

**Đề tài:** Hệ thống quản lý khách sạn  
**Sinh viên:** ........................................................  
**Lớp:** ........................................................  
**Giảng viên:** ........................................................

## 1. Phạm vi công việc

Phần lễ tân hỗ trợ ba việc chính: lưu thông tin khách, tạo phiếu đặt phòng, nhận phòng và hủy phiếu đặt chưa nhận khách. Dữ liệu được lưu trong SQL Server; giao diện React gửi yêu cầu tới backend Spring Boot, sau đó backend gọi stored procedure để xử lý.

Trong phạm vi SQL được trình bày ở báo cáo này có bốn stored procedure: `uspLuuKhachHang`, `uspTaoDatPhong`, `uspNhanPhong` và `uspHuyDatPhong`. Mỗi phiếu đặt gắn với một phòng. Các thao tác checkout và thanh toán được thực hiện qua phần xử lý tài chính dùng chung của hệ thống.

## 2. Phân tích và thiết kế dữ liệu

Phần lễ tân sử dụng ba bảng chính:

| Bảng | Dữ liệu lưu | Khóa và liên kết chính |
|---|---|---|
| `KhachLuuTru` | Mã khách, họ tên, số điện thoại, email, giấy tờ tùy thân | `maKhachLuuTru` là khóa chính; số điện thoại và giấy tờ là duy nhất |
| `PhieuDatPhong` | Khách đặt, nhân viên lập phiếu, thời điểm lập, trạng thái, giờ nhận/trả thực tế, ghi chú | `maPhieuDatPhong` là khóa chính; mã khách và mã nhân viên là khóa ngoại |
| `ChiTietDatPhong` | Phòng, giờ nhận/trả dự kiến, giá phòng đã chốt | Khóa chính gồm mã phiếu và mã phòng; liên kết tới phiếu đặt và phòng |

Quan hệ dữ liệu: một khách có thể có nhiều phiếu đặt; mỗi phiếu có chi tiết phòng để ghi lại phòng và thời gian lưu trú. Thiết kế hiện tại giới hạn một phòng trong mỗi phiếu để nghiệp vụ đơn giản và phù hợp phạm vi bản demo.

Giá phòng được sao chép vào `giaTheoNgayDaChot` khi tạo phiếu. Vì vậy, nếu giá trong danh mục loại phòng thay đổi sau này, giá của lượt đặt cũ vẫn được giữ nguyên.

Các phụ thuộc chính là `maKhachLuuTru → thông tin khách`, `maPhieuDatPhong → khách, nhân viên, trạng thái và thời điểm thực tế`, và `(maPhieuDatPhong, maPhong) → thời gian lưu trú và giá đã chốt`. Thông tin khách và thông tin phiếu được tách riêng để tránh lặp lại khi một khách có nhiều lượt đặt. Các cột còn lại trong mỗi bảng phụ thuộc vào khóa chính của bảng, phù hợp cách tổ chức chuẩn 3NF trong phạm vi mô hình này.

## 3. Cài đặt các stored procedure

Các stored procedure lễ tân được đặt trong `V5__stored_procedures.sql`. Quy ước chung là `SET NOCOUNT ON` để tránh trả về số dòng bị ảnh hưởng như một kết quả phụ. Những nghiệp vụ gồm nhiều thao tác dùng transaction; nếu có lỗi, hệ thống rollback để tránh lưu dữ liệu dở dang.

### 3.1. `uspLuuKhachHang` — thêm hoặc sửa khách

**Đầu vào:** mã khách dạng `OUTPUT` (có thể để `NULL`), họ tên, số điện thoại, email và số giấy tờ tùy thân.  
**Đầu ra:** mã khách được ghi vào tham số `@maKhachLuuTru`.

Nếu mã khách được truyền vào và tồn tại, thủ tục cập nhật thông tin khách đó. Nếu chưa có mã hoặc mã không tồn tại, thủ tục thêm khách mới rồi lấy mã vừa tạo bằng `SCOPE_IDENTITY()`. Backend dùng mã đầu ra khi cần tạo phiếu đặt phòng.

Lưu ý khi giải thích: theo logic đang có, mã khác `NULL` nhưng không tìm thấy vẫn dẫn đến thêm khách mới. Đây là hành vi hiện tại của thủ tục.

### 3.2. `uspTaoDatPhong` — tạo phiếu và chi tiết đặt phòng

**Đầu vào:** mã khách, mã nhân viên, mã phòng, thời điểm nhận/trả dự kiến, ghi chú tùy chọn và mã phiếu dạng `OUTPUT`.  
**Đầu ra:** mã phiếu vừa tạo.

Thủ tục thực hiện theo thứ tự:

1. Kiểm tra giờ trả sau giờ nhận và giờ nhận không ở trước thời điểm hiện tại.
2. Bắt đầu transaction ở mức cô lập `SERIALIZABLE`, kiểm tra phòng tồn tại và giữ khóa trong lúc xử lý.
3. Tìm phiếu đã xác nhận hoặc đang ở có thời gian giao nhau. Khoảng thời gian bị trùng khi giờ nhận mới nhỏ hơn giờ trả cũ **và** giờ trả mới lớn hơn giờ nhận cũ. Hai lượt nối tiếp đúng tại thời điểm trả/nhận vẫn được phép.
4. Thêm phiếu đặt, lấy mã phiếu, rồi thêm chi tiết phòng cùng giá hiện tại của loại phòng.
5. Chỉ `COMMIT` khi cả phiếu và chi tiết đều được tạo. Nếu lỗi, `ROLLBACK`, đưa mức cô lập về `READ COMMITTED` và báo lại lỗi.

Khóa `UPDLOCK, HOLDLOCK` cùng transaction giúp ngăn hai yêu cầu đồng thời cùng đặt một phòng trong cùng khoảng thời gian. Chỉ gọi hàm kiểm tra phòng trống trước khi ghi sẽ không đủ để xử lý trường hợp hai lễ tân thao tác cùng lúc.

### 3.3. `uspNhanPhong` — nhận phòng

**Đầu vào:** mã phiếu đặt và mã nhân viên đang thao tác.  
**Đầu ra:** không có tham số trả về; trạng thái phiếu và phòng được cập nhật trong cơ sở dữ liệu.

Thủ tục mở transaction, kiểm tra phòng thuộc phiếu đang ở trạng thái sẵn sàng, rồi chỉ chuyển phiếu từ `Đã xác nhận` sang `Đang ở`. Thời điểm nhận thực tế được ghi bằng `SYSDATETIME()`. Sau đó thủ tục truyền mã nhân viên qua `SESSION_CONTEXT` để trigger ghi nhật ký biết ai thực hiện, rồi đổi phòng thành `Đang có khách`. Hai thay đổi được commit cùng nhau; nếu có lỗi thì rollback cả hai.

Thủ tục giữ quy tắc hiện tại: nó kiểm tra trạng thái sẵn sàng của phòng và trạng thái xác nhận của phiếu; không bổ sung điều kiện ngày nhận dự kiến phải đúng hôm nay.

### 3.4. `uspHuyDatPhong` — hủy phiếu chưa nhận phòng

**Đầu vào:** mã phiếu đặt.  
**Đầu ra:** không có tham số trả về.

Thủ tục chỉ đổi trạng thái phiếu từ `Đã xác nhận` sang `Đã hủy`. Phiếu đã nhận phòng, đã hủy hoặc không tồn tại sẽ không bị xóa; nếu không cập nhật được dòng nào, thủ tục trả lỗi để ứng dụng thông báo không thể hủy. Giữ lại phiếu giúp tra cứu lịch sử.

## 4. Giao dịch và kiểm soát đồng thời

Hai nghiệp vụ cần bảo đảm nhiều thay đổi cùng thành công hoặc cùng thất bại là tạo đặt phòng và nhận phòng.

Khi tạo đặt phòng, hệ thống khóa phòng và kiểm tra lịch trùng bên trong transaction. Nếu phòng không tồn tại, khoảng thời gian không hợp lệ hoặc lịch đã bị chiếm, thủ tục phát sinh lỗi và không tạo phiếu dở dang. Khi nhận phòng, cập nhật trạng thái phiếu, thời điểm nhận thực tế và trạng thái phòng nằm trong cùng transaction.

Các lỗi nghiệp vụ chính được kiểm tra gồm: khoảng thời gian không hợp lệ (`51403`), không tìm thấy phòng (`51404`), lịch đặt bị trùng (`51405`), phiếu không thể nhận (`51406`), chỉ được hủy phiếu chưa nhận (`51407`) và phòng chưa sẵn sàng (`51421`).

## 5. Tích hợp và kiểm tra

Luồng tích hợp của phần này là **React → Spring Boot → SQL Server**. `GuestDatabase` gọi `uspLuuKhachHang`; `ReservationDatabase` gọi `uspTaoDatPhong`, `uspNhanPhong` và `uspHuyDatPhong`. Các lỗi SQL được backend chuyển thành lỗi nghiệp vụ để API trả thông tin cho giao diện.

Các trường hợp đã được chạy trên SQL Server demo `QLKS`; ca thành công của bài kiểm tra được rollback ở cuối để không để lại dữ liệu kiểm thử:

| Tình huống | Kết quả ghi nhận |
|---|---|
| Thêm khách rồi cập nhật lại cùng mã | Thành công; thông tin mới được lưu |
| Tạo đặt phòng | Phiếu và chi tiết phòng cùng được tạo |
| Hai lượt đặt nối tiếp, không giao thời gian | Được chấp nhận |
| Đặt trùng lịch đang xác nhận | Bị từ chối với lỗi `51405` |
| Giờ trả không sau giờ nhận | Bị từ chối với lỗi `51403` |
| Nhận phòng hợp lệ | Phiếu chuyển sang `Đang ở`, phòng chuyển sang `Đang có khách`, có giờ nhận thực tế |
| Nhận phòng khi phòng chưa sẵn sàng | Bị từ chối với lỗi `51421` |
| Hủy phiếu chưa nhận | Phiếu chuyển sang `Đã hủy` và vẫn được lưu để tra cứu |
| Hủy phiếu đang ở | Bị từ chối với lỗi `51407` |
| Kiểm tra dữ liệu sau bài thử | Dữ liệu tạo trong transaction thử đã được rollback |

Các lệnh dưới đây minh họa ba trường hợp sai dữ liệu. Chúng không tạo hay sửa dữ liệu; mỗi lệnh phải trả về đúng mã lỗi nêu trong kết quả:

```sql
DECLARE @maPhieu BIGINT;
DECLARE @thoiDiem DATETIME2(0) = SYSDATETIME();

-- Giờ trả bằng giờ nhận nên phải báo lỗi 51403.
BEGIN TRY
    EXEC dbo.uspTaoDatPhong
        NULL, N'FRONTDESK', N'105', @thoiDiem, @thoiDiem, NULL, @maPhieu OUTPUT;
END TRY
BEGIN CATCH
    SELECT ERROR_NUMBER() AS MaLoi, ERROR_MESSAGE() AS ThongBao;
END CATCH;

-- Mã phiếu không tồn tại nên không thể nhận phòng: lỗi 51406.
BEGIN TRY
    EXEC dbo.uspNhanPhong -1, N'FRONTDESK';
END TRY
BEGIN CATCH
    SELECT ERROR_NUMBER() AS MaLoi, ERROR_MESSAGE() AS ThongBao;
END CATCH;

-- Mã phiếu không tồn tại nên không thể hủy: lỗi 51407.
BEGIN TRY
    EXEC dbo.uspHuyDatPhong -1;
END TRY
BEGIN CATCH
    SELECT ERROR_NUMBER() AS MaLoi, ERROR_MESSAGE() AS ThongBao;
END CATCH;
```

Kết quả mong đợi lần lượt là `51403`, `51406` và `51407`. Bài kiểm tra thành công đã gọi thêm/cập nhật khách, tạo phiếu, nhận phòng và hủy phiếu; phần thử tạo dữ liệu được đặt trong transaction rồi rollback ở cuối. Khi trình bày, cần dùng database demo và phòng còn trống.

## 6. Kết luận và giới hạn

Phần lễ tân hiện thực được các thao tác cốt lõi: lưu khách, tạo lượt đặt phòng, nhận khách và hủy lượt đặt chưa nhận. Việc kiểm tra giao lịch nằm trong transaction, giá được chốt khi đặt và trạng thái phiếu/phòng được cập nhật đồng bộ khi nhận khách.

Thiết kế được giới hạn ở một khách sạn và một phòng cho mỗi phiếu. Nghiệp vụ chuyển phòng, đặt trực tuyến và thanh toán trực tuyến không thuộc phạm vi bản rút gọn. Checkout và thu tiền của lễ tân được nối với phần tài chính dùng chung, còn báo cáo này tập trung giải thích bốn stored procedure đã phân công.

## Gợi ý trình bày ngắn

“Phần của em quản lý thông tin khách và lượt đặt phòng. Em dùng `uspLuuKhachHang` để thêm hoặc sửa khách; `uspTaoDatPhong` để kiểm tra thời gian, khóa phòng, chống đặt trùng rồi tạo phiếu và chi tiết trong một transaction; `uspNhanPhong` để đổi trạng thái phiếu và phòng cùng lúc; `uspHuyDatPhong` chỉ cho hủy phiếu chưa nhận và vẫn giữ lịch sử. Em đã kiểm tra các trường hợp thành công, đặt trùng, nhận phòng khi phòng chưa sẵn sàng và hủy sai trạng thái trên SQL Server demo.”

# Dữ liệu và bài thực hành Buồng phòng / dịch vụ

Đã nạp vào `QLKS` trên `.\SQLEXPRESS`. Đây là dữ liệu bổ sung, không xóa bộ demo ban đầu. Đăng nhập giao diện bằng `HOUSEKEEP` / `hotel123`, tải lại trang để thấy dữ liệu. Các tình huống bị giao diện ẩn/chặn cần thực hành bằng SQL.

## 1. Dữ liệu dùng vào việc gì?

| Phòng | Ban đầu | Tình huống |
|---|---|---|
| HK901 | Cần dọn | Bắt đầu dọn; xem trigger ghi nhật ký |
| HK902 | Đang dọn | Hoàn tất dọn; biến mất khỏi view phòng cần dọn |
| HK903 | Sẵn sàng | Đổi trạng thái; cập nhật không đổi giá trị; trigger nhiều dòng |
| HK904 | Đang có khách | Ghi/hủy dịch vụ hợp lệ, tính tổng; chặn đổi trạng thái phòng |
| HK905 | Đang có khách | Đã lập hóa đơn nhưng chưa thu: chặn cả thêm và hủy dịch vụ |
| HK906 | Sẵn sàng | Phiếu Đã xác nhận: chưa được ghi dịch vụ |
| HK907 | Cần dọn | Đã trả phòng và thanh toán: chặn ghi/hủy dịch vụ, có giao dịch và biên lai |
| HK908 | Sẵn sàng | Phiếu Đã hủy: không được ghi dịch vụ |
| HK909 | Đang có khách | Chưa dùng dịch vụ: các function trả 0; thử thêm dịch vụ mới |

| Mã dịch vụ | Giá | Trạng thái |
|---|---:|---|
| HK_LAUNDRY | 90.000/kg | Hoạt động |
| HK_BREAKFAST | 120.000/suất | Hoạt động |
| HK_FREE | 0/chai | Hoạt động; kiểm tra giá 0 hợp lệ |
| HK_OFF | 70.000/lần | Ngừng hoạt động; phải bị chặn khi ghi sử dụng |

HK904 có 3 dòng: giặt 2 kg (180.000), ăn sáng 3 suất (360.000), giặt 1 kg đã hủy (90.000, không tính tiền). Kết quả ban đầu: **2 dòng chưa hủy, tổng lượng 5, tổng tiền 540.000**. Không phải 2 loại bất kỳ luôn bằng 2 dòng: cùng một dịch vụ có thể được ghi thành nhiều dòng.

Các mã phiếu, sử dụng, hóa đơn là IDENTITY; không học thuộc con số, hãy tra theo `ghiChu` hoặc view. Ngày lưu trú được tạo theo ngày chạy seed, nên dữ liệu ngày có thể cũ nếu thực hành vào ngày khác.

## 2. Đọc dữ liệu trước khi thực hành

Trong SSMS: Server `.\SQLEXPRESS`, chọn **Windows Authentication**, mở New Query.

```sql
USE QLKS;
GO
SELECT * FROM dbo.Phong WHERE maPhong LIKE N'HK9%';
SELECT * FROM dbo.DichVu WHERE maDichVu LIKE N'HK[_]%';
SELECT maPhieuDatPhong, trangThai, ghiChu
FROM dbo.PhieuDatPhong WHERE ghiChu LIKE N'HKTEST:%';

SELECT * FROM dbo.vwPhongCanDon WHERE maPhong LIKE N'HK9%';
SELECT * FROM dbo.vwDichVuQuangCao WHERE maDichVu LIKE N'HK[_]%';
SELECT * FROM dbo.vwSuDungDichVuChiTiet WHERE tenKhach LIKE N'Khách HK9%';
SELECT * FROM dbo.vwThongKeDichVuDatPhong WHERE tenKhach LIKE N'Khách HK9%';
```

`HK[_]%` dùng dấu gạch dưới theo nghĩa ký tự thật; trong LIKE, `_` không đặt trong ngoặc sẽ khớp một ký tự bất kỳ. Tương tự `[[]` khớp ký tự `[`.

## 3. Đổi trạng thái và xem nhật ký (không giữ thay đổi)

Chạy nguyên khối, gồm cả ROLLBACK. Lệnh SELECT trước ROLLBACK cho bạn thấy kết quả trong transaction; kết thúc khối thì dữ liệu quay về ban đầu.

```sql
BEGIN TRANSACTION;
EXEC dbo.uspCapNhatTrangThaiPhong
    @maPhong=N'HK901', @trangThai=N'Đang dọn', @actorId=N'HOUSEKEEP';
SELECT * FROM dbo.Phong WHERE maPhong=N'HK901';
SELECT * FROM dbo.NhatKyKiemSoat
WHERE doiTuong=N'Phong' AND maDoiTuong=N'HK901'
ORDER BY maNhatKy DESC;
ROLLBACK TRANSACTION;
```

Mong đợi: Đang dọn; nhật ký có HOUSEKEEP, trạng thái cũ Cần dọn và mới Đang dọn. Thay phòng HK902 và trạng thái Sẵn sàng để thử hoàn tất; phòng sẽ không còn trong `vwPhongCanDon` trong transaction.

## 4. Ghi sử dụng và xem OUTPUT

```sql
BEGIN TRANSACTION;
DECLARE @phieu BIGINT=(SELECT maPhieuDatPhong FROM dbo.PhieuDatPhong WHERE ghiChu=N'HKTEST:HK909');
DECLARE @suDung BIGINT;
EXEC dbo.uspGhiSuDungDichVu
    @maPhieuDatPhong=@phieu, @maDichVu=N'HK_LAUNDRY', @soLuong=2,
    @actorId=N'HOUSEKEEP', @maSuDung=@suDung OUTPUT;
SELECT @suDung AS maVuaTao;
SELECT * FROM dbo.vwSuDungDichVuChiTiet WHERE maSuDung=@suDung;
SELECT * FROM dbo.vwThongKeDichVuDatPhong WHERE maPhieuDatPhong=@phieu;
ROLLBACK TRANSACTION;
```

Mong đợi: đơn giá 90.000, lượng 2, thành tiền 180.000; có nhật ký Ghi dịch vụ. IDENTITY có thể tăng dù rollback nên các mã có khoảng trống là bình thường.

## 5. Hủy mềm và ba function

```sql
BEGIN TRANSACTION;
DECLARE @phieu BIGINT=(SELECT maPhieuDatPhong FROM dbo.PhieuDatPhong WHERE ghiChu=N'HKTEST:HK904');
DECLARE @suDung BIGINT=(SELECT MIN(maSuDung) FROM dbo.SuDungDichVu
    WHERE maPhieuDatPhong=@phieu AND maDichVu=N'HK_LAUNDRY' AND daHuy=0);
SELECT dbo.fnDemDichVuDangDung(@phieu) AS soDong,
       dbo.fnTongSoLuongDichVuDangDung(@phieu) AS soLuong,
       dbo.fnTinhTongTienDichVu(@phieu) AS tien;
EXEC dbo.uspHuySuDungDichVu @maSuDung=@suDung;
SELECT * FROM dbo.vwSuDungDichVuChiTiet WHERE maSuDung=@suDung;
SELECT dbo.fnDemDichVuDangDung(@phieu) AS soDong,
       dbo.fnTongSoLuongDichVuDangDung(@phieu) AS soLuong,
       dbo.fnTinhTongTienDichVu(@phieu) AS tien;
ROLLBACK TRANSACTION;
```

Mong đợi trước hủy: **2 / 5 / 540.000**; sau hủy: **1 / 3 / 360.000**. Dòng vẫn tồn tại với `daHuy=1`. View chi tiết không tự loại dòng đã hủy.

## 6. Chốt giá và sửa giá danh mục

```sql
BEGIN TRANSACTION;
DECLARE @phieu BIGINT=(SELECT maPhieuDatPhong FROM dbo.PhieuDatPhong WHERE ghiChu=N'HKTEST:HK909');
-- INSERT trực tiếp để chủ động kích hoạt nhánh donGia=0 của trigger.
INSERT dbo.SuDungDichVu(maPhieuDatPhong,maDichVu,soLuong,donGia)
VALUES(@phieu,N'HK_LAUNDRY',1,0);
SELECT * FROM dbo.vwSuDungDichVuChiTiet WHERE maPhieuDatPhong=@phieu;
EXEC dbo.uspLuuDichVu N'HK_LAUNDRY',N'Giặt ủi theo kg',100000,N'kg',N'Thử đổi giá';
SELECT * FROM dbo.DichVu WHERE maDichVu=N'HK_LAUNDRY';
SELECT * FROM dbo.vwSuDungDichVuChiTiet WHERE maPhieuDatPhong=@phieu;
ROLLBACK TRANSACTION;
```

Mong đợi: trigger đổi giá dòng mới từ 0 thành 90.000. Sau sửa danh mục lên 100.000, dòng cũ vẫn 90.000. Nếu ghi thêm một dòng mới qua procedure, dòng mới nhận 100.000. Procedure thông thường đã chốt giá bằng SELECT ngay khi INSERT; trigger chỉ bù cho dòng INSERT có giá 0. Ghi SQL trực tiếp là để kiểm tra trigger, không phải đường ghi của giao diện.

## 7. Các trường hợp phải báo lỗi

Chạy từng tình huống riêng. Lấy mã phiếu từ mục 2, không lấy mã phòng làm mã phiếu.

| Thao tác | Dữ liệu | Mã lỗi mong đợi |
|---|---|---:|
| Đổi trạng thái không thuộc quyền buồng phòng | HK901 → Đang có khách | 51408 |
| Đổi trạng thái phòng không tồn tại | HK_NOT_FOUND → Cần dọn | 51404 |
| Đổi trạng thái khi còn khách | HK904 → Sẵn sàng hoặc Đang dọn | 51409 |
| Ghi dịch vụ ngừng/không tồn tại | HK909 + HK_OFF / HK_MISSING | 51411 |
| Ghi dịch vụ phiếu chưa ở, đã trả, đã hủy | HK906 / HK907 / HK908 | 51410 |
| Ghi dịch vụ phiếu không tồn tại | mã phiếu -1 | 51410 |
| Ghi dịch vụ khi đã lập hóa đơn | HK905 | 51422 |
| Ghi số lượng 0 hoặc âm | HK909 | 547, CHECK constraint |
| Lưu giá danh mục âm | uspLuuDichVu, gia=-1 | 547 |
| Hủy dòng không tồn tại hoặc đã hủy | mã -1 / dòng daHuy=1 của HK904 | 51413 |
| Hủy dòng đã có hóa đơn | HK905 hoặc HK907 | 51412 |

Ví dụ đọc lỗi mà không giữ thay đổi:

```sql
BEGIN TRY
    BEGIN TRANSACTION;
    EXEC dbo.uspCapNhatTrangThaiPhong N'HK904',N'Sẵn sàng',N'HOUSEKEEP';
    IF @@TRANCOUNT>0 ROLLBACK;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT>0 ROLLBACK;
    SELECT ERROR_NUMBER() AS maLoi, ERROR_MESSAGE() AS thongBao;
END CATCH;
```

## 8. Chạy kiểm tra tự động

Từ thư mục DBMS, Windows PowerShell:

```powershell
# Nạp nếu chưa có; nếu đã có HK9 thì không thêm trùng hoặc đặt lại dữ liệu.
& .\database\demo\test_housekeeping.ps1 -Seed

# Chỉ kiểm tra bộ dữ liệu đã nạp.
& .\database\demo\test_housekeeping.ps1
```

Kết quả đã xác minh: **34 passed, 0 failed**. Bao phủ 4 procedure, 3 function, 2 trigger và 4 view, gồm thao tác nhiều dòng và các lỗi ở bảng trên. Mỗi ca tự rollback; kiểm tra không giữ thay đổi. Đây là kiểm tra SQL trên một kết nối, chưa chứng minh các tình huống tranh chấp đồng thời hay quyền HTTP của backend.

Seed được giữ trong `database/demo/seed_housekeeping_test.sql`, chỉ có dữ liệu, không sửa migration hay Flyway history. Dữ liệu đã thanh toán ở HK907 được tạo qua luồng checkout, có giao dịch và biên lai thật trong database demo; vì vậy `reset_demo.sql` hiện có sẽ chặn reset theo thiết kế. Không xóa hóa đơn đã thanh toán để cố chạy reset.

Nếu bạn thực hành trên giao diện và lưu thay đổi, các khẳng định về trạng thái/số lượng ban đầu trong bộ kiểm tra có thể không còn đúng. Dùng các ví dụ BEGIN TRANSACTION/ROLLBACK ở trên để luyện nhiều lần mà giữ nguyên dữ liệu gốc.

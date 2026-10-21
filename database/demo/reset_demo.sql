-- Chỉ xóa dữ liệu giao dịch của database demo; không định nghĩa SQL object.
SET NOCOUNT ON;
SET XACT_ABORT ON;
IF EXISTS (SELECT 1 FROM dbo.HoaDon WHERE trangThai=N'Đã thanh toán')
    THROW 50001, N'Demo có hóa đơn đã thanh toán. Muốn xóa toàn bộ, dựng lại riêng database demo và chạy Flyway V1–V6.', 1;
BEGIN TRANSACTION;

DELETE FROM dbo.BienLai;
DELETE FROM dbo.GiaoDichThanhToan;
DELETE FROM dbo.HoaDon;
DELETE FROM dbo.SuDungDichVu;
DELETE FROM dbo.ChiTietDatPhong;
DELETE FROM dbo.PhieuDatPhong;
DELETE FROM dbo.KhachLuuTru;
DELETE FROM dbo.NhatKyKiemSoat;
UPDATE dbo.Phong SET trangThai=N'Sẵn sàng';

COMMIT TRANSACTION;

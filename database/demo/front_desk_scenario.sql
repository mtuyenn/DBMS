/* Du lieu demo cho bao cao phan Le tan.
   Chi them du lieu, khong tao/sua SQL object. Co the chay lai an toan. */

USE QLKS;
GO
SET NOCOUNT ON;
GO

DECLARE @ngay DATE = CONVERT(DATE, SYSDATETIME());
DECLARE @maKhach BIGINT;
DECLARE @maPhieu BIGINT;
DECLARE @maNhanVien NVARCHAR(20) = N'FRONTDESK';
DECLARE @nhan DATETIME2(0) = DATEADD(HOUR, 14,
    CONVERT(DATETIME2(0), DATEADD(DAY, 2, @ngay)));
DECLARE @tra DATETIME2(0) = DATEADD(HOUR, 12,
    CONVERT(DATETIME2(0), DATEADD(DAY, 4, @ngay)));
DECLARE @nhanHuy DATETIME2(0) = DATEADD(DAY, 5, @nhan);
DECLARE @traHuy DATETIME2(0) = DATEADD(DAY, 6, @nhan);

-- Tao ho so khach demo neu chua co.
SELECT @maKhach = maKhachLuuTru
FROM dbo.KhachLuuTru
WHERE soGiayToTuyThan = N'REPORTFD001';

IF @maKhach IS NULL
BEGIN
    SET @maKhach = NULL;
    EXEC dbo.uspLuuKhachHang
        @maKhachLuuTru = @maKhach OUTPUT,
        @hoVaTen = N'Khach bao cao Le tan',
        @soDienThoai = N'0900990001',
        @email = N'report.frontdesk@example.test',
        @soGiayToTuyThan = N'REPORTFD001';
END;

-- Booking sap den: phong 103.
SELECT @maPhieu = maPhieuDatPhong
FROM dbo.PhieuDatPhong
WHERE ghiChu = N'DEMO-REPORT-FD: booking sap den.';

IF @maPhieu IS NULL
BEGIN
    EXEC dbo.uspTaoDatPhong
        @maKhachLuuTru = @maKhach,
        @maNhanVien = @maNhanVien,
        @maPhong = N'103',
        @thoiDiemNhan = @nhan,
        @thoiDiemTra = @tra,
        @ghiChu = N'DEMO-REPORT-FD: booking sap den.',
        @maPhieuDatPhong = @maPhieu OUTPUT;
END;

-- Booking bi huy: phong 104.
SET @maPhieu = NULL;
SELECT @maPhieu = maPhieuDatPhong
FROM dbo.PhieuDatPhong
WHERE ghiChu = N'DEMO-REPORT-FD: booking da huy.';

IF @maPhieu IS NULL
BEGIN
    EXEC dbo.uspTaoDatPhong
        @maKhachLuuTru = @maKhach,
        @maNhanVien = @maNhanVien,
        @maPhong = N'104',
        @thoiDiemNhan = @nhanHuy,
        @thoiDiemTra = @traHuy,
        @ghiChu = N'DEMO-REPORT-FD: booking da huy.',
        @maPhieuDatPhong = @maPhieu OUTPUT;

    EXEC dbo.uspHuyDatPhong @maPhieuDatPhong = @maPhieu;
END;

SELECT *
FROM dbo.vwDatPhongChiTiet
WHERE ghiChu LIKE N'DEMO-REPORT-FD:%'
ORDER BY maPhieuDatPhong;
GO

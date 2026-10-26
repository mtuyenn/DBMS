-- Du lieu lich su bo sung cho buoi bao cao; khong tao/sua SQL object.
-- Script co the chay lai: moi tinh huong chi duoc tao mot lan.
SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRANSACTION;

DECLARE @ngayDemo DATE = CONVERT(DATE, SYSDATETIME());
DECLARE @maKhach BIGINT = (
    SELECT maKhachLuuTru FROM dbo.KhachLuuTru WHERE soDienThoai=N'0900000104'
);
DECLARE @maNhanVien NVARCHAR(20) = N'FRONTDESK';
DECLARE @maPhieu BIGINT;
DECLARE @maHoaDon BIGINT;
DECLARE @maGiaoDich BIGINT;

IF @maKhach IS NULL
    THROW 51020, N'Không tìm thấy khách mẫu để thêm tình huống báo cáo.', 1;

-- Lượt lưu trú cũ đã trả phòng, có dịch vụ, hóa đơn đã thu và biên lai.
SELECT @maPhieu = maPhieuDatPhong
FROM dbo.PhieuDatPhong
WHERE ghiChu=N'DEMO-REPORT: lượt lưu trú đã hoàn tất.';

IF @maPhieu IS NULL
BEGIN
    INSERT INTO dbo.PhieuDatPhong
        (maKhachLuuTru,maNhanVien,thoiDiemDat,thoiDiemNhanPhongThucTe,thoiDiemTraPhongThucTe,trangThai,ghiChu)
    VALUES
        (@maKhach,@maNhanVien,DATEADD(DAY,-11,CONVERT(DATETIME2(0),@ngayDemo)),
         DATEADD(HOUR,14,DATEADD(DAY,-10,CONVERT(DATETIME2(0),@ngayDemo))),
         DATEADD(HOUR,12,DATEADD(DAY,-8,CONVERT(DATETIME2(0),@ngayDemo))),
         N'Đã trả phòng',N'DEMO-REPORT: lượt lưu trú đã hoàn tất.');
    SET @maPhieu = CONVERT(BIGINT,SCOPE_IDENTITY());

    INSERT INTO dbo.ChiTietDatPhong
        (maPhieuDatPhong,maPhong,thoiDiemNhanPhong,thoiDiemTraPhong,giaTheoNgayDaChot)
    VALUES
        (@maPhieu,N'501',DATEADD(HOUR,14,DATEADD(DAY,-10,CONVERT(DATETIME2(0),@ngayDemo))),
         DATEADD(HOUR,12,DATEADD(DAY,-8,CONVERT(DATETIME2(0),@ngayDemo))),4200000);

    INSERT INTO dbo.SuDungDichVu(maPhieuDatPhong,maDichVu,soLuong,donGia,thoiDiem)
    VALUES (@maPhieu,N'SPA60',1,650000,DATEADD(HOUR,17,DATEADD(DAY,-9,CONVERT(DATETIME2(0),@ngayDemo))));

    INSERT INTO dbo.HoaDon(maPhieuDatPhong,thoiDiemLap,tienPhong,tienDichVu,tongTien,trangThai)
    VALUES (@maPhieu,DATEADD(HOUR,12,DATEADD(DAY,-8,CONVERT(DATETIME2(0),@ngayDemo))),
            8400000,650000,9050000,N'Chưa thanh toán');
    SET @maHoaDon = CONVERT(BIGINT,SCOPE_IDENTITY());

    INSERT INTO dbo.GiaoDichThanhToan(maHoaDon,soTien,phuongThuc,trangThai,thoiDiem)
    VALUES (@maHoaDon,9050000,N'Chuyển khoản',N'Hoàn tất',
            DATEADD(MINUTE,15,DATEADD(HOUR,12,DATEADD(DAY,-8,CONVERT(DATETIME2(0),@ngayDemo)))));
    SET @maGiaoDich = CONVERT(BIGINT,SCOPE_IDENTITY());

    UPDATE dbo.HoaDon SET trangThai=N'Đã thanh toán' WHERE maHoaDon=@maHoaDon;

    INSERT INTO dbo.BienLai(maGiaoDich,maHoaDon,soTien,thoiDiemPhatHanh)
    VALUES (@maGiaoDich,@maHoaDon,9050000,
            DATEADD(MINUTE,16,DATEADD(HOUR,12,DATEADD(DAY,-8,CONVERT(DATETIME2(0),@ngayDemo)))));

    INSERT INTO dbo.NhatKyKiemSoat(maNhanVien,doiTuong,maDoiTuong,hanhDong,chiTiet,thoiDiem)
    VALUES (@maNhanVien,N'PhieuDatPhong',CONVERT(NVARCHAR(50),@maPhieu),N'DEMO',
            N'Đã hoàn tất lưu trú, lập hóa đơn và phát hành biên lai.',
            DATEADD(MINUTE,16,DATEADD(HOUR,12,DATEADD(DAY,-8,CONVERT(DATETIME2(0),@ngayDemo)))));
END;

-- Tình huống đặt phòng bị hủy, để minh họa trạng thái và lịch sử vận hành.
IF NOT EXISTS (
    SELECT 1 FROM dbo.PhieuDatPhong
    WHERE ghiChu=N'DEMO-REPORT: đặt phòng đã hủy.'
)
BEGIN
    INSERT INTO dbo.PhieuDatPhong(maKhachLuuTru,maNhanVien,thoiDiemDat,trangThai,ghiChu)
    VALUES (@maKhach,@maNhanVien,DATEADD(DAY,-5,CONVERT(DATETIME2(0),@ngayDemo)),
            N'Đã hủy',N'DEMO-REPORT: đặt phòng đã hủy.');
    SET @maPhieu = CONVERT(BIGINT,SCOPE_IDENTITY());

    INSERT INTO dbo.ChiTietDatPhong
        (maPhieuDatPhong,maPhong,thoiDiemNhanPhong,thoiDiemTraPhong,giaTheoNgayDaChot)
    VALUES
        (@maPhieu,N'502',DATEADD(HOUR,15,DATEADD(DAY,-3,CONVERT(DATETIME2(0),@ngayDemo))),
         DATEADD(HOUR,12,DATEADD(DAY,-2,CONVERT(DATETIME2(0),@ngayDemo))),1100000);
END;

-- Dời kịch bản theo ngày báo cáo ngày mai; nhật ký đánh dấu để không cộng ngày lần nữa.
IF NOT EXISTS (
    SELECT 1 FROM dbo.NhatKyKiemSoat
    WHERE doiTuong=N'DEMO' AND maDoiTuong=N'REPORT-DATE-ADJUST'
      AND hanhDong=N'SHIFT' AND chiTiet=N'Đã dời lịch seed sang ngày báo cáo kế tiếp.'
)
BEGIN
    UPDATE p
    SET thoiDiemDat=DATEADD(DAY,1,thoiDiemDat),
        thoiDiemNhanPhongThucTe=DATEADD(DAY,1,thoiDiemNhanPhongThucTe),
        thoiDiemTraPhongThucTe=DATEADD(DAY,1,thoiDiemTraPhongThucTe)
    FROM dbo.PhieuDatPhong p
    WHERE p.ghiChu LIKE N'Demo lễ tân:%';

    UPDATE c
    SET thoiDiemNhanPhong=DATEADD(DAY,1,c.thoiDiemNhanPhong),
        thoiDiemTraPhong=DATEADD(DAY,1,c.thoiDiemTraPhong)
    FROM dbo.ChiTietDatPhong c
    JOIN dbo.PhieuDatPhong p ON p.maPhieuDatPhong=c.maPhieuDatPhong
    WHERE p.ghiChu LIKE N'Demo lễ tân:%';

    UPDATE s
    SET thoiDiem=DATEADD(DAY,1,s.thoiDiem)
    FROM dbo.SuDungDichVu s
    JOIN dbo.PhieuDatPhong p ON p.maPhieuDatPhong=s.maPhieuDatPhong
    WHERE p.ghiChu LIKE N'Demo lễ tân:%';

    UPDATE h
    SET thoiDiemLap=DATEADD(DAY,1,h.thoiDiemLap)
    FROM dbo.HoaDon h
    JOIN dbo.PhieuDatPhong p ON p.maPhieuDatPhong=h.maPhieuDatPhong
    WHERE p.ghiChu LIKE N'Demo lễ tân:%';

    INSERT INTO dbo.NhatKyKiemSoat(maNhanVien,doiTuong,maDoiTuong,hanhDong,chiTiet,thoiDiem)
    VALUES (@maNhanVien,N'DEMO',N'REPORT-DATE-ADJUST',N'SHIFT',
            N'Đã dời lịch seed sang ngày báo cáo kế tiếp.',SYSDATETIME());
END;

COMMIT TRANSACTION;

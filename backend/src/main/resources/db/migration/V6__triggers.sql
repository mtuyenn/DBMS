
CREATE TRIGGER dbo.trgGhiNhatKyTrangThaiPhong ON dbo.Phong
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO dbo.NhatKyKiemSoat(maNhanVien,doiTuong,maDoiTuong,hanhDong,chiTiet)
    SELECT TRY_CONVERT(NVARCHAR(20),SESSION_CONTEXT(N'actorId')), N'Phong', i.maPhong,
           N'Đổi trạng thái', CONCAT(d.trangThai,N' → ',i.trangThai)
    FROM inserted i JOIN deleted d ON d.maPhong=i.maPhong
    WHERE i.trangThai<>d.trangThai;
END;
GO


CREATE OR ALTER TRIGGER dbo.trgChotGiaPhong
ON dbo.ChiTietDatPhong
AFTER INSERT
AS
BEGIN
    UPDATE c
    SET giaTheoNgayDaChot = lp.giaTheoNgay
    FROM dbo.ChiTietDatPhong AS c
    JOIN inserted AS i
      ON i.maPhieuDatPhong = c.maPhieuDatPhong
     AND i.maPhong = c.maPhong
    JOIN dbo.Phong AS p
      ON p.maPhong = i.maPhong
    JOIN dbo.LoaiPhong AS lp
      ON lp.maLoaiPhong = p.maLoaiPhong
    WHERE c.giaTheoNgayDaChot IS NULL;
END;
GO


CREATE TRIGGER dbo.trgKiemTraTrungLichDatPhong 
ON dbo.ChiTietDatPhong
AFTER INSERT, UPDATE
AS
BEGIN
    IF EXISTS (
        SELECT 1
        FROM inserted i
        JOIN dbo.ChiTietDatPhong c ON c.maPhong = i.maPhong 
                                  AND c.maPhieuDatPhong <> i.maPhieuDatPhong 
        JOIN dbo.PhieuDatPhong p ON p.maPhieuDatPhong = c.maPhieuDatPhong
        WHERE p.trangThai IN (N'Đã xác nhận', N'Đang ở')
          AND i.thoiDiemNhanPhong < c.thoiDiemTraPhong
          AND i.thoiDiemTraPhong > c.thoiDiemNhanPhong
    )
    BEGIN
        THROW 53603, N'Phòng đã có lượt đặt trùng thời gian!', 1;
    END;
END;
GO

CREATE TRIGGER dbo.trgChotGiaDichVu ON dbo.SuDungDichVu
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE s SET donGia=d.gia
    FROM dbo.SuDungDichVu s
    JOIN inserted i ON i.maSuDung=s.maSuDung
    JOIN dbo.DichVu d ON d.maDichVu=s.maDichVu
    WHERE i.donGia=0;
END;
GO


CREATE TRIGGER dbo.trgChanXoaNhanVien ON dbo.NhanVien
INSTEAD OF DELETE
AS
BEGIN
    SET NOCOUNT ON;
    THROW 53604, N'Không xóa hồ sơ nhân viên; hãy chuyển tài khoản sang không hoạt động', 1;
END;
GO


CREATE TRIGGER dbo.trgBaoVeQuanLyCuoiCung ON dbo.NhanVien
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1
        FROM deleted cu
        JOIN inserted moi ON moi.maNhanVien=cu.maNhanVien
        WHERE cu.vaiTro=N'Quản lý' AND cu.dangHoatDong=1
          AND (moi.vaiTro<>N'Quản lý' OR moi.dangHoatDong=0)
    ) AND NOT EXISTS (
        SELECT 1 FROM dbo.NhanVien WHERE vaiTro=N'Quản lý' AND dangHoatDong=1
    ) THROW 53605, N'Khách sạn cần giữ ít nhất một quản lý đang hoạt động', 1;
END;
GO

CREATE TRIGGER dbo.trgBaoVeHoaDonDaThanhToan ON dbo.HoaDon
AFTER UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1 FROM deleted d LEFT JOIN inserted i ON i.maHoaDon=d.maHoaDon
        WHERE d.trangThai=N'Đã thanh toán'
          AND (i.maHoaDon IS NULL OR i.maPhieuDatPhong<>d.maPhieuDatPhong
               OR i.tienPhong<>d.tienPhong OR i.tienDichVu<>d.tienDichVu
               OR i.tongTien<>d.tongTien OR i.trangThai<>d.trangThai)
    ) THROW 53601, N'Hóa đơn đã thanh toán không được sửa hoặc xóa', 1;
END;
GO

CREATE TRIGGER dbo.trgKiemTraTienBienLai ON dbo.BienLai
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1
        FROM (SELECT DISTINCT maHoaDon FROM inserted) i
        OUTER APPLY (
            SELECT SUM(b.soTien) AS tongBienLai FROM dbo.BienLai b WHERE b.maHoaDon=i.maHoaDon
        ) bl
        OUTER APPLY (
            SELECT SUM(g.soTien) AS tongThu FROM dbo.GiaoDichThanhToan g
            WHERE g.maHoaDon=i.maHoaDon AND g.trangThai=N'Hoàn tất'
        ) gd
        WHERE COALESCE(bl.tongBienLai,0)>COALESCE(gd.tongThu,0)
    ) THROW 53602, N'Tổng biên lai không được vượt số tiền đã thu', 1;
END;
GO

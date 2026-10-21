-- V3: các hàm tính toán/tra cứu nhỏ được dùng bởi các truy vấn nghiệp vụ.

-- LỄ TÂN: thời lượng, tiền phòng và khả dụng phòng.
CREATE FUNCTION dbo.fnSoDemLuuTru(
    @thoiDiemNhan DATETIME2(0), @thoiDiemTra DATETIME2(0)
)
RETURNS INT
AS
BEGIN
    IF @thoiDiemNhan IS NULL OR @thoiDiemTra IS NULL OR @thoiDiemTra <= @thoiDiemNhan RETURN 0;
    DECLARE @soDem INT = DATEDIFF(DAY, CONVERT(DATE,@thoiDiemNhan), CONVERT(DATE,@thoiDiemTra));
    IF @soDem < 1 SET @soDem = 1;
    RETURN @soDem;
END;
GO

CREATE FUNCTION dbo.fnTinhTienPhong(
    @giaTheoNgay DECIMAL(12,2), @thoiDiemNhan DATETIME2(0), @thoiDiemTra DATETIME2(0)
)
RETURNS DECIMAL(12,2)
AS
BEGIN
    IF @giaTheoNgay IS NULL OR @thoiDiemNhan IS NULL OR @thoiDiemTra IS NULL OR @thoiDiemTra <= @thoiDiemNhan RETURN 0;
    RETURN @giaTheoNgay * dbo.fnSoDemLuuTru(@thoiDiemNhan, @thoiDiemTra);
END;
GO

CREATE FUNCTION dbo.fnKiemTraPhongTrong(
    @maPhong NVARCHAR(20), @thoiDiemNhan DATETIME2(0), @thoiDiemTra DATETIME2(0)
)
RETURNS BIT
AS
BEGIN
    IF @maPhong IS NULL OR @thoiDiemNhan IS NULL OR @thoiDiemTra <= @thoiDiemNhan RETURN 0;
    IF EXISTS (
        SELECT 1
        FROM dbo.ChiTietDatPhong c
        JOIN dbo.PhieuDatPhong p ON p.maPhieuDatPhong = c.maPhieuDatPhong
        WHERE c.maPhong = @maPhong
          AND p.trangThai IN (N'Đã xác nhận', N'Đang ở')
          AND @thoiDiemNhan < c.thoiDiemTraPhong
          AND @thoiDiemTra > c.thoiDiemNhanPhong
    ) RETURN 0;
    RETURN 1;
END;
GO

-- BUỒNG PHÒNG/DỊCH VỤ: tổng tiền, số dòng và tổng số lượng dịch vụ đang dùng.
CREATE FUNCTION dbo.fnTinhTongTienDichVu(@maPhieuDatPhong BIGINT)
RETURNS DECIMAL(12,2)
AS
BEGIN
    DECLARE @tong DECIMAL(12,2);
    SELECT @tong = COALESCE(SUM(soLuong * donGia),0)
    FROM dbo.SuDungDichVu
    WHERE maPhieuDatPhong = @maPhieuDatPhong AND daHuy = 0;
    RETURN COALESCE(@tong,0);
END;
GO

CREATE FUNCTION dbo.fnDemDichVuDangDung(@maPhieuDatPhong BIGINT)
RETURNS INT
AS
BEGIN
    DECLARE @soDong INT;
    SELECT @soDong = COUNT(*)
    FROM dbo.SuDungDichVu
    WHERE maPhieuDatPhong = @maPhieuDatPhong AND daHuy = 0;
    RETURN COALESCE(@soDong, 0);
END;
GO

CREATE FUNCTION dbo.fnTongSoLuongDichVuDangDung(@maPhieuDatPhong BIGINT)
RETURNS INT
AS
BEGIN
    DECLARE @soLuong INT;
    SELECT @soLuong = COALESCE(SUM(soLuong), 0)
    FROM dbo.SuDungDichVu
    WHERE maPhieuDatPhong = @maPhieuDatPhong AND daHuy = 0;
    RETURN COALESCE(@soLuong, 0);
END;
GO

-- KẾ TOÁN: đã thu, còn nợ và doanh thu theo phương thức.
CREATE FUNCTION dbo.fnTongTienDaThu(@maHoaDon BIGINT)
RETURNS DECIMAL(12,2)
AS
BEGIN
    DECLARE @tong DECIMAL(12,2);
    SELECT @tong = COALESCE(SUM(soTien),0)
    FROM dbo.GiaoDichThanhToan
    WHERE maHoaDon = @maHoaDon AND trangThai = N'Hoàn tất';
    RETURN COALESCE(@tong,0);
END;
GO

CREATE FUNCTION dbo.fnTongTienTheoPhuongThuc(@phuongThuc NVARCHAR(20))
RETURNS DECIMAL(12,2)
AS
BEGIN
    DECLARE @tong DECIMAL(12,2);
    SELECT @tong = COALESCE(SUM(soTien), 0)
    FROM dbo.GiaoDichThanhToan
    WHERE trangThai = N'Hoàn tất' AND phuongThuc = @phuongThuc;
    RETURN COALESCE(@tong, 0);
END;
GO

-- QUẢN LÝ: số lượng nhân sự, phòng theo trạng thái và loại phòng đang mở bán.
CREATE FUNCTION dbo.fnDemNhanVienHoatDongTheoVaiTro(@vaiTro NVARCHAR(30))
RETURNS INT
AS
BEGIN
    DECLARE @soLuong INT;
    SELECT @soLuong = COUNT(*)
    FROM dbo.NhanVien
    WHERE dangHoatDong = 1 AND vaiTro = @vaiTro;
    RETURN COALESCE(@soLuong, 0);
END;
GO

CREATE FUNCTION dbo.fnDemPhongTheoTrangThai(@trangThai NVARCHAR(20))
RETURNS INT
AS
BEGIN
    DECLARE @soLuong INT;
    SELECT @soLuong = COUNT(*) FROM dbo.Phong WHERE trangThai = @trangThai;
    RETURN COALESCE(@soLuong, 0);
END;
GO

CREATE FUNCTION dbo.fnDemLoaiPhongDangHoatDong()
RETURNS INT
AS
BEGIN
    DECLARE @soLuong INT;
    SELECT @soLuong = COUNT(*) FROM dbo.LoaiPhong WHERE dangHoatDong = 1;
    RETURN COALESCE(@soLuong, 0);
END;
GO

CREATE FUNCTION dbo.fnSoDuHoaDon(@maHoaDon BIGINT)
RETURNS DECIMAL(12,2)
AS
BEGIN
    DECLARE @tong DECIMAL(12,2), @daThu DECIMAL(12,2);
    SELECT @tong = tongTien FROM dbo.HoaDon WHERE maHoaDon = @maHoaDon;
    SET @daThu = dbo.fnTongTienDaThu(@maHoaDon);
    RETURN CASE WHEN @tong IS NULL OR @tong <= @daThu THEN 0 ELSE @tong - @daThu END;
END;
GO

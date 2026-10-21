-- V8: Phan quyen cho le tan
USE QLKS;
GO

-- Tao tai khoan dang nhap SQL Server cho le tan
IF SUSER_ID(N'login_LeTan') IS NULL
    CREATE LOGIN login_LeTan
    WITH PASSWORD = N'LeTan@QLKS2026!', CHECK_POLICY = ON,
         DEFAULT_DATABASE = QLKS;
GO

-- Tao role le tan
IF DATABASE_PRINCIPAL_ID(N'role_LeTan') IS NULL
    CREATE ROLE role_LeTan;
GO

-- Tao user trong QLKS va them vao role le tan
IF DATABASE_PRINCIPAL_ID(N'user_LeTan') IS NULL
    CREATE USER user_LeTan FOR LOGIN login_LeTan;

IF NOT EXISTS (
    SELECT 1
    FROM sys.database_role_members AS m
    JOIN sys.database_principals AS r ON r.principal_id = m.role_principal_id
    JOIN sys.database_principals AS u ON u.principal_id = m.member_principal_id
    WHERE r.name = N'role_LeTan' AND u.name = N'user_LeTan'
)
    ALTER ROLE role_LeTan ADD MEMBER user_LeTan;
GO

-- Cho phep xem cac thong tin le tan can dung
GRANT SELECT ON dbo.Phong TO role_LeTan;
GRANT SELECT ON dbo.LoaiPhong TO role_LeTan;
GRANT SELECT ON dbo.DichVu TO role_LeTan;
GRANT SELECT ON dbo.KhachLuuTru TO role_LeTan;
GRANT SELECT ON dbo.HoaDon TO role_LeTan;
GRANT SELECT ON dbo.GiaoDichThanhToan TO role_LeTan;
GRANT SELECT ON dbo.SuDungDichVu TO role_LeTan;

GRANT SELECT ON dbo.vwPhongQuangCao TO role_LeTan;
GRANT SELECT ON dbo.vwPhongSoDo TO role_LeTan;
GRANT SELECT ON dbo.vwDichVuQuangCao TO role_LeTan;
GRANT SELECT ON dbo.vwDatPhongChiTiet TO role_LeTan;
GRANT SELECT ON dbo.vwHoSoKhachHang TO role_LeTan;
GRANT SELECT ON dbo.vwSuDungDichVuChiTiet TO role_LeTan;
GRANT SELECT ON dbo.vwThongKeDichVuDatPhong TO role_LeTan;
GRANT SELECT ON dbo.vwHoaDonChiTiet TO role_LeTan;
GRANT SELECT ON dbo.vwGiaoDichThanhToanChiTiet TO role_LeTan;
GRANT SELECT ON dbo.vwGiaoDichChuaLapBienLai TO role_LeTan;
GRANT SELECT ON dbo.vwBienLai TO role_LeTan;
GRANT SELECT ON dbo.vwNhatKyKiemSoat TO role_LeTan;

-- Cho phep tinh gia phong va kiem tra phong trong
GRANT EXECUTE ON dbo.fnSoDemLuuTru TO role_LeTan;
GRANT EXECUTE ON dbo.fnTinhTienPhong TO role_LeTan;
GRANT EXECUTE ON dbo.fnKiemTraPhongTrong TO role_LeTan;
GRANT EXECUTE ON dbo.fnSoDuHoaDon TO role_LeTan;

-- Cho phep dat phong, tiep nhan khach, ghi dich vu va thanh toan
GRANT EXECUTE ON dbo.uspLuuKhachHang TO role_LeTan;
GRANT EXECUTE ON dbo.uspTaoDatPhong TO role_LeTan;
GRANT EXECUTE ON dbo.uspNhanPhong TO role_LeTan;
GRANT EXECUTE ON dbo.uspHuyDatPhong TO role_LeTan;
GRANT EXECUTE ON dbo.uspGhiSuDungDichVu TO role_LeTan;
GRANT EXECUTE ON dbo.uspHuySuDungDichVu TO role_LeTan;
GRANT EXECUTE ON dbo.uspLapHoaDon TO role_LeTan;
GRANT EXECUTE ON dbo.uspThanhToanTraPhong TO role_LeTan;
GRANT EXECUTE ON dbo.uspGhiGiaoDichThanhToan TO role_LeTan;
GRANT EXECUTE ON dbo.uspPhatHanhBienLai TO role_LeTan;

-- Khong cho xoa phieu dat phong truc tiep
DENY DELETE ON dbo.PhieuDatPhong TO role_LeTan;
GO

-- Kiem tra user dang thuoc role
SELECT r.name AS TenRole, u.name AS TenUser
FROM sys.database_role_members AS m
JOIN sys.database_principals AS r ON r.principal_id = m.role_principal_id
JOIN sys.database_principals AS u ON u.principal_id = m.member_principal_id
WHERE r.name = N'role_LeTan';
GO

-- Kiem tra cac quyen da cap cho role
SELECT
    p.state_desc AS TrangThaiQuyen,
    p.permission_name AS TenQuyen,
    OBJECT_SCHEMA_NAME(p.major_id) AS TenSchema,
    OBJECT_NAME(p.major_id) AS TenDoiTuong
FROM sys.database_permissions AS p
JOIN sys.database_principals AS r ON r.principal_id = p.grantee_principal_id
WHERE r.name = N'role_LeTan'
ORDER BY p.state_desc, p.permission_name, TenDoiTuong;
GO

DELETE FROM dbo.PhieuDatPhong WHERE 1 = 0;

ALTER ROLE role_LeTan DROP MEMBER u_LeTanDemo;
DROP USER u_LeTanDemo;
GO

-- Lễ tân được xem danh sách phòng
SELECT TOP 5 * FROM dbo.Phong;

-- Lễ tân không được sửa dữ liệu phòng trực tiếp
UPDATE dbo.Phong
SET moTa = moTa
WHERE 1 = 0;

-- Tao Login, User va Role cho Quan ly, Buong phong va Ke toan
IF SUSER_ID(N'login_QuanLy') IS NULL
    CREATE LOGIN login_QuanLy WITH PASSWORD = N'QuanLy@QLKS2026!', CHECK_POLICY = ON, DEFAULT_DATABASE = QLKS;
IF SUSER_ID(N'login_BuongPhong') IS NULL
    CREATE LOGIN login_BuongPhong WITH PASSWORD = N'BuongPhong@QLKS2026!', CHECK_POLICY = ON, DEFAULT_DATABASE = QLKS;
IF SUSER_ID(N'login_KeToan') IS NULL
    CREATE LOGIN login_KeToan WITH PASSWORD = N'KeToan@QLKS2026!', CHECK_POLICY = ON, DEFAULT_DATABASE = QLKS;
GO

IF DATABASE_PRINCIPAL_ID(N'role_QuanLy') IS NULL CREATE ROLE role_QuanLy;
IF DATABASE_PRINCIPAL_ID(N'role_BuongPhong') IS NULL CREATE ROLE role_BuongPhong;
IF DATABASE_PRINCIPAL_ID(N'role_KeToan') IS NULL CREATE ROLE role_KeToan;
GO

IF DATABASE_PRINCIPAL_ID(N'user_QuanLy') IS NULL CREATE USER user_QuanLy FOR LOGIN login_QuanLy;
IF DATABASE_PRINCIPAL_ID(N'user_BuongPhong') IS NULL CREATE USER user_BuongPhong FOR LOGIN login_BuongPhong;
IF DATABASE_PRINCIPAL_ID(N'user_KeToan') IS NULL CREATE USER user_KeToan FOR LOGIN login_KeToan;

IF NOT EXISTS (SELECT 1 FROM sys.database_role_members WHERE role_principal_id = DATABASE_PRINCIPAL_ID(N'role_QuanLy') AND member_principal_id = DATABASE_PRINCIPAL_ID(N'user_QuanLy'))
    ALTER ROLE role_QuanLy ADD MEMBER user_QuanLy;
IF NOT EXISTS (SELECT 1 FROM sys.database_role_members WHERE role_principal_id = DATABASE_PRINCIPAL_ID(N'role_BuongPhong') AND member_principal_id = DATABASE_PRINCIPAL_ID(N'user_BuongPhong'))
    ALTER ROLE role_BuongPhong ADD MEMBER user_BuongPhong;
IF NOT EXISTS (SELECT 1 FROM sys.database_role_members WHERE role_principal_id = DATABASE_PRINCIPAL_ID(N'role_KeToan') AND member_principal_id = DATABASE_PRINCIPAL_ID(N'user_KeToan'))
    ALTER ROLE role_KeToan ADD MEMBER user_KeToan;
GO

-- Quan ly: xem toan bo du lieu, chay cac nghiep vu va quan ly nhan vien
GRANT SELECT ON SCHEMA::dbo TO role_QuanLy;
GRANT EXECUTE ON SCHEMA::dbo TO role_QuanLy;
GRANT UPDATE ON dbo.NhanVien TO role_QuanLy;
GRANT INSERT ON dbo.NhatKyKiemSoat TO role_QuanLy;

-- Buong phong: xem phong, dat phong va dich vu; cap nhat trang thai phong
GRANT SELECT ON dbo.NhanVien TO role_BuongPhong;
GRANT SELECT ON dbo.Phong TO role_BuongPhong;
GRANT SELECT ON dbo.LoaiPhong TO role_BuongPhong;
GRANT SELECT ON dbo.PhieuDatPhong TO role_BuongPhong;
GRANT SELECT ON dbo.ChiTietDatPhong TO role_BuongPhong;
GRANT SELECT ON dbo.DichVu TO role_BuongPhong;
GRANT SELECT ON dbo.SuDungDichVu TO role_BuongPhong;
GRANT SELECT ON dbo.vwPhongSoDo TO role_BuongPhong;
GRANT SELECT ON dbo.vwPhongCanDon TO role_BuongPhong;
GRANT SELECT ON dbo.vwDatPhongChiTiet TO role_BuongPhong;
GRANT SELECT ON dbo.vwDichVuQuangCao TO role_BuongPhong;
GRANT SELECT ON dbo.vwSuDungDichVuChiTiet TO role_BuongPhong;
GRANT SELECT ON dbo.vwThongKeDichVuDatPhong TO role_BuongPhong;
GRANT INSERT ON dbo.NhatKyKiemSoat TO role_BuongPhong;
GRANT EXECUTE ON dbo.uspCapNhatTrangThaiPhong TO role_BuongPhong;
GRANT EXECUTE ON dbo.uspLuuDichVu TO role_BuongPhong;
GRANT EXECUTE ON dbo.uspGhiSuDungDichVu TO role_BuongPhong;
GRANT EXECUTE ON dbo.uspHuySuDungDichVu TO role_BuongPhong;
GRANT EXECUTE ON dbo.fnSoDemLuuTru TO role_BuongPhong;
GRANT EXECUTE ON dbo.fnTinhTienPhong TO role_BuongPhong;
GRANT EXECUTE ON dbo.fnKiemTraPhongTrong TO role_BuongPhong;
GRANT EXECUTE ON dbo.fnTinhTongTienDichVu TO role_BuongPhong;
GRANT EXECUTE ON dbo.fnDemDichVuDangDung TO role_BuongPhong;
GRANT EXECUTE ON dbo.fnTongSoLuongDichVuDangDung TO role_BuongPhong;

-- Ke toan: xem hoa don va giao dich, thu tien va phat hanh bien lai
GRANT SELECT ON dbo.NhanVien TO role_KeToan;
GRANT SELECT ON dbo.Phong TO role_KeToan;
GRANT SELECT ON dbo.LoaiPhong TO role_KeToan;
GRANT SELECT ON dbo.KhachLuuTru TO role_KeToan;
GRANT SELECT ON dbo.PhieuDatPhong TO role_KeToan;
GRANT SELECT ON dbo.ChiTietDatPhong TO role_KeToan;
GRANT SELECT ON dbo.DichVu TO role_KeToan;
GRANT SELECT ON dbo.SuDungDichVu TO role_KeToan;
GRANT SELECT ON dbo.HoaDon TO role_KeToan;
GRANT SELECT ON dbo.GiaoDichThanhToan TO role_KeToan;
GRANT SELECT ON dbo.BienLai TO role_KeToan;
GRANT SELECT ON dbo.vwPhongSoDo TO role_KeToan;
GRANT SELECT ON dbo.vwDatPhongChiTiet TO role_KeToan;
GRANT SELECT ON dbo.vwSuDungDichVuChiTiet TO role_KeToan;
GRANT SELECT ON dbo.vwThongKeDichVuDatPhong TO role_KeToan;
GRANT SELECT ON dbo.vwHoaDonChiTiet TO role_KeToan;
GRANT SELECT ON dbo.vwGiaoDichThanhToanChiTiet TO role_KeToan;
GRANT SELECT ON dbo.vwGiaoDichChuaLapBienLai TO role_KeToan;
GRANT SELECT ON dbo.vwBienLai TO role_KeToan;
GRANT SELECT ON dbo.vwDoanhThuTheoNgay TO role_KeToan;
GRANT SELECT ON dbo.vwDoanhThuTheoPhuongThuc TO role_KeToan;
GRANT INSERT ON dbo.NhatKyKiemSoat TO role_KeToan;
GRANT EXECUTE ON dbo.uspLapHoaDon TO role_KeToan;
GRANT EXECUTE ON dbo.uspGhiGiaoDichThanhToan TO role_KeToan;
GRANT EXECUTE ON dbo.uspPhatHanhBienLai TO role_KeToan;
GRANT EXECUTE ON dbo.fnSoDemLuuTru TO role_KeToan;
GRANT EXECUTE ON dbo.fnTinhTienPhong TO role_KeToan;
GRANT EXECUTE ON dbo.fnTinhTongTienDichVu TO role_KeToan;
GRANT EXECUTE ON dbo.fnTongTienDaThu TO role_KeToan;
GRANT EXECUTE ON dbo.fnSoDuHoaDon TO role_KeToan;
GRANT EXECUTE ON dbo.fnTongTienTheoPhuongThuc TO role_KeToan;
GO

-- Mat khau demo: QuanLy@QLKS2026!, BuongPhong@QLKS2026!, KeToan@QLKS2026!
-- Dang nhap bang login_QuanLy, login_BuongPhong hoac login_KeToan de thu quyen.
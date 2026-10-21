-- V1: 12 bảng cốt lõi của khách sạn nhỏ, kèm dữ liệu mẫu ban đầu.
-- Giữ cấu trúc bằng tiếng Việt không dấu theo hợp đồng SQL Server của dự án.

CREATE TABLE dbo.NhanVien (
    maNhanVien NVARCHAR(20) NOT NULL PRIMARY KEY,
    hoVaTen NVARCHAR(100) NOT NULL,
    matKhau NVARCHAR(100) NOT NULL,
    vaiTro NVARCHAR(30) NOT NULL,
    soDienThoai NVARCHAR(20) NOT NULL UNIQUE,
    dangHoatDong BIT NOT NULL CONSTRAINT dfNhanVienHoatDong DEFAULT 1,
    CONSTRAINT ckNhanVienVaiTro CHECK (vaiTro IN (N'Lễ tân', N'Quản lý', N'Buồng phòng/Dịch vụ', N'Kế toán'))
);

CREATE TABLE dbo.LoaiPhong (
    maLoaiPhong NVARCHAR(20) NOT NULL PRIMARY KEY,
    ten NVARCHAR(60) NOT NULL UNIQUE,
    giaTheoNgay DECIMAL(12,2) NOT NULL,
    moTa NVARCHAR(500) NULL,
    dangHoatDong BIT NOT NULL CONSTRAINT dfLoaiPhongHoatDong DEFAULT 1,
    CONSTRAINT ckLoaiPhongGia CHECK (giaTheoNgay >= 0)
);

CREATE TABLE dbo.NhatKyKiemSoat (
    maNhatKy BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    maNhanVien NVARCHAR(20) NULL,
    doiTuong NVARCHAR(50) NOT NULL,
    maDoiTuong NVARCHAR(50) NOT NULL,
    hanhDong NVARCHAR(50) NOT NULL,
    chiTiet NVARCHAR(500) NULL,
    thoiDiem DATETIME2(0) NOT NULL CONSTRAINT dfNhatKyThoiDiem DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fkNhatKyNhanVien FOREIGN KEY (maNhanVien) REFERENCES dbo.NhanVien(maNhanVien)
);

CREATE TABLE dbo.KhachLuuTru (
    maKhachLuuTru BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    hoVaTen NVARCHAR(100) NOT NULL,
    soDienThoai NVARCHAR(20) NOT NULL UNIQUE,
    email NVARCHAR(150) NULL,
    soGiayToTuyThan NVARCHAR(20) NOT NULL UNIQUE
);

CREATE TABLE dbo.Phong (
    maPhong NVARCHAR(20) NOT NULL PRIMARY KEY,
    maLoaiPhong NVARCHAR(20) NOT NULL,
    tang INT NOT NULL CONSTRAINT dfPhongTang DEFAULT 1,
    trangThai NVARCHAR(20) NOT NULL CONSTRAINT dfPhongTrangThai DEFAULT N'Sẵn sàng',
    moTa NVARCHAR(300) NULL,
    CONSTRAINT fkPhongLoaiPhong FOREIGN KEY (maLoaiPhong) REFERENCES dbo.LoaiPhong(maLoaiPhong),
    CONSTRAINT ckPhongTang CHECK (tang >= 0),
    CONSTRAINT ckPhongTrangThai CHECK (trangThai IN (N'Sẵn sàng', N'Đang có khách', N'Cần dọn', N'Đang dọn'))
);

CREATE TABLE dbo.PhieuDatPhong (
    maPhieuDatPhong BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    maKhachLuuTru BIGINT NOT NULL,
    maNhanVien NVARCHAR(20) NOT NULL,
    thoiDiemDat DATETIME2(0) NOT NULL CONSTRAINT dfPhieuDatThoiDiem DEFAULT SYSDATETIME(),
    thoiDiemNhanPhongThucTe DATETIME2(0) NULL,
    thoiDiemTraPhongThucTe DATETIME2(0) NULL,
    trangThai NVARCHAR(20) NOT NULL CONSTRAINT dfPhieuDatTrangThai DEFAULT N'Đã xác nhận',
    ghiChu NVARCHAR(500) NULL,
    CONSTRAINT fkPhieuDatKhach FOREIGN KEY (maKhachLuuTru) REFERENCES dbo.KhachLuuTru(maKhachLuuTru),
    CONSTRAINT fkPhieuDatNhanVien FOREIGN KEY (maNhanVien) REFERENCES dbo.NhanVien(maNhanVien),
    CONSTRAINT ckPhieuDatTrangThai CHECK (trangThai IN (N'Đã xác nhận', N'Đang ở', N'Đã trả phòng', N'Đã hủy'))
);

CREATE TABLE dbo.ChiTietDatPhong (
    maPhieuDatPhong BIGINT NOT NULL,
    maPhong NVARCHAR(20) NOT NULL,
    thoiDiemNhanPhong DATETIME2(0) NOT NULL,
    thoiDiemTraPhong DATETIME2(0) NOT NULL,
    giaTheoNgayDaChot DECIMAL(12,2) NULL,
    PRIMARY KEY (maPhieuDatPhong, maPhong),
    CONSTRAINT fkChiTietDatPhieu FOREIGN KEY (maPhieuDatPhong) REFERENCES dbo.PhieuDatPhong(maPhieuDatPhong),
    CONSTRAINT fkChiTietDatPhong FOREIGN KEY (maPhong) REFERENCES dbo.Phong(maPhong),
    CONSTRAINT ckChiTietDatThoiGian CHECK (thoiDiemTraPhong > thoiDiemNhanPhong),
    CONSTRAINT ckChiTietDatGia CHECK (giaTheoNgayDaChot IS NULL OR giaTheoNgayDaChot >= 0)
);

CREATE TABLE dbo.DichVu (
    maDichVu NVARCHAR(20) NOT NULL PRIMARY KEY,
    ten NVARCHAR(100) NOT NULL UNIQUE,
    gia DECIMAL(12,2) NOT NULL,
    donViTinh NVARCHAR(30) NOT NULL CONSTRAINT dfDichVuDonVi DEFAULT N'lần',
    moTa NVARCHAR(300) NULL,
    dangHoatDong BIT NOT NULL CONSTRAINT dfDichVuHoatDong DEFAULT 1,
    CONSTRAINT ckDichVuGia CHECK (gia >= 0)
);

CREATE TABLE dbo.SuDungDichVu (
    maSuDung BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    maPhieuDatPhong BIGINT NOT NULL,
    maDichVu NVARCHAR(20) NOT NULL,
    soLuong INT NOT NULL,
    donGia DECIMAL(12,2) NOT NULL,
    thoiDiem DATETIME2(0) NOT NULL CONSTRAINT dfSuDungThoiDiem DEFAULT SYSDATETIME(),
    daHuy BIT NOT NULL CONSTRAINT dfSuDungDaHuy DEFAULT 0,
    CONSTRAINT fkSuDungPhieu FOREIGN KEY (maPhieuDatPhong) REFERENCES dbo.PhieuDatPhong(maPhieuDatPhong),
    CONSTRAINT fkSuDungDichVu FOREIGN KEY (maDichVu) REFERENCES dbo.DichVu(maDichVu),
    CONSTRAINT ckSuDungSoLuong CHECK (soLuong > 0),
    CONSTRAINT ckSuDungDonGia CHECK (donGia >= 0)
);

CREATE TABLE dbo.HoaDon (
    maHoaDon BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    maPhieuDatPhong BIGINT NOT NULL UNIQUE,
    thoiDiemLap DATETIME2(0) NOT NULL CONSTRAINT dfHoaDonThoiDiem DEFAULT SYSDATETIME(),
    tienPhong DECIMAL(12,2) NOT NULL,
    tienDichVu DECIMAL(12,2) NOT NULL,
    tongTien DECIMAL(12,2) NOT NULL,
    trangThai NVARCHAR(20) NOT NULL CONSTRAINT dfHoaDonTrangThai DEFAULT N'Chưa thanh toán',
    CONSTRAINT fkHoaDonPhieu FOREIGN KEY (maPhieuDatPhong) REFERENCES dbo.PhieuDatPhong(maPhieuDatPhong),
    CONSTRAINT ckHoaDonTien CHECK (tienPhong >= 0 AND tienDichVu >= 0 AND tongTien >= 0),
    CONSTRAINT ckHoaDonTrangThai CHECK (trangThai IN (N'Chưa thanh toán', N'Đã thanh toán'))
);

CREATE TABLE dbo.GiaoDichThanhToan (
    maGiaoDich BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    maHoaDon BIGINT NOT NULL,
    soTien DECIMAL(12,2) NOT NULL,
    phuongThuc NVARCHAR(20) NOT NULL,
    trangThai NVARCHAR(20) NOT NULL CONSTRAINT dfGiaoDichTrangThai DEFAULT N'Hoàn tất',
    thoiDiem DATETIME2(0) NOT NULL CONSTRAINT dfGiaoDichThoiDiem DEFAULT SYSDATETIME(),
    CONSTRAINT fkGiaoDichHoaDon FOREIGN KEY (maHoaDon) REFERENCES dbo.HoaDon(maHoaDon),
    CONSTRAINT ckGiaoDichSoTien CHECK (soTien > 0),
    CONSTRAINT ckGiaoDichPhuongThuc CHECK (phuongThuc IN (N'Tiền mặt', N'Thẻ', N'Chuyển khoản')),
    CONSTRAINT ckGiaoDichTrangThai CHECK (trangThai IN (N'Hoàn tất'))
);

CREATE TABLE dbo.BienLai (
    maBienLai BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    maGiaoDich BIGINT NOT NULL UNIQUE,
    maHoaDon BIGINT NOT NULL,
    soTien DECIMAL(12,2) NOT NULL,
    thoiDiemPhatHanh DATETIME2(0) NOT NULL CONSTRAINT dfBienLaiThoiDiem DEFAULT SYSDATETIME(),
    CONSTRAINT fkBienLaiGiaoDich FOREIGN KEY (maGiaoDich) REFERENCES dbo.GiaoDichThanhToan(maGiaoDich),
    CONSTRAINT fkBienLaiHoaDon FOREIGN KEY (maHoaDon) REFERENCES dbo.HoaDon(maHoaDon),
    CONSTRAINT ckBienLaiSoTien CHECK (soTien > 0)
);

-- Bốn tài khoản dùng cho demo, cùng mật khẩu hotel123 (BCrypt cost 12).
INSERT INTO dbo.NhanVien(maNhanVien,hoVaTen,matKhau,vaiTro,soDienThoai) VALUES
(N'FRONTDESK',N'Nguyễn Minh Lễ Tân',N'$2a$12$5gNPcR6X5sTK6KSqi4PPKOgq6sXai.z77eMBmEDToFQCbOmVNGoiO',N'Lễ tân',N'0902000001'),
(N'MANAGER',N'Hoàng Minh Quản',N'$2a$12$5gNPcR6X5sTK6KSqi4PPKOgq6sXai.z77eMBmEDToFQCbOmVNGoiO',N'Quản lý',N'0902000006'),
(N'HOUSEKEEP',N'Trần Thị Buồng Phòng',N'$2a$12$5gNPcR6X5sTK6KSqi4PPKOgq6sXai.z77eMBmEDToFQCbOmVNGoiO',N'Buồng phòng/Dịch vụ',N'0902000002'),
(N'ACCOUNTING',N'Phạm Thị Kế Toán',N'$2a$12$5gNPcR6X5sTK6KSqi4PPKOgq6sXai.z77eMBmEDToFQCbOmVNGoiO',N'Kế toán',N'0902000004');

INSERT INTO dbo.LoaiPhong(maLoaiPhong,ten,giaTheoNgay,moTa) VALUES
(N'STD',N'Tiêu chuẩn',1100000,N'Phòng 28 m², một giường đôi, hướng thành phố.'),
(N'DLX',N'Cao cấp',1650000,N'Phòng 34 m², giường Queen, bồn tắm và minibar.'),
(N'SUT',N'Suite',2600000,N'Phòng 52 m², giường King và khu vực tiếp khách.'),
(N'VIP',N'VIP Suite',4200000,N'Phòng 76 m², giường King, phòng khách riêng và ban công.');

INSERT INTO dbo.Phong(maPhong,maLoaiPhong,tang,trangThai,moTa) VALUES
(N'101',N'STD',1,N'Sẵn sàng',N'Phòng tiêu chuẩn'),
(N'102',N'STD',1,N'Sẵn sàng',N'Phòng tiêu chuẩn'),
(N'103',N'DLX',1,N'Sẵn sàng',N'Phòng cao cấp'),
(N'104',N'SUT',1,N'Sẵn sàng',N'Phòng suite'),
(N'105',N'VIP',1,N'Sẵn sàng',N'Phòng VIP suite'),
(N'201',N'DLX',2,N'Sẵn sàng',N'Phòng cao cấp'),
(N'202',N'STD',2,N'Sẵn sàng',N'Phòng tiêu chuẩn'),
(N'203',N'STD',2,N'Sẵn sàng',N'Phòng tiêu chuẩn'),
(N'204',N'SUT',2,N'Sẵn sàng',N'Phòng suite'),
(N'205',N'VIP',2,N'Sẵn sàng',N'Phòng VIP suite'),
(N'301',N'SUT',3,N'Sẵn sàng',N'Phòng suite'),
(N'302',N'STD',3,N'Sẵn sàng',N'Phòng tiêu chuẩn'),
(N'303',N'STD',3,N'Sẵn sàng',N'Phòng tiêu chuẩn'),
(N'304',N'DLX',3,N'Sẵn sàng',N'Phòng cao cấp'),
(N'305',N'VIP',3,N'Sẵn sàng',N'Phòng VIP suite'),
(N'401',N'DLX',4,N'Sẵn sàng',N'Phòng cao cấp'),
(N'402',N'STD',4,N'Sẵn sàng',N'Phòng tiêu chuẩn'),
(N'403',N'STD',4,N'Sẵn sàng',N'Phòng tiêu chuẩn'),
(N'404',N'SUT',4,N'Sẵn sàng',N'Phòng suite'),
(N'405',N'VIP',4,N'Sẵn sàng',N'Phòng VIP suite'),
(N'501',N'VIP',5,N'Sẵn sàng',N'Phòng VIP suite'),
(N'502',N'STD',5,N'Sẵn sàng',N'Phòng tiêu chuẩn'),
(N'503',N'STD',5,N'Sẵn sàng',N'Phòng tiêu chuẩn'),
(N'504',N'DLX',5,N'Sẵn sàng',N'Phòng cao cấp'),
(N'505',N'SUT',5,N'Sẵn sàng',N'Phòng suite');

INSERT INTO dbo.DichVu(maDichVu,ten,gia,donViTinh,moTa) VALUES
(N'BREAKFAST',N'Bữa sáng tại phòng',180000,N'suất',N'Bữa sáng phục vụ tại phòng.'),
(N'LAUNDRY',N'Giặt ủi',90000,N'kg',N'Nhận và trả đồ giặt tại phòng.'),
(N'EXTRABED',N'Giường phụ',250000,N'đêm',N'Bổ sung giường phụ trong phòng.'),
(N'DINNER',N'Bữa tối set menu',450000,N'suất',N'Bữa tối theo thực đơn của nhà hàng.'),
(N'SPA60',N'Massage thư giãn 60 phút',650000,N'lần',N'Liệu trình massage thư giãn trong 60 phút.'),
(N'SPA30',N'Massage chân 30 phút',350000,N'lần',N'Liệu trình chăm sóc chân trong 30 phút.'),
(N'AIRPORT',N'Đưa đón sân bay',350000,N'chuyến',N'Xe riêng đưa đón giữa khách sạn và sân bay.'),
(N'SHUTTLE',N'Xe đưa đón trung tâm',150000,N'chuyến',N'Xe đưa đón khách đến các điểm trong trung tâm.'),
(N'POOL',N'Vé hồ bơi',120000,N'lượt',N'Sử dụng hồ bơi trong ngày.'),
(N'MEETING',N'Phòng họp nhỏ',1200000,N'giờ',N'Phòng họp riêng, phù hợp nhóm nhỏ.');

-- Một ngày mẫu có khách đang ở, khách đến, lịch sắp tới và dịch vụ đang dùng.
-- Ngày lấy theo giờ máy chủ để bộ demo luôn khớp với ngày vận hành hiện tại.
INSERT INTO dbo.KhachLuuTru(hoVaTen,soDienThoai,email,soGiayToTuyThan) VALUES
(N'Nguyễn Minh Anh',N'0900000101',N'minhanh@example.test',N'DEMO000101'),
(N'Trần Quốc Bảo',N'0900000102',N'quocbao@example.test',N'DEMO000102'),
(N'Lê Thu Hà',N'0900000103',N'thuha@example.test',N'DEMO000103'),
(N'Phạm Gia Hân',N'0900000104',N'giahan@example.test',N'DEMO000104'),
(N'Võ Đức Long',N'0900000105',N'duclong@example.test',N'DEMO000105'),
(N'Đặng Ngọc Mai',N'0900000106',N'ngocmai@example.test',N'DEMO000106');

DECLARE @ngayDemo DATE = CONVERT(DATE,SYSDATETIME());
DECLARE @phieu101 BIGINT, @phieu201 BIGINT, @phieu302 BIGINT;
DECLARE @phieu202 BIGINT, @phieu303 BIGINT, @phieu401 BIGINT;

INSERT INTO dbo.PhieuDatPhong(maKhachLuuTru,maNhanVien,thoiDiemDat,thoiDiemNhanPhongThucTe,trangThai,ghiChu)
VALUES ((SELECT maKhachLuuTru FROM dbo.KhachLuuTru WHERE soDienThoai=N'0900000101'),N'FRONTDESK',
        DATEADD(DAY,-2,DATEADD(HOUR,10,CONVERT(DATETIME2(0),@ngayDemo))),
        DATEADD(HOUR,14,DATEADD(DAY,-1,CONVERT(DATETIME2(0),@ngayDemo))),N'Đang ở',N'Demo lễ tân: khách trả phòng hôm nay.');
SET @phieu101=SCOPE_IDENTITY();
INSERT INTO dbo.ChiTietDatPhong(maPhieuDatPhong,maPhong,thoiDiemNhanPhong,thoiDiemTraPhong,giaTheoNgayDaChot)
VALUES (@phieu101,N'101',DATEADD(HOUR,14,DATEADD(DAY,-1,CONVERT(DATETIME2(0),@ngayDemo))),
        DATEADD(HOUR,12,CONVERT(DATETIME2(0),@ngayDemo)),1100000);

INSERT INTO dbo.PhieuDatPhong(maKhachLuuTru,maNhanVien,thoiDiemDat,thoiDiemNhanPhongThucTe,trangThai,ghiChu)
VALUES ((SELECT maKhachLuuTru FROM dbo.KhachLuuTru WHERE soDienThoai=N'0900000102'),N'FRONTDESK',
        DATEADD(DAY,-3,DATEADD(HOUR,11,CONVERT(DATETIME2(0),@ngayDemo))),
        DATEADD(HOUR,15,DATEADD(DAY,-1,CONVERT(DATETIME2(0),@ngayDemo))),N'Đang ở',N'Demo lễ tân: đang lưu trú.');
SET @phieu201=SCOPE_IDENTITY();
INSERT INTO dbo.ChiTietDatPhong(maPhieuDatPhong,maPhong,thoiDiemNhanPhong,thoiDiemTraPhong,giaTheoNgayDaChot)
VALUES (@phieu201,N'201',DATEADD(HOUR,14,DATEADD(DAY,-1,CONVERT(DATETIME2(0),@ngayDemo))),
        DATEADD(HOUR,12,DATEADD(DAY,1,CONVERT(DATETIME2(0),@ngayDemo))),1650000);

INSERT INTO dbo.PhieuDatPhong(maKhachLuuTru,maNhanVien,thoiDiemDat,thoiDiemNhanPhongThucTe,trangThai,ghiChu)
VALUES ((SELECT maKhachLuuTru FROM dbo.KhachLuuTru WHERE soDienThoai=N'0900000103'),N'FRONTDESK',
        DATEADD(DAY,-4,DATEADD(HOUR,9,CONVERT(DATETIME2(0),@ngayDemo))),
        DATEADD(HOUR,15,DATEADD(DAY,-2,CONVERT(DATETIME2(0),@ngayDemo))),N'Đang ở',N'Demo lễ tân: đang lưu trú.');
SET @phieu302=SCOPE_IDENTITY();
INSERT INTO dbo.ChiTietDatPhong(maPhieuDatPhong,maPhong,thoiDiemNhanPhong,thoiDiemTraPhong,giaTheoNgayDaChot)
VALUES (@phieu302,N'302',DATEADD(HOUR,14,DATEADD(DAY,-2,CONVERT(DATETIME2(0),@ngayDemo))),
        DATEADD(HOUR,12,DATEADD(DAY,1,CONVERT(DATETIME2(0),@ngayDemo))),1100000);

INSERT INTO dbo.PhieuDatPhong(maKhachLuuTru,maNhanVien,thoiDiemDat,trangThai,ghiChu)
VALUES ((SELECT maKhachLuuTru FROM dbo.KhachLuuTru WHERE soDienThoai=N'0900000104'),N'FRONTDESK',
        DATEADD(DAY,-2,DATEADD(HOUR,13,CONVERT(DATETIME2(0),@ngayDemo))),N'Đã xác nhận',N'Demo lễ tân: khách dự kiến đến hôm nay.');
SET @phieu202=SCOPE_IDENTITY();
INSERT INTO dbo.ChiTietDatPhong(maPhieuDatPhong,maPhong,thoiDiemNhanPhong,thoiDiemTraPhong,giaTheoNgayDaChot)
VALUES (@phieu202,N'202',DATEADD(HOUR,15,CONVERT(DATETIME2(0),@ngayDemo)),
        DATEADD(HOUR,12,DATEADD(DAY,1,CONVERT(DATETIME2(0),@ngayDemo))),1100000);

INSERT INTO dbo.PhieuDatPhong(maKhachLuuTru,maNhanVien,thoiDiemDat,trangThai,ghiChu)
VALUES ((SELECT maKhachLuuTru FROM dbo.KhachLuuTru WHERE soDienThoai=N'0900000105'),N'FRONTDESK',
        DATEADD(DAY,-1,DATEADD(HOUR,16,CONVERT(DATETIME2(0),@ngayDemo))),N'Đã xác nhận',N'Demo lễ tân: khách dự kiến đến hôm nay.');
SET @phieu303=SCOPE_IDENTITY();
INSERT INTO dbo.ChiTietDatPhong(maPhieuDatPhong,maPhong,thoiDiemNhanPhong,thoiDiemTraPhong,giaTheoNgayDaChot)
VALUES (@phieu303,N'303',DATEADD(HOUR,16,CONVERT(DATETIME2(0),@ngayDemo)),
        DATEADD(HOUR,12,DATEADD(DAY,2,CONVERT(DATETIME2(0),@ngayDemo))),1100000);

INSERT INTO dbo.PhieuDatPhong(maKhachLuuTru,maNhanVien,thoiDiemDat,trangThai,ghiChu)
VALUES ((SELECT maKhachLuuTru FROM dbo.KhachLuuTru WHERE soDienThoai=N'0900000106'),N'FRONTDESK',
        DATEADD(DAY,-1,DATEADD(HOUR,17,CONVERT(DATETIME2(0),@ngayDemo))),N'Đã xác nhận',N'Demo lễ tân: khách dự kiến đến ngày mai.');
SET @phieu401=SCOPE_IDENTITY();
INSERT INTO dbo.ChiTietDatPhong(maPhieuDatPhong,maPhong,thoiDiemNhanPhong,thoiDiemTraPhong,giaTheoNgayDaChot)
VALUES (@phieu401,N'401',DATEADD(HOUR,15,DATEADD(DAY,1,CONVERT(DATETIME2(0),@ngayDemo))),
        DATEADD(HOUR,12,DATEADD(DAY,3,CONVERT(DATETIME2(0),@ngayDemo))),1650000);

INSERT INTO dbo.SuDungDichVu(maPhieuDatPhong,maDichVu,soLuong,donGia,thoiDiem) VALUES
(@phieu201,N'BREAKFAST',2,180000,DATEADD(HOUR,8,CONVERT(DATETIME2(0),@ngayDemo))),
(@phieu201,N'LAUNDRY',2,90000,DATEADD(HOUR,9,CONVERT(DATETIME2(0),@ngayDemo))),
(@phieu302,N'SPA60',1,650000,DATEADD(DAY,-1,DATEADD(HOUR,17,CONVERT(DATETIME2(0),@ngayDemo))));

-- Hóa đơn chờ thu khớp lượt trả phòng hôm nay: một đêm phòng tiêu chuẩn, chưa dùng dịch vụ.
INSERT INTO dbo.HoaDon(maPhieuDatPhong,tienPhong,tienDichVu,tongTien,trangThai)
VALUES (@phieu101,1100000,0,1100000,N'Chưa thanh toán');

UPDATE dbo.Phong SET trangThai=N'Đang có khách' WHERE maPhong IN (N'101',N'201',N'302');
UPDATE dbo.Phong SET trangThai=N'Cần dọn' WHERE maPhong=N'404';

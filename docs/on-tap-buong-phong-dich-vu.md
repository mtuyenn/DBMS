# Code ôn tập — Buồng phòng / dịch vụ

Dữ liệu bổ sung, SQL chạy thử và kết quả mong đợi: [Bài thực hành buồng phòng / dịch vụ](test-buong-phong-dich-vu.md).

Phân quyền giao diện hiện tại: Buồng phòng/Dịch vụ quản lý danh mục, xem tổng hợp theo lượt lưu trú và xem chi tiết gồm dòng đã ghi/đã hủy; không ghi/hủy sử dụng. Lễ tân ghi/hủy dịch vụ trên chi tiết phòng, quản lý vẫn giữ quyền giám sát. Các procedure ghi/hủy bên dưới vẫn thuộc nội dung SQL bạn học, nhưng được gọi bởi luồng lễ tân. Tổng hợp màn hình đọc vwThongKeDichVuDatPhong, view gọi đủ ba function tính số dòng, tổng lượng và tổng tiền. Java chỉ ghép lịch sử chi tiết. API danh sách phòng lấy các phòng Cần dọn/Đang dọn qua vwPhongCanDon; vẫn giữ phòng Sẵn sàng/Đang có khách qua vwPhongSoDo để tổng quan đầy đủ.

Bản trích nguyên định nghĩa từ migration hiện tại, dùng để đọc và copy học. Không phải migration mới; không chạy toàn bộ vào QLKS đang có các object này. Không bao gồm seed và các phần nghiệp vụ của nhóm khác.

Bảng trực tiếp: Phong, DichVu, SuDungDichVu, NhatKyKiemSoat. Bảng liên quan: LoaiPhong, NhanVien, KhachLuuTru, PhieuDatPhong, ChiTietDatPhong, HoaDon. Giữ thứ tự tạo bảng bên dưới để các khóa ngoại có bảng được tham chiếu trước.

Luồng dọn phòng: giao diện → RoomController → RoomService → RoomDatabase → uspCapNhatTrangThaiPhong → UPDATE Phong → trgGhiNhatKyTrangThaiPhong → NhatKyKiemSoat → trả kết quả.

Luồng ghi dịch vụ: giao diện → ServiceConsumptionController → ServiceConsumptionDatabase → uspGhiSuDungDichVu → INSERT SuDungDichVu → trgChotGiaDichVu → đọc vwSuDungDichVuChiTiet → trả kết quả.

## 1. Các bảng liên quan

Nguồn: `V1__baseline_schema.sql`.

### NhanVien

```sql
CREATE TABLE dbo.NhanVien (
    maNhanVien NVARCHAR(20) NOT NULL PRIMARY KEY,
    hoVaTen NVARCHAR(100) NOT NULL,
    matKhau NVARCHAR(100) NOT NULL,
    vaiTro NVARCHAR(30) NOT NULL,
    soDienThoai NVARCHAR(20) NOT NULL UNIQUE,
    dangHoatDong BIT NOT NULL CONSTRAINT dfNhanVienHoatDong DEFAULT 1,
    CONSTRAINT ckNhanVienVaiTro CHECK (vaiTro IN (N'Lễ tân', N'Quản lý', N'Buồng phòng/Dịch vụ', N'Kế toán'))
);
GO
```

### LoaiPhong

```sql
CREATE TABLE dbo.LoaiPhong (
    maLoaiPhong NVARCHAR(20) NOT NULL PRIMARY KEY,
    ten NVARCHAR(60) NOT NULL UNIQUE,
    giaTheoNgay DECIMAL(12,2) NOT NULL,
    moTa NVARCHAR(500) NULL,
    dangHoatDong BIT NOT NULL CONSTRAINT dfLoaiPhongHoatDong DEFAULT 1,
    CONSTRAINT ckLoaiPhongGia CHECK (giaTheoNgay >= 0)
);
GO
```

### NhatKyKiemSoat

```sql
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
GO
```

### KhachLuuTru

```sql
CREATE TABLE dbo.KhachLuuTru (
    maKhachLuuTru BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    hoVaTen NVARCHAR(100) NOT NULL,
    soDienThoai NVARCHAR(20) NOT NULL UNIQUE,
    email NVARCHAR(150) NULL,
    soGiayToTuyThan NVARCHAR(20) NOT NULL UNIQUE
);
GO
```

### Phong

```sql
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
GO
```

### PhieuDatPhong

```sql
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
GO
```

### ChiTietDatPhong

```sql
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
GO
```

### DichVu

```sql
CREATE TABLE dbo.DichVu (
    maDichVu NVARCHAR(20) NOT NULL PRIMARY KEY,
    ten NVARCHAR(100) NOT NULL UNIQUE,
    gia DECIMAL(12,2) NOT NULL,
    donViTinh NVARCHAR(30) NOT NULL CONSTRAINT dfDichVuDonVi DEFAULT N'lần',
    moTa NVARCHAR(300) NULL,
    dangHoatDong BIT NOT NULL CONSTRAINT dfDichVuHoatDong DEFAULT 1,
    CONSTRAINT ckDichVuGia CHECK (gia >= 0)
);
GO
```

### SuDungDichVu

```sql
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
GO
```

### HoaDon

```sql
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
GO
```

## 2. Ba function

Nguồn: `V3__functions.sql`.

### fnTinhTongTienDichVu

```sql
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
```

### fnDemDichVuDangDung

```sql
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
```

### fnTongSoLuongDichVuDangDung

```sql
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
```

## 3. Bốn view

Nguồn: `V4__views.sql`.

### vwDichVuQuangCao

```sql
CREATE VIEW dbo.vwDichVuQuangCao AS
SELECT maDichVu, ten, gia, donViTinh, moTa FROM dbo.DichVu WHERE dangHoatDong=1;
GO
```

### vwPhongCanDon

```sql
CREATE VIEW dbo.vwPhongCanDon AS
SELECT p.maPhong, p.tang, lp.ten AS tenLoaiPhong, p.moTa, p.trangThai
FROM dbo.Phong p JOIN dbo.LoaiPhong lp ON lp.maLoaiPhong=p.maLoaiPhong
WHERE p.trangThai=N'Cần dọn' OR p.trangThai=N'Đang dọn';
GO
```

### vwSuDungDichVuChiTiet

```sql
CREATE VIEW dbo.vwSuDungDichVuChiTiet AS
SELECT s.maSuDung,
       s.maPhieuDatPhong,
       k.hoVaTen AS tenKhach,
       s.maDichVu,
       d.ten AS tenDichVu,
       s.soLuong,
       s.donGia,
       s.soLuong * s.donGia AS thanhTien,
       s.thoiDiem,
       s.daHuy
FROM dbo.SuDungDichVu s
JOIN dbo.DichVu d ON d.maDichVu=s.maDichVu
JOIN dbo.PhieuDatPhong p ON p.maPhieuDatPhong=s.maPhieuDatPhong
JOIN dbo.KhachLuuTru k ON k.maKhachLuuTru=p.maKhachLuuTru;
GO
```

### vwThongKeDichVuDatPhong

```sql
CREATE VIEW dbo.vwThongKeDichVuDatPhong AS
SELECT p.maPhieuDatPhong, p.trangThai, k.hoVaTen AS tenKhach,
       dbo.fnDemDichVuDangDung(p.maPhieuDatPhong) AS soDongDichVu,
       dbo.fnTongSoLuongDichVuDangDung(p.maPhieuDatPhong) AS tongSoLuongDichVu,
       dbo.fnTinhTongTienDichVu(p.maPhieuDatPhong) AS tongTienDichVu
FROM dbo.PhieuDatPhong p
JOIN dbo.KhachLuuTru k ON k.maKhachLuuTru=p.maKhachLuuTru;
GO
```

## 4. Bốn stored procedure

Nguồn: `V5__stored_procedures.sql`.

### uspCapNhatTrangThaiPhong

```sql
CREATE PROCEDURE dbo.uspCapNhatTrangThaiPhong
    @maPhong NVARCHAR(20),
    @trangThai NVARCHAR(20),
    @actorId NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @trangThai NOT IN (N'Cần dọn', N'Đang dọn', N'Sẵn sàng')
        THROW 51408, N'Trạng thái không được phép cho Buồng phòng/Dịch vụ', 1;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Lấy cùng khóa phòng với uspNhanPhong để hai thao tác được xếp thứ tự.
        IF NOT EXISTS (
            SELECT 1
            FROM dbo.Phong WITH (UPDLOCK, HOLDLOCK)
            WHERE maPhong = @maPhong
        )
            THROW 51404, N'Không tìm thấy phòng', 1;

        -- Không cho đổi trạng thái vận hành khi booking còn đang ở.
        IF EXISTS (
            SELECT 1
            FROM dbo.ChiTietDatPhong AS c
            JOIN dbo.PhieuDatPhong AS p
              ON p.maPhieuDatPhong = c.maPhieuDatPhong
            WHERE c.maPhong = @maPhong
              AND p.trangThai = N'Đang ở'
        )
            THROW 51409, N'Phòng vẫn đang có khách', 1;

        -- Trigger dùng actorId để ghi người đổi trạng thái vào nhật ký.
        EXEC sys.sp_set_session_context @key = N'actorId', @value = @actorId;

        UPDATE dbo.Phong
        SET trangThai = @trangThai
        WHERE maPhong = @maPhong;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
            ROLLBACK TRANSACTION;

        THROW;
    END CATCH;
END;
GO
```

### uspLuuDichVu

```sql
CREATE PROCEDURE dbo.uspLuuDichVu
    @maDichVu NVARCHAR(20), @ten NVARCHAR(100), @gia DECIMAL(12,2),
    @donViTinh NVARCHAR(30), @moTa NVARCHAR(300)=NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM dbo.DichVu WHERE maDichVu=@maDichVu)
        UPDATE dbo.DichVu SET ten=@ten,gia=@gia,donViTinh=@donViTinh,moTa=@moTa WHERE maDichVu=@maDichVu;
    ELSE INSERT INTO dbo.DichVu(maDichVu,ten,gia,donViTinh,moTa) VALUES(@maDichVu,@ten,@gia,@donViTinh,@moTa);
END;
GO
```

### uspGhiSuDungDichVu

```sql
CREATE PROCEDURE dbo.uspGhiSuDungDichVu
    @maPhieuDatPhong BIGINT, @maDichVu NVARCHAR(20), @soLuong INT, @actorId NVARCHAR(20), @maSuDung BIGINT OUTPUT
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    IF NOT EXISTS (SELECT 1 FROM dbo.DichVu WHERE maDichVu=@maDichVu AND dangHoatDong=1)
        THROW 51411, N'Dịch vụ không hoạt động', 1;
    BEGIN TRY
        BEGIN TRANSACTION;
        IF NOT EXISTS (SELECT 1 FROM dbo.PhieuDatPhong WITH (UPDLOCK,HOLDLOCK)
                       WHERE maPhieuDatPhong=@maPhieuDatPhong AND trangThai=N'Đang ở')
            THROW 51410, N'Chỉ ghi dịch vụ cho lượt đang lưu trú', 1;
        IF EXISTS (SELECT 1 FROM dbo.HoaDon WHERE maPhieuDatPhong=@maPhieuDatPhong)
            THROW 51422, N'Không thể thêm dịch vụ sau khi lập hóa đơn', 1;
        INSERT INTO dbo.SuDungDichVu(maPhieuDatPhong,maDichVu,soLuong,donGia)
        SELECT @maPhieuDatPhong,maDichVu,@soLuong,gia FROM dbo.DichVu WHERE maDichVu=@maDichVu AND dangHoatDong=1;
        SET @maSuDung=SCOPE_IDENTITY();
        INSERT INTO dbo.NhatKyKiemSoat(maNhanVien,doiTuong,maDoiTuong,hanhDong,chiTiet)
        VALUES(@actorId,N'SuDungDichVu',CONVERT(NVARCHAR(50),@maSuDung),N'Ghi dịch vụ',CONCAT(N'Phiếu ',@maPhieuDatPhong,N', dịch vụ ',@maDichVu));
        COMMIT;
    END TRY
    BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH
END;
GO
```

### uspHuySuDungDichVu

```sql
CREATE PROCEDURE dbo.uspHuySuDungDichVu @maSuDung BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1 FROM dbo.SuDungDichVu s JOIN dbo.HoaDon h ON h.maPhieuDatPhong=s.maPhieuDatPhong
        WHERE s.maSuDung=@maSuDung
    ) THROW 51412, N'Không sửa dịch vụ của hóa đơn đã thanh toán', 1;
    UPDATE dbo.SuDungDichVu SET daHuy=1 WHERE maSuDung=@maSuDung AND daHuy=0;
    IF @@ROWCOUNT=0 THROW 51413, N'Không tìm thấy dịch vụ đang sử dụng', 1;
END;
GO
```

## 5. Hai trigger

Nguồn: `V6__triggers.sql`.

### trgGhiNhatKyTrangThaiPhong

```sql
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
```

### trgChotGiaDichVu

```sql
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
```

Ứng dụng hiện dùng trigger làm nơi ghi nhật ký đổi trạng thái phòng; Java không ghi thêm dòng nhật ký cho cùng thao tác. Giao diện không triển khai checklist, minibar hay chờ nghiệm thu. Khi SQL trả lỗi 51412, backend hiển thị “Không thể hủy dịch vụ sau khi lập hóa đơn”; thông báo gốc trong procedure được giữ nguyên để không thay đổi migration đã áp dụng.

## Điểm cần nhớ khi vấn đáp

- Procedure đổi trạng thái chỉ nhận Cần dọn, Đang dọn, Sẵn sàng; chặn cả ba nếu phòng có phiếu Đang ở. Không bắt buộc phải chuyển theo từng bước Cần dọn → Đang dọn → Sẵn sàng.
- UPDLOCK, HOLDLOCK giữ khóa kiểm tra phòng trong transaction để phối hợp với thao tác nhận phòng. COMMIT xác nhận; CATCH rollback khi còn transaction rồi THROW lại lỗi.
- SESSION_CONTEXT mang actorId cho trigger ghi nhật ký. inserted chứa giá trị mới, deleted chứa giá trị cũ. Trigger xử lý theo tập dòng, chỉ ghi khi trạng thái khác nhau.
- uspLuuDichVu thêm hoặc sửa danh mục theo mã; không ghi nhận khách sử dụng dịch vụ. CHECK và UNIQUE trong bảng vẫn áp dụng.
- uspGhiSuDungDichVu chỉ cho phiếu Đang ở, dịch vụ hoạt động và chưa có hóa đơn. Giá được lấy từ danh mục ngay khi INSERT; OUTPUT trả mã sử dụng qua SCOPE_IDENTITY().
- trgChotGiaDichVu chỉ lấy giá danh mục nếu đơn giá dòng vừa thêm bằng 0. Trigger AFTER INSERT không tự chạy lại khi chỉ sửa giá danh mục. Trigger này không cấm UPDATE đơn giá trực tiếp về sau.
- uspHuySuDungDichVu hủy mềm bằng daHuy=1; code chặn khi có bất kỳ hóa đơn nào, mặc dù thông báo lỗi ghi đã thanh toán. Procedure này không có khối transaction/khóa kiểm tra riêng như procedure ghi dịch vụ.
- Ba function cùng lọc daHuy=0: COUNT(*) đếm dòng, SUM(soLuong) cộng lượng, SUM(soLuong*donGia) cộng tiền. COUNT(*) không phải đếm số loại dịch vụ khác nhau. COALESCE đổi NULL thành 0.
- vwSuDungDichVuChiTiet vẫn chứa dòng đã hủy; truy vấn sử dụng phải lọc daHuy=0 nếu chỉ cần dòng còn hiệu lực. View thường lưu định nghĩa truy vấn, không phải một bản sao dữ liệu riêng.
- vwThongKeDichVuDatPhong gọi cả ba function theo từng phiếu. API /api/rooms dùng vwPhongCanDon cho phần phòng cần dọn/đang dọn và vwPhongSoDo cho thông tin bổ sung cùng các trạng thái khác.

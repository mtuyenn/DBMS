CREATE PROCEDURE dbo.uspLuuNhanVien
    @maNhanVien NVARCHAR(20), @hoVaTen NVARCHAR(100), @matKhau NVARCHAR(100)=NULL,
    @vaiTro NVARCHAR(30), @soDienThoai NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM dbo.NhanVien WHERE maNhanVien=@maNhanVien)
        UPDATE dbo.NhanVien SET hoVaTen=@hoVaTen, matKhau=COALESCE(@matKhau,matKhau), vaiTro=@vaiTro,
               soDienThoai=@soDienThoai WHERE maNhanVien=@maNhanVien;
    ELSE
    BEGIN
        IF @matKhau IS NULL THROW 51401, N'Nhân viên mới cần mật khẩu đã mã hóa', 1;
        INSERT INTO dbo.NhanVien(maNhanVien,hoVaTen,matKhau,vaiTro,soDienThoai)
        VALUES(@maNhanVien,@hoVaTen,@matKhau,@vaiTro,@soDienThoai);
    END
END;
GO

CREATE PROCEDURE dbo.uspDoiVaiTroNhanVien @maNhanVien NVARCHAR(20), @vaiTroMoi NVARCHAR(30), @actorId NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    DECLARE @vaiTroCu NVARCHAR(30)=(SELECT vaiTro FROM dbo.NhanVien WHERE maNhanVien=@maNhanVien);
    IF @vaiTroCu IS NULL THROW 51402, N'Không tìm thấy nhân viên', 1;
    BEGIN TRY
        BEGIN TRANSACTION;
        UPDATE dbo.NhanVien SET vaiTro=@vaiTroMoi WHERE maNhanVien=@maNhanVien;
        INSERT INTO dbo.NhatKyKiemSoat(maNhanVien,doiTuong,maDoiTuong,hanhDong,chiTiet)
        VALUES(@actorId,N'NhanVien',@maNhanVien,N'Đổi vai trò',CONCAT(@vaiTroCu,N' → ',@vaiTroMoi));
        COMMIT;
    END TRY
    BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH
END;
GO

CREATE PROCEDURE dbo.uspLuuLoaiPhong
    @maLoaiPhong NVARCHAR(20), @ten NVARCHAR(60), @giaTheoNgay DECIMAL(12,2), @moTa NVARCHAR(500)=NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM dbo.LoaiPhong WHERE maLoaiPhong=@maLoaiPhong)
        UPDATE dbo.LoaiPhong SET ten=@ten, giaTheoNgay=@giaTheoNgay, moTa=@moTa WHERE maLoaiPhong=@maLoaiPhong;
    ELSE INSERT INTO dbo.LoaiPhong(maLoaiPhong,ten,giaTheoNgay,moTa) VALUES(@maLoaiPhong,@ten,@giaTheoNgay,@moTa);
END;
GO

CREATE PROCEDURE dbo.uspLuuPhong
    @maPhong NVARCHAR(20), @maLoaiPhong NVARCHAR(20), @tang INT, @moTa NVARCHAR(300)=NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM dbo.Phong WHERE maPhong=@maPhong)
        UPDATE dbo.Phong SET maLoaiPhong=@maLoaiPhong,tang=@tang,moTa=@moTa WHERE maPhong=@maPhong;
    ELSE INSERT INTO dbo.Phong(maPhong,maLoaiPhong,tang,moTa) VALUES(@maPhong,@maLoaiPhong,@tang,@moTa);
END;
GO

-- LỄ TÂN: lưu khách, tạo đặt phòng, nhận phòng và hủy đặt phòng.

-- 1. Có mã khách tồn tại thì cập nhật; các trường hợp còn lại thì thêm mới.
-- OUTPUT trả mã khách cho API, để API dùng mã đó khi tạo phiếu đặt phòng.
CREATE PROCEDURE dbo.uspLuuKhachHang
    @maKhachLuuTru BIGINT = NULL OUTPUT,
    @hoVaTen NVARCHAR(100),
    @soDienThoai NVARCHAR(20),
    @email NVARCHAR(150) = NULL,
    @soGiayToTuyThan NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    -- Đã có mã khách trong bảng: sửa thông tin của khách đó.
    IF @maKhachLuuTru IS NOT NULL AND EXISTS (
        SELECT 1
        FROM dbo.KhachLuuTru
        WHERE maKhachLuuTru = @maKhachLuuTru
    )
    BEGIN
        UPDATE dbo.KhachLuuTru
        SET hoVaTen = @hoVaTen,
            soDienThoai = @soDienThoai,
            email = @email,
            soGiayToTuyThan = @soGiayToTuyThan
        WHERE maKhachLuuTru = @maKhachLuuTru;
    END
    ELSE
    BEGIN
        -- Chưa có mã hoặc mã không tồn tại: thêm một khách mới.
        INSERT INTO dbo.KhachLuuTru(hoVaTen, soDienThoai, email, soGiayToTuyThan)
        VALUES (@hoVaTen, @soDienThoai, @email, @soGiayToTuyThan);

        -- Lấy mã IDENTITY của dòng khách vừa thêm trong SP này.
        SET @maKhachLuuTru = SCOPE_IDENTITY();
    END;
END;
GO

-- 2. Tạo một phiếu đặt cho một phòng, đồng thời lưu giá phòng tại lúc đặt.
-- @maPhieuDatPhong OUTPUT trả mã phiếu vừa tạo cho nơi gọi.
CREATE PROCEDURE dbo.uspTaoDatPhong
    @maKhachLuuTru BIGINT,
    @maNhanVien NVARCHAR(20),
    @maPhong NVARCHAR(20),
    @thoiDiemNhan DATETIME2(0),
    @thoiDiemTra DATETIME2(0),
    @ghiChu NVARCHAR(500) = NULL,
    @maPhieuDatPhong BIGINT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    -- Bước 1: kiểm tra cả ngày và giờ. Giờ nhận không được trước thời điểm hiện tại.
    IF @thoiDiemTra <= @thoiDiemNhan OR @thoiDiemNhan < SYSDATETIME()
    BEGIN
        THROW 51403, N'Ngày nhận phải từ hôm nay và ngày trả phải sau ngày nhận', 1;
    END;

    BEGIN TRY
        -- Giữ khóa đến cuối transaction để hai lễ tân không cùng đặt trùng một phòng.
        SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
        BEGIN TRANSACTION;

        -- Bước 2: phòng phải tồn tại. UPDLOCK/HOLDLOCK giữ khóa phòng khi đang đặt.
        IF NOT EXISTS (
            SELECT 1
            FROM dbo.Phong WITH (UPDLOCK, HOLDLOCK)
            WHERE maPhong = @maPhong
        )
        BEGIN
            THROW 51404, N'Không tìm thấy phòng', 1;
        END;

        -- Bước 3: chặn lịch giao nhau của các phiếu đã xác nhận hoặc đang ở.
        -- Trùng lịch khi: nhận mới < trả cũ VÀ trả mới > nhận cũ.
        -- Hai lượt nối tiếp nhau (giờ nhận mới = giờ trả cũ) vẫn được phép.
        IF EXISTS (
            SELECT 1
            FROM dbo.ChiTietDatPhong chiTiet WITH (UPDLOCK, HOLDLOCK)
            JOIN dbo.PhieuDatPhong phieu ON phieu.maPhieuDatPhong = chiTiet.maPhieuDatPhong
            WHERE chiTiet.maPhong = @maPhong
              AND phieu.trangThai IN (N'Đã xác nhận', N'Đang ở')
              AND @thoiDiemNhan < chiTiet.thoiDiemTraPhong
              AND @thoiDiemTra > chiTiet.thoiDiemNhanPhong
        )
        BEGIN
            THROW 51405, N'Phòng đã có lượt đặt trùng thời gian', 1;
        END;

        -- Bước 4: thêm phiếu, rồi lấy mã vừa tạo để thêm chi tiết phòng.
        INSERT INTO dbo.PhieuDatPhong(maKhachLuuTru, maNhanVien, ghiChu)
        VALUES (@maKhachLuuTru, @maNhanVien, @ghiChu);

        SET @maPhieuDatPhong = SCOPE_IDENTITY();

        -- Lấy giá từ loại phòng rồi lưu vào chi tiết để giữ nguyên giá đã đặt.
        INSERT INTO dbo.ChiTietDatPhong(
            maPhieuDatPhong, maPhong, thoiDiemNhanPhong, thoiDiemTraPhong, giaTheoNgayDaChot
        )
        SELECT @maPhieuDatPhong, phong.maPhong, @thoiDiemNhan, @thoiDiemTra, loaiPhong.giaTheoNgay
        FROM dbo.Phong phong
        JOIN dbo.LoaiPhong loaiPhong ON loaiPhong.maLoaiPhong = phong.maLoaiPhong
        WHERE phong.maPhong = @maPhong;

        -- Bước 5: chỉ lưu khi cả phiếu và chi tiết đều thành công.
        COMMIT TRANSACTION;
        -- Trả mức cô lập về READ COMMITTED sau khi đặt xong.
        SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
        BEGIN
            ROLLBACK TRANSACTION;
        END;

        SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
        THROW;
    END CATCH;
END;
GO

-- 3. Nhận phòng: phiếu đã xác nhận -> đang ở; phòng sẵn sàng -> đang có khách.
-- @actorId là mã nhân viên đang thao tác, dùng để ghi nhật ký qua trigger.
CREATE PROCEDURE dbo.uspNhanPhong
    @maPhieuDatPhong BIGINT,
    @actorId NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @maPhong NVARCHAR(20);
    DECLARE @trangThaiPhong NVARCHAR(20);

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Bước 1: khóa phòng và đọc trạng thái trong cùng transaction.
        SELECT @maPhong = p.maPhong,
               @trangThaiPhong = p.trangThai
        FROM dbo.ChiTietDatPhong AS c
        JOIN dbo.Phong AS p WITH (UPDLOCK, HOLDLOCK)
          ON p.maPhong = c.maPhong
        WHERE c.maPhieuDatPhong = @maPhieuDatPhong;

        IF @maPhong IS NULL
            THROW 51406, N'Phiếu đặt không có chi tiết phòng', 1;

        IF @trangThaiPhong <> N'Sẵn sàng'
            THROW 51421, N'Phòng chưa sẵn sàng để nhận khách', 1;

        -- Bước 2: chỉ nhận booking đang được xác nhận.
        -- UPDLOCK ngăn hai thao tác cùng nhận một booking.
        UPDATE dbo.PhieuDatPhong WITH (UPDLOCK)
        SET trangThai = N'Đang ở',
            thoiDiemNhanPhongThucTe = SYSDATETIME()
        WHERE maPhieuDatPhong = @maPhieuDatPhong
          AND trangThai = N'Đã xác nhận';

        IF @@ROWCOUNT = 0
            THROW 51406, N'Phiếu đặt không ở trạng thái có thể nhận phòng', 1;

        -- Bước 3: cho trigger biết nhân viên đang thao tác.
        EXEC sys.sp_set_session_context @key = N'actorId', @value = @actorId;

        -- Bước 4: đổi trạng thái phòng trong cùng transaction.
        UPDATE dbo.Phong
        SET trangThai = N'Đang có khách'
        WHERE maPhong = @maPhong;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        -- Hủy các thay đổi nếu một bước bị lỗi.
        IF XACT_STATE() <> 0
            ROLLBACK TRANSACTION;

        -- Trả lỗi gốc về backend.
        THROW;
    END CATCH;
END;
GO
-- 4. Chỉ hủy phiếu đã xác nhận, chưa nhận phòng; giữ lại phiếu để tra cứu.
CREATE PROCEDURE dbo.uspHuyDatPhong
    @maPhieuDatPhong BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.PhieuDatPhong
    SET trangThai = N'Đã hủy'
    WHERE maPhieuDatPhong = @maPhieuDatPhong
      AND trangThai = N'Đã xác nhận';

    IF @@ROWCOUNT = 0
    BEGIN
        THROW 51407, N'Chỉ hủy được phiếu đặt chưa nhận phòng', 1;
    END;
END;
GO

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

-- KẾ TOÁN: lập hóa đơn, ghi nhận thanh toán, phát biên lai và hoàn tất trả phòng.

-- 1. Tạo hóa đơn cho một lượt lưu trú.
CREATE PROCEDURE dbo.uspLapHoaDon
    @maPhieuDatPhong BIGINT,
    @maHoaDon BIGINT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    -- Nếu lượt lưu trú đã có hóa đơn, trả lại mã đó.
    SELECT @maHoaDon = maHoaDon
    FROM dbo.HoaDon
    WHERE maPhieuDatPhong = @maPhieuDatPhong;

    IF @maHoaDon IS NOT NULL
        RETURN;

    DECLARE @tienPhong DECIMAL(12,2);
    DECLARE @tienDichVu DECIMAL(12,2);

    -- Cộng tiền phòng của lượt lưu trú.
    SELECT @tienPhong = SUM(
        dbo.fnTinhTienPhong(
            chiTiet.giaTheoNgayDaChot,
            chiTiet.thoiDiemNhanPhong,
            chiTiet.thoiDiemTraPhong
        )
    )
    FROM dbo.ChiTietDatPhong chiTiet
    WHERE chiTiet.maPhieuDatPhong = @maPhieuDatPhong;

    IF @tienPhong IS NULL
        THROW 51414, N'Không tìm thấy chi tiết phòng của phiếu', 1;

    -- Tính tiền dịch vụ bằng function đã có.
    SET @tienDichVu = dbo.fnTinhTongTienDichVu(@maPhieuDatPhong);

    -- Lưu hóa đơn và trả mã vừa tạo cho nơi gọi.
    INSERT INTO dbo.HoaDon(maPhieuDatPhong, tienPhong, tienDichVu, tongTien)
    VALUES (@maPhieuDatPhong, @tienPhong, @tienDichVu, @tienPhong + @tienDichVu);

    SET @maHoaDon = SCOPE_IDENTITY();
END;
GO

-- 2. Phát hành biên lai cho một giao dịch đã hoàn tất.
CREATE PROCEDURE dbo.uspPhatHanhBienLai
    @maGiaoDich BIGINT,
    @maBienLai BIGINT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @maHoaDon BIGINT;
    DECLARE @soTien DECIMAL(12,2);

    -- Đọc hóa đơn và số tiền từ giao dịch.
    SELECT @maHoaDon = maHoaDon,
           @soTien = soTien
    FROM dbo.GiaoDichThanhToan
    WHERE maGiaoDich = @maGiaoDich
      AND trangThai = N'Hoàn tất';

    IF @maHoaDon IS NULL
        THROW 51415, N'Giao dịch chưa hoàn tất', 1;

    INSERT INTO dbo.BienLai(maGiaoDich, maHoaDon, soTien)
    VALUES (@maGiaoDich, @maHoaDon, @soTien);

    SET @maBienLai = SCOPE_IDENTITY();
END;
GO

-- 3. Thu tiền, tạo giao dịch và biên lai trong cùng một transaction.
CREATE PROCEDURE dbo.uspGhiGiaoDichThanhToan
    @maHoaDon BIGINT,
    @soTien DECIMAL(12,2),
    @phuongThuc NVARCHAR(20),
    @maGiaoDich BIGINT OUTPUT,
    @maBienLai BIGINT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Khóa hóa đơn trong lúc thu tiền để tránh hai lần thu cùng lúc.
        IF NOT EXISTS (
            SELECT 1
            FROM dbo.HoaDon WITH (UPDLOCK, HOLDLOCK)
            WHERE maHoaDon = @maHoaDon
        )
            THROW 51416, N'Không tìm thấy hóa đơn', 1;

        -- Chỉ nhận số tiền dương và không vượt quá số dư.
        IF @soTien <= 0 OR @soTien > dbo.fnSoDuHoaDon(@maHoaDon)
            THROW 51417, N'Số tiền thu phải lớn hơn 0 và không vượt số dư', 1;

        INSERT INTO dbo.GiaoDichThanhToan(maHoaDon, soTien, phuongThuc)
        VALUES (@maHoaDon, @soTien, @phuongThuc);

        SET @maGiaoDich = SCOPE_IDENTITY();

        -- Mỗi giao dịch hoàn tất có một biên lai tương ứng.
        EXEC dbo.uspPhatHanhBienLai @maGiaoDich, @maBienLai OUTPUT;

        -- Đánh dấu hóa đơn đã thanh toán khi số dư bằng 0.
        IF dbo.fnSoDuHoaDon(@maHoaDon) = 0
        BEGIN
            UPDATE dbo.HoaDon
            SET trangThai = N'Đã thanh toán'
            WHERE maHoaDon = @maHoaDon;
        END;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
            ROLLBACK TRANSACTION;

        THROW;
    END CATCH;
END;
GO

-- 4. Khi trả phòng, thu đủ tiền rồi cập nhật hóa đơn, phiếu và trạng thái phòng.
CREATE PROCEDURE dbo.uspThanhToanTraPhong
    @maPhieuDatPhong BIGINT,
    @soTien DECIMAL(12,2),
    @phuongThuc NVARCHAR(20),
    @actorId NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @maHoaDon BIGINT;
    DECLARE @maGiaoDich BIGINT;
    DECLARE @maBienLai BIGINT;
    DECLARE @soDu DECIMAL(12,2);

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Chỉ trả phòng cho lượt khách đang ở.
        IF NOT EXISTS (
            SELECT 1
            FROM dbo.PhieuDatPhong WITH (UPDLOCK, HOLDLOCK)
            WHERE maPhieuDatPhong = @maPhieuDatPhong
              AND trangThai = N'Đang ở'
        )
            THROW 51418, N'Phiếu đặt không ở trạng thái trả phòng', 1;

        -- Lấy hóa đơn hiện có hoặc lập hóa đơn mới.
        EXEC dbo.uspLapHoaDon @maPhieuDatPhong, @maHoaDon OUTPUT;

        SET @soDu = dbo.fnSoDuHoaDon(@maHoaDon);

        -- Nếu còn nợ thì thu tiền qua procedure thanh toán.
        IF @soDu > 0
        BEGIN
            EXEC dbo.uspGhiGiaoDichThanhToan
                @maHoaDon,
                @soTien,
                @phuongThuc,
                @maGiaoDich OUTPUT,
                @maBienLai OUTPUT;
        END
        ELSE IF @soTien <> 0
        BEGIN
            THROW 51419, N'Hóa đơn đã được thanh toán', 1;
        END;

        -- Không hoàn tất trả phòng nếu hóa đơn vẫn còn nợ.
        IF dbo.fnSoDuHoaDon(@maHoaDon) <> 0
            THROW 51420, N'Trả phòng cần thanh toán đủ hóa đơn', 1;

        UPDATE dbo.HoaDon
        SET trangThai = N'Đã thanh toán'
        WHERE maHoaDon = @maHoaDon
          AND trangThai <> N'Đã thanh toán';

        UPDATE dbo.PhieuDatPhong
        SET trangThai = N'Đã trả phòng',
            thoiDiemTraPhongThucTe = SYSDATETIME()
        WHERE maPhieuDatPhong = @maPhieuDatPhong;

        -- Cho trigger biết nhân viên nào đã đổi trạng thái phòng.
        EXEC sys.sp_set_session_context @key = N'actorId', @value = @actorId;

        UPDATE phong
        SET trangThai = N'Cần dọn'
        FROM dbo.Phong phong
        JOIN dbo.ChiTietDatPhong chiTiet
            ON chiTiet.maPhong = phong.maPhong
        WHERE chiTiet.maPhieuDatPhong = @maPhieuDatPhong;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
            ROLLBACK TRANSACTION;

        THROW;
    END CATCH;
END;
GO

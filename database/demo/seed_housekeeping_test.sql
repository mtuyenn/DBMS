-- Dữ liệu bổ sung phục vụ học/vấn đáp Buồng phòng / dịch vụ, không tạo SQL object.
-- Chạy sau Flyway V1-V6 trên QLKS local. Không xóa dữ liệu cũ.
-- Chạy lại sẽ bỏ qua cả bộ; không khôi phục các thao tác bạn đã thực hành.
SET NOCOUNT ON;
SET XACT_ABORT ON;
IF DB_NAME() <> N'QLKS' THROW 55000, N'Chỉ chạy trên QLKS local', 1;
IF EXISTS (SELECT 1 FROM dbo.Phong WHERE maPhong LIKE N'HK9%')
BEGIN
    PRINT N'Bộ HK9 đã có; giữ nguyên dữ liệu thực hành.';
    RETURN;
END;
IF NOT EXISTS (SELECT 1 FROM dbo.NhanVien WHERE maNhanVien=N'HOUSEKEEP')
    THROW 55000, N'Cần cài dữ liệu V1 trước', 1;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT dbo.LoaiPhong(maLoaiPhong,ten,giaTheoNgay,moTa)
    VALUES(N'HKTEST',N'Loại phòng thực hành buồng phòng',500000,N'Dữ liệu test riêng');
    INSERT dbo.Phong(maPhong,maLoaiPhong,tang,trangThai,moTa) VALUES
    (N'HK901',N'HKTEST',9,N'Cần dọn',N'Test bắt đầu dọn'),
    (N'HK902',N'HKTEST',9,N'Đang dọn',N'Test hoàn tất dọn'),
    (N'HK903',N'HKTEST',9,N'Sẵn sàng',N'Test đổi trạng thái và trigger nhiều dòng'),
    (N'HK904',N'HKTEST',9,N'Đang có khách',N'Đang ở, chưa hóa đơn, có dịch vụ'),
    (N'HK905',N'HKTEST',9,N'Đang có khách',N'Đang ở, đã lập hóa đơn chưa thu'),
    (N'HK906',N'HKTEST',9,N'Sẵn sàng',N'Phiếu mới xác nhận'),
    (N'HK907',N'HKTEST',9,N'Đang có khách',N'Sẽ checkout và thanh toán trong seed'),
    (N'HK908',N'HKTEST',9,N'Sẵn sàng',N'Phiếu đã hủy'),
    (N'HK909',N'HKTEST',9,N'Đang có khách',N'Đang ở, chưa có dịch vụ');
    EXEC dbo.uspLuuDichVu N'HK_LAUNDRY',N'Giặt ủi theo kg',90000,N'kg',N'Test chốt giá';
    EXEC dbo.uspLuuDichVu N'HK_BREAKFAST',N'Ăn sáng',120000,N'suất',N'Test cộng số lượng';
    EXEC dbo.uspLuuDichVu N'HK_FREE',N'Nước miễn phí',0,N'chai',N'Test giá 0 hợp lệ';
    EXEC dbo.uspLuuDichVu N'HK_OFF',N'Dịch vụ ngừng',70000,N'lần',N'Test chặn dịch vụ ngừng';
    UPDATE dbo.DichVu SET dangHoatDong=0 WHERE maDichVu=N'HK_OFF';

    DECLARE @n INT=4, @kh BIGINT, @p BIGINT, @id BIGINT, @h BIGINT;
    DECLARE @room NVARCHAR(20), @status NVARCHAR(20), @phone NVARCHAR(20);
    DECLARE @today DATETIME2(0)=CONVERT(DATE,SYSDATETIME());
    WHILE @n<=9
    BEGIN
        SET @room=CONCAT(N'HK90',@n);
        SET @phone=CONCAT(N'099990000',@n);
        SET @status=CASE @n WHEN 6 THEN N'Đã xác nhận' WHEN 8 THEN N'Đã hủy' ELSE N'Đang ở' END;
        INSERT dbo.KhachLuuTru(hoVaTen,soDienThoai,email,soGiayToTuyThan)
        VALUES(CONCAT(N'Khách ',@room),@phone,CONCAT(@room,N'@example.test'),CONCAT(N'HKTEST',@n));
        SET @kh=SCOPE_IDENTITY();
        INSERT dbo.PhieuDatPhong(maKhachLuuTru,maNhanVien,thoiDiemNhanPhongThucTe,trangThai,ghiChu)
        VALUES(@kh,N'FRONTDESK',CASE WHEN @status=N'Đang ở' THEN DATEADD(HOUR,-10,@today) END,
               @status,CONCAT(N'HKTEST:',@room));
        SET @p=SCOPE_IDENTITY();
        INSERT dbo.ChiTietDatPhong(maPhieuDatPhong,maPhong,thoiDiemNhanPhong,thoiDiemTraPhong,giaTheoNgayDaChot)
        VALUES(@p,@room,DATEADD(HOUR,-10,@today),DATEADD(HOUR,12,@today),500000);
        IF @n=4
        BEGIN
            EXEC dbo.uspGhiSuDungDichVu @p,N'HK_LAUNDRY',2,N'HOUSEKEEP',@id OUTPUT;
            EXEC dbo.uspGhiSuDungDichVu @p,N'HK_BREAKFAST',3,N'HOUSEKEEP',@id OUTPUT;
            EXEC dbo.uspGhiSuDungDichVu @p,N'HK_LAUNDRY',1,N'HOUSEKEEP',@id OUTPUT;
            EXEC dbo.uspHuySuDungDichVu @id;
            -- Chưa hủy: 2 dòng, tổng lượng 5, tổng tiền 540.000.
        END;
        IF @n IN (5,7)
        BEGIN
            EXEC dbo.uspGhiSuDungDichVu @p,N'HK_LAUNDRY',1,N'HOUSEKEEP',@id OUTPUT;
            IF @n=5 EXEC dbo.uspLapHoaDon @p,@h OUTPUT;
            IF @n=7 EXEC dbo.uspThanhToanTraPhong @p,590000,N'Tiền mặt',N'FRONTDESK';
        END;
        SET @n+=1;
    END;
    COMMIT;
    PRINT N'Đã nạp HK901-HK909 và HK_*; phiếu thanh toán có đủ giao dịch, biên lai.';
END TRY
BEGIN CATCH
    IF XACT_STATE()<>0 ROLLBACK;
    THROW;
END CATCH;

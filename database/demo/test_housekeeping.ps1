param([string]$Server='.\SQLEXPRESS', [switch]$Seed)
$ErrorActionPreference='Stop'
$connection=New-Object System.Data.SqlClient.SqlConnection "Server=$Server;Database=QLKS;Integrated Security=true;Encrypt=false;TrustServerCertificate=true"
$connection.Open()
try {
    if ($Seed) {
        $command=$connection.CreateCommand()
        $command.CommandTimeout=120
        $command.CommandText=Get-Content (Join-Path $PSScriptRoot 'seed_housekeeping_test.sql') -Raw -Encoding UTF8
        [void]$command.ExecuteNonQuery()
        Write-Output 'Seed: OK (existing HK9 fixtures are preserved)'
    }
    $setup=@'
DECLARE @p4 BIGINT=(SELECT maPhieuDatPhong FROM dbo.PhieuDatPhong WHERE ghiChu=N'HKTEST:HK904');
DECLARE @p5 BIGINT=(SELECT maPhieuDatPhong FROM dbo.PhieuDatPhong WHERE ghiChu=N'HKTEST:HK905');
DECLARE @p6 BIGINT=(SELECT maPhieuDatPhong FROM dbo.PhieuDatPhong WHERE ghiChu=N'HKTEST:HK906');
DECLARE @p7 BIGINT=(SELECT maPhieuDatPhong FROM dbo.PhieuDatPhong WHERE ghiChu=N'HKTEST:HK907');
DECLARE @p8 BIGINT=(SELECT maPhieuDatPhong FROM dbo.PhieuDatPhong WHERE ghiChu=N'HKTEST:HK908');
DECLARE @p9 BIGINT=(SELECT maPhieuDatPhong FROM dbo.PhieuDatPhong WHERE ghiChu=N'HKTEST:HK909');
DECLARE @id BIGINT, @before BIGINT;
IF @p4 IS NULL OR @p9 IS NULL THROW 55000,N'Run seed first',1;
'@
    $cases=@(
        @{Name='Room: start cleaning and actor audit';Sql=@'
SELECT @before=COUNT(*) FROM dbo.NhatKyKiemSoat WHERE maDoiTuong=N'HK901';
EXEC dbo.uspCapNhatTrangThaiPhong N'HK901',N'Đang dọn',N'HOUSEKEEP';
IF NOT EXISTS(SELECT 1 FROM dbo.Phong WHERE maPhong=N'HK901' AND trangThai=N'Đang dọn') THROW 55000,N'Wrong status',1;
IF (SELECT COUNT(*) FROM dbo.NhatKyKiemSoat WHERE maDoiTuong=N'HK901')<>@before+1 THROW 55000,N'Missing audit',1;
IF NOT EXISTS(SELECT 1 FROM dbo.NhatKyKiemSoat WHERE maDoiTuong=N'HK901' AND maNhanVien=N'HOUSEKEEP' AND chiTiet=N'Cần dọn → Đang dọn') THROW 55000,N'Wrong audit',1;
'@},
        @{Name='Room: complete cleaning';Sql="EXEC dbo.uspCapNhatTrangThaiPhong N'HK902',N'Sẵn sàng',N'HOUSEKEEP'; IF EXISTS(SELECT 1 FROM dbo.vwPhongCanDon WHERE maPhong=N'HK902') THROW 55000,N'Still dirty',1;"},
        @{Name='Room: invalid status';Error=51408;Sql="EXEC dbo.uspCapNhatTrangThaiPhong N'HK901',N'Đang có khách',N'HOUSEKEEP';"},
        @{Name='Room: missing room';Error=51404;Sql="EXEC dbo.uspCapNhatTrangThaiPhong N'HK_NOT_FOUND',N'Cần dọn',N'HOUSEKEEP';"},
        @{Name='Room: occupied blocks ready';Error=51409;Sql="EXEC dbo.uspCapNhatTrangThaiPhong N'HK904',N'Sẵn sàng',N'HOUSEKEEP';"},
        @{Name='Room: occupied blocks cleaning too';Error=51409;Sql="EXEC dbo.uspCapNhatTrangThaiPhong N'HK904',N'Đang dọn',N'HOUSEKEEP';"},
        @{Name='Audit: no log for unchanged status';Sql="SELECT @before=COUNT(*) FROM dbo.NhatKyKiemSoat; UPDATE dbo.Phong SET trangThai=trangThai WHERE maPhong=N'HK903'; IF (SELECT COUNT(*) FROM dbo.NhatKyKiemSoat)<>@before THROW 55000,N'Extra audit',1;"},
        @{Name='Audit: handles multiple rows';Sql="EXEC sys.sp_set_session_context @key=N'actorId',@value=N'HOUSEKEEP'; SELECT @before=COUNT(*) FROM dbo.NhatKyKiemSoat; UPDATE dbo.Phong SET trangThai=N'Cần dọn' WHERE maPhong IN(N'HK902',N'HK903'); IF (SELECT COUNT(*) FROM dbo.NhatKyKiemSoat)<>@before+2 THROW 55000,N'Not set based',1;"},
        @{Name='Catalog: insert and update';Sql="EXEC dbo.uspLuuDichVu N'HK_NEW',N'Mới',10000,N'lần',NULL; EXEC dbo.uspLuuDichVu N'HK_NEW',N'Mới',20000,N'lần',NULL; IF (SELECT gia FROM dbo.DichVu WHERE maDichVu=N'HK_NEW')<>20000 THROW 55000,N'Upsert failed',1;"},
        @{Name='Catalog: negative price';Error=547;Sql="EXEC dbo.uspLuuDichVu N'HK_NEW',N'Âm',-1,N'lần',NULL;"},
        @{Name='Usage: create, output, price and audit';Sql=@'
EXEC dbo.uspGhiSuDungDichVu @p9,N'HK_LAUNDRY',2,N'HOUSEKEEP',@id OUTPUT;
IF @id IS NULL OR NOT EXISTS(SELECT 1 FROM dbo.SuDungDichVu WHERE maSuDung=@id AND donGia=90000 AND soLuong=2) THROW 55000,N'Bad usage',1;
IF NOT EXISTS(SELECT 1 FROM dbo.NhatKyKiemSoat WHERE doiTuong=N'SuDungDichVu' AND maDoiTuong=CONVERT(NVARCHAR(50),@id) AND maNhanVien=N'HOUSEKEEP') THROW 55000,N'Missing usage audit',1;
'@},
        @{Name='Usage: inactive service';Error=51411;Sql="EXEC dbo.uspGhiSuDungDichVu @p9,N'HK_OFF',1,N'HOUSEKEEP',@id OUTPUT;"},
        @{Name='Usage: missing service';Error=51411;Sql="EXEC dbo.uspGhiSuDungDichVu @p9,N'HK_MISSING',1,N'HOUSEKEEP',@id OUTPUT;"},
        @{Name='Usage: confirmed stay';Error=51410;Sql="EXEC dbo.uspGhiSuDungDichVu @p6,N'HK_LAUNDRY',1,N'HOUSEKEEP',@id OUTPUT;"},
        @{Name='Usage: checked-out stay';Error=51410;Sql="EXEC dbo.uspGhiSuDungDichVu @p7,N'HK_LAUNDRY',1,N'HOUSEKEEP',@id OUTPUT;"},
        @{Name='Usage: cancelled stay';Error=51410;Sql="EXEC dbo.uspGhiSuDungDichVu @p8,N'HK_LAUNDRY',1,N'HOUSEKEEP',@id OUTPUT;"},
        @{Name='Usage: missing stay';Error=51410;Sql="EXEC dbo.uspGhiSuDungDichVu -1,N'HK_LAUNDRY',1,N'HOUSEKEEP',@id OUTPUT;"},
        @{Name='Usage: invoice exists even unpaid';Error=51422;Sql="EXEC dbo.uspGhiSuDungDichVu @p5,N'HK_LAUNDRY',1,N'HOUSEKEEP',@id OUTPUT;"},
        @{Name='Usage: zero quantity';Error=547;Sql="EXEC dbo.uspGhiSuDungDichVu @p9,N'HK_LAUNDRY',0,N'HOUSEKEEP',@id OUTPUT;"},
        @{Name='Usage: negative quantity';Error=547;Sql="EXEC dbo.uspGhiSuDungDichVu @p9,N'HK_LAUNDRY',-1,N'HOUSEKEEP',@id OUTPUT;"},
        @{Name='Usage: free service';Sql="EXEC dbo.uspGhiSuDungDichVu @p9,N'HK_FREE',1,N'HOUSEKEEP',@id OUTPUT; IF (SELECT donGia FROM dbo.SuDungDichVu WHERE maSuDung=@id)<>0 THROW 55000,N'Wrong free price',1;"},
        @{Name='Cancel: soft delete changes totals';Sql="SELECT @id=MIN(maSuDung) FROM dbo.SuDungDichVu WHERE maPhieuDatPhong=@p4 AND daHuy=0 AND maDichVu=N'HK_LAUNDRY'; EXEC dbo.uspHuySuDungDichVu @id; IF dbo.fnTinhTongTienDichVu(@p4)<>360000 OR dbo.fnDemDichVuDangDung(@p4)<>1 OR dbo.fnTongSoLuongDichVuDangDung(@p4)<>3 THROW 55000,N'Bad cancellation totals',1; IF NOT EXISTS(SELECT 1 FROM dbo.SuDungDichVu WHERE maSuDung=@id AND daHuy=1) THROW 55000,N'Not soft deleted',1;"},
        @{Name='Cancel: already cancelled';Error=51413;Sql="SELECT @id=maSuDung FROM dbo.SuDungDichVu WHERE maPhieuDatPhong=@p4 AND daHuy=1; EXEC dbo.uspHuySuDungDichVu @id;"},
        @{Name='Cancel: missing usage';Error=51413;Sql="EXEC dbo.uspHuySuDungDichVu -1;"},
        @{Name='Cancel: unpaid invoice blocks';Error=51412;Sql="SELECT @id=maSuDung FROM dbo.SuDungDichVu WHERE maPhieuDatPhong=@p5; EXEC dbo.uspHuySuDungDichVu @id;"},
        @{Name='Cancel: paid invoice blocks';Error=51412;Sql="SELECT @id=maSuDung FROM dbo.SuDungDichVu WHERE maPhieuDatPhong=@p7; EXEC dbo.uspHuySuDungDichVu @id;"},
        @{Name='Functions: count rows vs quantity vs money';Sql="IF dbo.fnDemDichVuDangDung(@p4)<>2 OR dbo.fnTongSoLuongDichVuDangDung(@p4)<>5 OR dbo.fnTinhTongTienDichVu(@p4)<>540000 THROW 55000,N'Bad baseline aggregates',1;"},
        @{Name='Functions: empty stay returns zero';Sql="IF dbo.fnDemDichVuDangDung(@p9)<>0 OR dbo.fnTongSoLuongDichVuDangDung(@p9)<>0 OR dbo.fnTinhTongTienDichVu(@p9)<>0 THROW 55000,N'Bad empty aggregates',1;"},
        @{Name='Trigger: zero price defaults, explicit price preserved, multirow';Sql="INSERT dbo.SuDungDichVu(maPhieuDatPhong,maDichVu,soLuong,donGia) VALUES(@p9,N'HK_LAUNDRY',1,0),(@p9,N'HK_BREAKFAST',1,12345); IF NOT EXISTS(SELECT 1 FROM dbo.SuDungDichVu WHERE maPhieuDatPhong=@p9 AND donGia=90000) OR NOT EXISTS(SELECT 1 FROM dbo.SuDungDichVu WHERE maPhieuDatPhong=@p9 AND donGia=12345) THROW 55000,N'Bad trigger prices',1;"},
        @{Name='Price: old usage unchanged, new usage uses new price';Sql="EXEC dbo.uspLuuDichVu N'HK_LAUNDRY',N'Giặt ủi theo kg',100000,N'kg',NULL; IF dbo.fnTinhTongTienDichVu(@p4)<>540000 THROW 55000,N'History changed',1; EXEC dbo.uspGhiSuDungDichVu @p9,N'HK_LAUNDRY',1,N'HOUSEKEEP',@id OUTPUT; IF (SELECT donGia FROM dbo.SuDungDichVu WHERE maSuDung=@id)<>100000 THROW 55000,N'New price missing',1;"},
        @{Name='View: advertised active services';Sql="IF (SELECT COUNT(*) FROM dbo.vwDichVuQuangCao WHERE maDichVu LIKE N'HK[_]%')<>3 OR EXISTS(SELECT 1 FROM dbo.vwDichVuQuangCao WHERE maDichVu=N'HK_OFF') THROW 55000,N'Bad advertised view',1;"},
        @{Name='View: dirty and cleaning rooms only';Sql="IF (SELECT COUNT(*) FROM dbo.vwPhongCanDon WHERE maPhong LIKE N'HK9%')<>3 OR EXISTS(SELECT 1 FROM dbo.vwPhongCanDon WHERE maPhong=N'HK904') THROW 55000,N'Bad dirty view',1;"},
        @{Name='View: detail includes cancelled usage';Sql="IF (SELECT COUNT(*) FROM dbo.vwSuDungDichVuChiTiet WHERE maPhieuDatPhong=@p4)<>3 OR NOT EXISTS(SELECT 1 FROM dbo.vwSuDungDichVuChiTiet WHERE maPhieuDatPhong=@p4 AND daHuy=1 AND tenKhach=N'Khách HK904') THROW 55000,N'Bad detail view',1;"},
        @{Name='View: summary calls all three functions';Sql="IF NOT EXISTS(SELECT 1 FROM dbo.vwThongKeDichVuDatPhong WHERE maPhieuDatPhong=@p4 AND soDongDichVu=2 AND tongSoLuongDichVu=5 AND tongTienDichVu=540000) THROW 55000,N'Bad summary',1;"}
    )
    $passed=0; $failed=0
    foreach($case in $cases) {
        $command=$connection.CreateCommand()
        $command.CommandTimeout=30
        $command.CommandText="SET NOCOUNT ON; BEGIN TRANSACTION;`n"+$setup+"`n"+$case.Sql
        try {
            [void]$command.ExecuteNonQuery()
            if($case.Error) { throw "Expected SQL error $($case.Error), but operation succeeded" }
            $passed++; Write-Output "PASS $($case.Name)"
        } catch {
            $exception=$_.Exception
            while($exception.InnerException) {$exception=$exception.InnerException}
            $numbers=@(); if($exception -is [System.Data.SqlClient.SqlException]) {$numbers=@($exception.Errors | ForEach-Object Number)}
            if($case.Error -and $numbers -contains $case.Error) {
                $passed++; Write-Output "PASS $($case.Name) (expected $($case.Error))"
            } else {
                $failed++; Write-Output "FAIL $($case.Name): $($exception.Message)"
            }
        } finally {
            $cleanup=$connection.CreateCommand()
            $cleanup.CommandText="IF @@TRANCOUNT>0 ROLLBACK; EXEC sys.sp_set_session_context @key=N'actorId',@value=NULL;"
            [void]$cleanup.ExecuteNonQuery()
        }
    }
    Write-Output "RESULT: $passed passed, $failed failed. Each test rolled back; identity values may have gaps."
    if($failed) {throw 'Some tests failed. Fixtures may have been changed by manual practice.'}
} finally {$connection.Close()}

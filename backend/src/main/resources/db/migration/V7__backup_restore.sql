
CREATE OR ALTER PROCEDURE dbo.uspSaoLuuQLKS
AS
BEGIN
    SET NOCOUNT ON;

    IF DB_NAME() <> N'QLKS'
        THROW 51000, N'Hãy chọn database QLKS trước khi sao lưu.', 1;

    -- Đây là đường dẫn bên trong SQL Server Docker.
    -- Trên Windows, cùng file này nằm ở C:\Backup\QLKS.bak.
    DECLARE @FileTrongSQLServer NVARCHAR(260) = N'/var/opt/mssql/backup/QLKS.bak';
    DECLARE @FileTrenWindows NVARCHAR(260) = N'C:\Backup\QLKS.bak';

    -- Backup là chụp lại toàn bộ database vào một file.
    BACKUP DATABASE [QLKS]
    TO DISK = @FileTrongSQLServer
    WITH INIT, CHECKSUM, STATS = 10;

    -- Kiểm tra SQL Server đọc được file vừa tạo.
    RESTORE VERIFYONLY
    FROM DISK = @FileTrongSQLServer
    WITH CHECKSUM;

    SELECT @FileTrenWindows AS DuongDanFile,
           N'Sao lưu xong và file đọc được.' AS KetQua;
END;
GO

EXEC dbo.uspSaoLuuQLKS;

/*
    RESTORE (KHÔI PHỤC) QLKS TỪ FILE BACKUP
*/

USE master;
GO

IF DB_ID(N'QLKS') IS NULL
    THROW 51002, N'Không tìm thấy database QLKS để khôi phục.', 1;

BEGIN TRY
    ALTER DATABASE [QLKS] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;

    RESTORE DATABASE [QLKS]
    FROM DISK = N'/var/opt/mssql/backup/QLKS.bak'
    WITH REPLACE, CHECKSUM, RECOVERY, STATS = 10;

    ALTER DATABASE [QLKS] SET MULTI_USER;
END TRY
BEGIN CATCH
    ALTER DATABASE [QLKS] SET MULTI_USER;
    THROW;
END CATCH;
GO


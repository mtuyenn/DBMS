# SQL Server Flyway V1–V8

V7 và V8 là migration Flyway đúng quy ước version. V7 cài `dbo.uspSaoLuuQLKS`; chỉ khi gọi procedure trong SSMS thì mới tạo file `.bak`. File luôn là `C:\Backup\QLKS.bak`, lần chạy sau ghi đè file cũ. Cấu hình demo Docker nối thư mục này với `/var/opt/mssql/backup` trong SQL Server.

Các migration hiện có, mỗi thay đổi đặt vào file sở hữu:

| File | Nội dung | Số mục tiêu |
|---|---|---:|
| `V1__baseline_schema.sql` | 12 bảng, ràng buộc, seed | 12 bảng |
| `V2__indexes.sql` | Index độc lập | 8 |
| `V3__functions.sql` | Ba function cho mỗi role | 12 |
| `V4__views.sql` | Read model cho khách và bốn role | 17 |
| `V5__stored_procedures.sql` | Lệnh quản lý, booking, dịch vụ, checkout | 16 |
| `V6__triggers.sql` | Hai trigger cho mỗi role | 8 |
| `V7__backup_restore.sql` | Cài procedure tạo Full Backup tại `C:\Backup\QLKS.bak` | 1 procedure |
| `V8__phan_quyen.sql` | Tạo role `role_LeTan` và cấp quyền cho các thao tác lễ tân | 1 role demo |

V7 cài công cụ sao lưu, còn lệnh `EXEC dbo.uspSaoLuuQLKS;` mới tạo file `.bak`. V8 gom quyền vào Role để chỉ cần thêm User vào Role. Xem [hướng dẫn database demo](../../../../../../database/demo/README.md) để làm từng bước bằng SSMS.

16 SP được chia 4 mỗi nhóm: Quản lý (`uspLuuNhanVien`, `uspDoiVaiTroNhanVien`, `uspLuuLoaiPhong`, `uspLuuPhong`); Lễ tân (`uspLuuKhachHang`, `uspTaoDatPhong`, `uspNhanPhong`, `uspHuyDatPhong`); Buồng phòng/Dịch vụ (`uspCapNhatTrangThaiPhong`, `uspLuuDichVu`, `uspGhiSuDungDichVu`, `uspHuySuDungDichVu`); Kế toán (`uspLapHoaDon`, `uspPhatHanhBienLai`, `uspGhiGiaoDichThanhToan`, `uspThanhToanTraPhong`).

Mỗi role có ba function và hai trigger phục vụ nghiệp vụ riêng:

- **Lễ tân:** `fnSoDemLuuTru`, `fnTinhTienPhong`, `fnKiemTraPhongTrong`; `trgChotGiaPhong`, `trgKiemTraTrungLichDatPhong`.
- **Buồng phòng/Dịch vụ:** `fnTinhTongTienDichVu`, `fnDemDichVuDangDung`, `fnTongSoLuongDichVuDangDung`; `trgGhiNhatKyTrangThaiPhong`, `trgChotGiaDichVu`.
- **Kế toán:** `fnTongTienDaThu`, `fnSoDuHoaDon`, `fnTongTienTheoPhuongThuc`; `trgBaoVeHoaDonDaThanhToan`, `trgKiemTraTienBienLai`.
- **Quản lý:** `fnDemNhanVienHoatDongTheoVaiTro`, `fnDemPhongTheoTrangThai`, `fnDemLoaiPhongDangHoatDong`; `trgChanXoaNhanVien`, `trgBaoVeQuanLyCuoiCung`.

Các view `vwQuanLyTongQuan`, `vwThongKeDichVuDatPhong`, `vwDoanhThuTheoPhuongThuc` gom các function thành số liệu tra cứu theo role.

Một booking gắn với một phòng để giữ nghiệp vụ ngắn. `uspTaoDatPhong` kiểm tra giao lịch dưới khóa transaction. Checkout lập hóa đơn, thu đủ tiền, phát biên lai, kết thúc booking và chuyển phòng sang `Cần dọn` trong cùng transaction.

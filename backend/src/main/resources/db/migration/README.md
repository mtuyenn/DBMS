# SQL Server Flyway V1–V6

Giữ đúng sáu migration, mỗi thay đổi đặt vào file sở hữu:

| File | Nội dung | Số mục tiêu |
|---|---|---:|
| `V1__baseline_schema.sql` | 12 bảng, ràng buộc, seed | 12 bảng |
| `V2__indexes.sql` | Index độc lập | 8 |
| `V3__functions.sql` | Ba function cho mỗi role | 12 |
| `V4__views.sql` | Read model cho khách và bốn role | 16 |
| `V5__stored_procedures.sql` | Lệnh quản lý, booking, dịch vụ, checkout | 16 |
| `V6__triggers.sql` | Hai trigger cho mỗi role | 8 |

16 SP được chia 4 mỗi nhóm: Quản lý (`uspLuuNhanVien`, `uspDoiVaiTroNhanVien`, `uspLuuLoaiPhong`, `uspLuuPhong`); Lễ tân (`uspLuuKhachHang`, `uspTaoDatPhong`, `uspNhanPhong`, `uspHuyDatPhong`); Buồng phòng/Dịch vụ (`uspCapNhatTrangThaiPhong`, `uspLuuDichVu`, `uspGhiSuDungDichVu`, `uspHuySuDungDichVu`); Kế toán (`uspLapHoaDon`, `uspPhatHanhBienLai`, `uspGhiGiaoDichThanhToan`, `uspThanhToanTraPhong`).

Mỗi role có ba function và hai trigger phục vụ nghiệp vụ riêng:

- **Lễ tân:** `fnSoDemLuuTru`, `fnTinhTienPhong`, `fnKiemTraPhongTrong`; `trgChotGiaPhong`, `trgKiemTraTrungLichDatPhong`.
- **Buồng phòng/Dịch vụ:** `fnTinhTongTienDichVu`, `fnDemDichVuDangDung`, `fnTongSoLuongDichVuDangDung`; `trgGhiNhatKyTrangThaiPhong`, `trgChotGiaDichVu`.
- **Kế toán:** `fnTongTienDaThu`, `fnSoDuHoaDon`, `fnTongTienTheoPhuongThuc`; `trgBaoVeHoaDonDaThanhToan`, `trgKiemTraTienBienLai`.
- **Quản lý:** `fnDemNhanVienHoatDongTheoVaiTro`, `fnDemPhongTheoTrangThai`, `fnDemLoaiPhongDangHoatDong`; `trgChanXoaNhanVien`, `trgBaoVeQuanLyCuoiCung`.

Các view `vwQuanLyTongQuan`, `vwThongKeDichVuDatPhong`, `vwDoanhThuTheoPhuongThuc` gom các function thành số liệu tra cứu theo role.

Một booking gắn với một phòng để giữ nghiệp vụ ngắn. `uspTaoDatPhong` kiểm tra giao lịch dưới khóa transaction. Checkout lập hóa đơn, thu đủ tiền, phát biên lai, kết thúc booking và chuyển phòng sang `Cần dọn` trong cùng transaction.

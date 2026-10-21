-- V2: tám index độc lập phục vụ màn hình chính.
CREATE INDEX IX_Phong_Loai_TrangThai ON dbo.Phong(maLoaiPhong, trangThai);

CREATE INDEX IX_NhatKy_ThoiDiem ON dbo.NhatKyKiemSoat(thoiDiem DESC);

CREATE INDEX IX_KhachLuuTru_HoVaTen ON dbo.KhachLuuTru(hoVaTen);

CREATE INDEX IX_ChiTietDatPhong_Phong_Lich ON dbo.ChiTietDatPhong(maPhong, thoiDiemNhanPhong, thoiDiemTraPhong);

CREATE INDEX IX_SuDungDichVu_Phieu_ThoiDiem ON dbo.SuDungDichVu(maPhieuDatPhong, thoiDiem);

CREATE INDEX IX_SuDungDichVu_DichVu_ThoiDiem ON dbo.SuDungDichVu(maDichVu, thoiDiem);

CREATE INDEX IX_HoaDon_ThoiDiem_TrangThai ON dbo.HoaDon(thoiDiemLap, trangThai);

CREATE INDEX IX_GiaoDich_HoaDon_ThoiDiem ON dbo.GiaoDichThanhToan(maHoaDon, thoiDiem);

-- Loc danh sach dat phong theo trang thai va ghep voi khach/phong.
CREATE INDEX IX_PhieuDatPhong_TrangThai_Phieu
ON dbo.PhieuDatPhong(trangThai, maPhieuDatPhong)
INCLUDE (maKhachLuuTru, maNhanVien, thoiDiemDat);
GO

-- Tim nhanh cac phong sap den theo khoang thoi gian nhan phong.
CREATE INDEX IX_ChiTietDatPhong_ThoiDiemNhan_Phieu
ON dbo.ChiTietDatPhong(thoiDiemNhanPhong, maPhieuDatPhong)
INCLUDE (thoiDiemTraPhong, maPhong, giaTheoNgayDaChot);
GO

CREATE INDEX IX_ChiTietDatPhong_ThoiDiemTra_Phieu
ON dbo.ChiTietDatPhong(thoiDiemTraPhong, maPhieuDatPhong)
INCLUDE (thoiDiemNhanPhong, maPhong, giaTheoNgayDaChot);
GO

CREATE INDEX IX_ChiTietDatPhong_ThoiDiemNhanPhong
ON dbo.ChiTietDatPhong(thoiDiemNhanPhong);
GO

CREATE INDEX IX_ChiTietDatPhong_ThoiDiemTraPhong
ON dbo.ChiTietDatPhong(thoiDiemTraPhong);
GO
-- V2: tám index độc lập phục vụ màn hình chính.
CREATE INDEX IX_Phong_Loai_TrangThai ON dbo.Phong(maLoaiPhong, trangThai);

CREATE INDEX IX_NhatKy_ThoiDiem ON dbo.NhatKyKiemSoat(thoiDiem DESC);

CREATE INDEX IX_KhachLuuTru_HoVaTen ON dbo.KhachLuuTru(hoVaTen);

CREATE INDEX IX_ChiTietDatPhong_Phong_Lich ON dbo.ChiTietDatPhong(maPhong, thoiDiemNhanPhong, thoiDiemTraPhong);

CREATE INDEX IX_SuDungDichVu_Phieu_ThoiDiem ON dbo.SuDungDichVu(maPhieuDatPhong, thoiDiem);

CREATE INDEX IX_SuDungDichVu_DichVu_ThoiDiem ON dbo.SuDungDichVu(maDichVu, thoiDiem);

CREATE INDEX IX_HoaDon_ThoiDiem_TrangThai ON dbo.HoaDon(thoiDiemLap, trangThai);

CREATE INDEX IX_GiaoDich_HoaDon_ThoiDiem ON dbo.GiaoDichThanhToan(maHoaDon, thoiDiem);

CREATE NONCLUSTERED INDEX IX_PhieuDatPhong_TrangThai ON dbo.PhieuDatPhong(trangThai);
GO

CREATE INDEX IX_ChiTietDatPhong_ThoiDiemNhan ON dbo.ChiTietDatPhong(thoiDiemNhanPhong);
GO

CREATE INDEX IX_ChiTietDatPhong_ThoiDiemTraON ON dbo.ChiTietDatPhong(thoiDiemTraPhong);
GO

CREATE VIEW dbo.vwPhongQuangCao AS
SELECT p.maPhong,
       p.tang,
       p.trangThai,
       p.moTa,
       lp.maLoaiPhong,
       lp.ten AS tenLoaiPhong,
       lp.giaTheoNgay,
       lp.moTa AS moTaLoaiPhong
FROM dbo.Phong p
JOIN dbo.LoaiPhong lp ON lp.maLoaiPhong=p.maLoaiPhong
WHERE p.trangThai <> N'Đang dọn' AND lp.dangHoatDong=1;
GO

CREATE VIEW dbo.vwPhongSoDo AS
SELECT p.maPhong,
       p.tang,
       p.trangThai,
       p.moTa,
       lp.maLoaiPhong,
       lp.ten AS tenLoaiPhong,
       lp.giaTheoNgay,
       lp.dangHoatDong
FROM dbo.Phong p
JOIN dbo.LoaiPhong lp ON lp.maLoaiPhong=p.maLoaiPhong;
GO

CREATE VIEW dbo.vwDichVuQuangCao AS
SELECT maDichVu, ten, gia, donViTinh, moTa FROM dbo.DichVu WHERE dangHoatDong=1;
GO

CREATE VIEW dbo.vwDatPhongChiTiet AS
SELECT p.maPhieuDatPhong,
       p.trangThai,
       p.thoiDiemDat,
       p.thoiDiemNhanPhongThucTe,
       p.thoiDiemTraPhongThucTe,
       p.ghiChu,
       k.maKhachLuuTru,
       k.hoVaTen AS tenKhach,
       k.soDienThoai,
       nv.maNhanVien,
       nv.hoVaTen AS tenNhanVien,
       c.maPhong,
       c.thoiDiemNhanPhong,
       c.thoiDiemTraPhong,
       c.giaTheoNgayDaChot,
       ISNULL(c.giaTheoNgayDaChot, lp.giaTheoNgay) AS giaTheoNgay,
       lp.ten AS tenLoaiPhong,
       h.maHoaDon,
       ISNULL(dbo.fnSoDuHoaDon(h.maHoaDon), 0) AS soDuHoaDon
FROM dbo.PhieuDatPhong p
JOIN dbo.KhachLuuTru k ON k.maKhachLuuTru=p.maKhachLuuTru
JOIN dbo.NhanVien nv ON nv.maNhanVien=p.maNhanVien
JOIN dbo.ChiTietDatPhong c ON c.maPhieuDatPhong=p.maPhieuDatPhong
JOIN dbo.Phong phong ON phong.maPhong=c.maPhong
JOIN dbo.LoaiPhong lp ON lp.maLoaiPhong=phong.maLoaiPhong
LEFT JOIN dbo.HoaDon h ON h.maPhieuDatPhong=p.maPhieuDatPhong;
GO

CREATE VIEW dbo.vwHoSoKhachHang AS
SELECT k.maKhachLuuTru,
       k.hoVaTen,
       k.soGiayToTuyThan,
       k.soDienThoai,
       k.email,
       ISNULL(SUM(g.soTien), 0) AS tongChiTieu
FROM dbo.KhachLuuTru k
LEFT JOIN dbo.PhieuDatPhong p ON p.maKhachLuuTru=k.maKhachLuuTru
LEFT JOIN dbo.HoaDon h ON h.maPhieuDatPhong=p.maPhieuDatPhong
LEFT JOIN dbo.GiaoDichThanhToan g ON g.maHoaDon=h.maHoaDon AND g.trangThai=N'Hoàn tất'
GROUP BY k.maKhachLuuTru, k.hoVaTen, k.soGiayToTuyThan, k.soDienThoai, k.email;
GO

CREATE VIEW dbo.vwPhongCanDon AS
SELECT p.maPhong, p.tang, lp.ten AS tenLoaiPhong, p.moTa, p.trangThai
FROM dbo.Phong p JOIN dbo.LoaiPhong lp ON lp.maLoaiPhong=p.maLoaiPhong
WHERE p.trangThai=N'Cần dọn' OR p.trangThai=N'Đang dọn';
GO

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

CREATE VIEW dbo.vwHoaDonChiTiet AS
SELECT h.maHoaDon,
       h.maPhieuDatPhong,
       h.thoiDiemLap,
       h.tienPhong,
       h.tienDichVu,
       h.tongTien,
       h.trangThai,
       dbo.fnTongTienDaThu(h.maHoaDon) AS daThu,
       dbo.fnSoDuHoaDon(h.maHoaDon) AS conPhaiTra,
       k.hoVaTen AS tenKhach,
       k.soDienThoai,
       c.maPhong,
       p.maNhanVien
FROM dbo.HoaDon h
JOIN dbo.PhieuDatPhong p ON p.maPhieuDatPhong=h.maPhieuDatPhong
JOIN dbo.KhachLuuTru k ON k.maKhachLuuTru=p.maKhachLuuTru
JOIN dbo.ChiTietDatPhong c ON c.maPhieuDatPhong=p.maPhieuDatPhong;
GO

CREATE VIEW dbo.vwGiaoDichThanhToanChiTiet AS
SELECT g.maGiaoDich,
       g.maHoaDon,
       g.soTien,
       g.phuongThuc,
       g.thoiDiem,
       h.maPhieuDatPhong,
       h.tienDichVu,
       k.hoVaTen AS tenKhach
FROM dbo.GiaoDichThanhToan g
JOIN dbo.HoaDon h ON h.maHoaDon=g.maHoaDon
JOIN dbo.PhieuDatPhong p ON p.maPhieuDatPhong=h.maPhieuDatPhong
JOIN dbo.KhachLuuTru k ON k.maKhachLuuTru=p.maKhachLuuTru;
GO

CREATE VIEW dbo.vwGiaoDichChuaLapBienLai AS
SELECT g.maGiaoDich,
       g.maHoaDon,
       g.soTien,
       g.phuongThuc
FROM dbo.GiaoDichThanhToan g
LEFT JOIN dbo.BienLai b ON b.maGiaoDich=g.maGiaoDich
WHERE b.maBienLai IS NULL;
GO

CREATE VIEW dbo.vwDoanhThuTheoNgay AS
SELECT CONVERT(DATE,thoiDiem) AS ngay, SUM(soTien) AS doanhThu
FROM dbo.GiaoDichThanhToan
WHERE trangThai=N'Hoàn tất'
GROUP BY CONVERT(DATE,thoiDiem);
GO

CREATE VIEW dbo.vwNhatKyKiemSoat AS
SELECT n.maNhatKy, n.doiTuong, n.maDoiTuong, n.hanhDong, n.chiTiet,
       n.thoiDiem, nv.maNhanVien, nv.hoVaTen AS tenNhanVien
FROM dbo.NhatKyKiemSoat n
LEFT JOIN dbo.NhanVien nv ON nv.maNhanVien=n.maNhanVien;
GO

CREATE VIEW dbo.vwQuanLyTongQuan AS
SELECT dbo.fnDemNhanVienHoatDongTheoVaiTro(N'Lễ tân') AS soLeTan,
       dbo.fnDemNhanVienHoatDongTheoVaiTro(N'Quản lý') AS soQuanLy,
       dbo.fnDemNhanVienHoatDongTheoVaiTro(N'Buồng phòng/Dịch vụ') AS soBuongPhong,
       dbo.fnDemNhanVienHoatDongTheoVaiTro(N'Kế toán') AS soKeToan,
       dbo.fnDemPhongTheoTrangThai(N'Sẵn sàng') AS soPhongSanSang,
       dbo.fnDemPhongTheoTrangThai(N'Đang có khách') AS soPhongCoKhach,
       dbo.fnDemPhongTheoTrangThai(N'Cần dọn') AS soPhongCanDon,
       dbo.fnDemPhongTheoTrangThai(N'Đang dọn') AS soPhongDangDon,
       dbo.fnDemLoaiPhongDangHoatDong() AS soLoaiPhongDangHoatDong;
GO

CREATE VIEW dbo.vwTinhHinhLoaiPhong AS
SELECT lp.maLoaiPhong,
       lp.ten AS tenLoaiPhong,
       lp.giaTheoNgay,
       COUNT(p.maPhong) AS tongSoPhong,
       ISNULL(SUM(CASE WHEN p.trangThai=N'Đang có khách' THEN 1 ELSE 0 END),0) AS soPhongCoKhach,
       ISNULL(SUM(CASE WHEN p.trangThai=N'Sẵn sàng' THEN 1 ELSE 0 END),0) AS soPhongSanSang,
       ISNULL(SUM(CASE WHEN p.trangThai IN (N'Cần dọn',N'Đang dọn') THEN 1 ELSE 0 END),0) AS soPhongCanDon,
       ISNULL(SUM(CASE WHEN p.trangThai IN (N'Đang bảo trì',N'Ngừng sử dụng') THEN 1 ELSE 0 END),0) AS soPhongBaoTri,
       CAST(ISNULL(100.0 * SUM(CASE WHEN p.trangThai=N'Đang có khách' THEN 1 ELSE 0 END)
           / NULLIF(COUNT(p.maPhong),0),0) AS DECIMAL(5,2)) AS congSuatHienTai
FROM dbo.LoaiPhong lp
LEFT JOIN dbo.Phong p ON p.maLoaiPhong=lp.maLoaiPhong
WHERE lp.dangHoatDong=1
GROUP BY lp.maLoaiPhong,lp.ten,lp.giaTheoNgay;
GO

CREATE VIEW dbo.vwThongKeDichVuDatPhong AS
SELECT p.maPhieuDatPhong, p.trangThai, k.hoVaTen AS tenKhach,
       dbo.fnDemDichVuDangDung(p.maPhieuDatPhong) AS soDongDichVu,
       dbo.fnTongSoLuongDichVuDangDung(p.maPhieuDatPhong) AS tongSoLuongDichVu,
       dbo.fnTinhTongTienDichVu(p.maPhieuDatPhong) AS tongTienDichVu
FROM dbo.PhieuDatPhong p
JOIN dbo.KhachLuuTru k ON k.maKhachLuuTru=p.maKhachLuuTru;
GO

CREATE VIEW dbo.vwDoanhThuTheoPhuongThuc AS
SELECT p.phuongThuc, dbo.fnTongTienTheoPhuongThuc(p.phuongThuc) AS doanhThu
FROM (VALUES (N'Tiền mặt'),(N'Thẻ'),(N'Chuyển khoản')) p(phuongThuc);
GO

CREATE VIEW dbo.vwBienLai AS
SELECT b.maBienLai,
       b.maHoaDon,
       b.maGiaoDich,
       b.soTien,
       b.thoiDiemPhatHanh,
       g.phuongThuc,
       h.maPhieuDatPhong,
       k.hoVaTen AS tenKhach
FROM dbo.BienLai b
JOIN dbo.GiaoDichThanhToan g ON g.maGiaoDich=b.maGiaoDich
JOIN dbo.HoaDon h ON h.maHoaDon=b.maHoaDon
JOIN dbo.PhieuDatPhong p ON p.maPhieuDatPhong=h.maPhieuDatPhong
JOIN dbo.KhachLuuTru k ON k.maKhachLuuTru=p.maKhachLuuTru;
GO

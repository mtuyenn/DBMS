package com.hospitality.mis.dao.management;

import com.hospitality.mis.dto.management.ManagementReportDtos;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

/** Đọc các báo cáo quản lý từ read-model views trong V4. */
@Repository
public class ManagementReportDatabase {
    private final JdbcTemplate jdbc;

    public ManagementReportDatabase(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public ManagementReportDtos.Overview overview() {
        return jdbc.queryForObject(
                "SELECT soLeTan,soQuanLy,soBuongPhong,soKeToan,soPhongSanSang,soPhongCoKhach,"
                        + "soPhongCanDon,soPhongDangDon,soLoaiPhongDangHoatDong FROM dbo.vwQuanLyTongQuan",
                (r, n) -> new ManagementReportDtos.Overview(r.getInt("soLeTan"),r.getInt("soQuanLy"),
                        r.getInt("soBuongPhong"),r.getInt("soKeToan"),r.getInt("soPhongSanSang"),
                        r.getInt("soPhongCoKhach"),r.getInt("soPhongCanDon"),r.getInt("soPhongDangDon"),
                        r.getInt("soLoaiPhongDangHoatDong")));
    }

    public List<ManagementReportDtos.RoomTypePerformance> roomTypePerformance() {
        return jdbc.query(
                "SELECT maLoaiPhong,tenLoaiPhong,giaTheoNgay,tongSoPhong,soPhongCoKhach,soPhongSanSang,"
                        + "soPhongCanDon,soPhongBaoTri,congSuatHienTai FROM dbo.vwTinhHinhLoaiPhong "
                        + "ORDER BY congSuatHienTai DESC,maLoaiPhong",
                (r, n) -> new ManagementReportDtos.RoomTypePerformance(r.getString("maLoaiPhong"),
                        r.getString("tenLoaiPhong"),r.getBigDecimal("giaTheoNgay"),r.getInt("tongSoPhong"),
                        r.getInt("soPhongCoKhach"),r.getInt("soPhongSanSang"),r.getInt("soPhongCanDon"),
                        r.getInt("soPhongBaoTri"),r.getBigDecimal("congSuatHienTai")));
    }
}

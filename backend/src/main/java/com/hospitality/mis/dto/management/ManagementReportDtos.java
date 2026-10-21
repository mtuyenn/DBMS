package com.hospitality.mis.dto.management;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import java.math.BigDecimal;

/** Dữ liệu báo cáo dành cho màn hình quản lý. */
public final class ManagementReportDtos {
    private ManagementReportDtos() {}

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record Overview(
            int soLeTan,
            int soQuanLy,
            int soBuongPhong,
            int soKeToan,
            int soPhongSanSang,
            int soPhongCoKhach,
            int soPhongCanDon,
            int soPhongDangDon,
            int soLoaiPhongDangHoatDong) {}

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record RoomTypePerformance(
            String maLoaiPhong,
            String tenLoaiPhong,
            BigDecimal giaTheoNgay,
            int tongSoPhong,
            int soPhongCoKhach,
            int soPhongSanSang,
            int soPhongCanDon,
            int soPhongBaoTri,
            BigDecimal congSuatHienTai) {}
}

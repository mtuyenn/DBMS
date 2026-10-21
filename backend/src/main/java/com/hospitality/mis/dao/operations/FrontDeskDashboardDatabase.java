package com.hospitality.mis.dao.operations;

import com.hospitality.mis.dao.room.RoomStatusConverter;
import com.hospitality.mis.dto.operations.FrontDeskDashboardDtos;
import com.hospitality.mis.entity.reservation.ReservationStatus;
import com.hospitality.mis.persistence.VietnameseEnumConverters.ReservationStatusConverter;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/** Read models for the front desk dashboard, using the single-room stay tables. */
@Repository
public class FrontDeskDashboardDatabase {
    private final JdbcTemplate jdbc;
    private final ReservationStatusConverter statuses = new ReservationStatusConverter();
    private final RoomStatusConverter roomStatuses = new RoomStatusConverter();

    public FrontDeskDashboardDatabase(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public long count(String query, ReservationStatus status, LocalDateTime from, LocalDateTime to) {
        String filter = " FROM dbo.vwDatPhongChiTiet d "
                + "WHERE (? IS NULL OR d.trangThai=?) AND (? IS NULL OR LOWER(d.tenKhach) LIKE LOWER(?) "
                + "OR d.soDienThoai LIKE ? OR d.maPhong LIKE ?) "
                + "AND ((d.thoiDiemNhanPhong>=? AND d.thoiDiemNhanPhong<?) OR (d.thoiDiemTraPhong>=? AND d.thoiDiemTraPhong<?) "
                + "OR d.trangThai=N'Đang ở')";
        String like = like(query);
        return jdbc.queryForObject("SELECT COUNT(DISTINCT d.maPhieuDatPhong)" + filter, Long.class,
                statuses.convertToDatabaseColumn(status), statuses.convertToDatabaseColumn(status),
                like, like, like, like, from, to, from, to);
    }

    public List<FrontDeskDashboardDtos.ReservationItem> items(String query, ReservationStatus status, String bucket,
            LocalDateTime from, LocalDateTime to, int page, int size) {
        String bucketFilter = switch (bucket) {
            case "ARRIVALS" -> "d.trangThai=N'Đã xác nhận' AND d.thoiDiemNhanPhong>=? AND d.thoiDiemNhanPhong<?";
            case "DEPARTURES" -> "d.trangThai=N'Đang ở' AND d.thoiDiemTraPhong>=? AND d.thoiDiemTraPhong<?";
            case "CURRENT" -> "d.trangThai=N'Đang ở'";
            case "UPCOMING" -> "d.trangThai=N'Đã xác nhận'";
            case "UNPAID_DEPOSITS" -> "1=0";
            case "INVOICE_BALANCES" -> "d.maHoaDon IS NOT NULL AND d.soDuHoaDon>0";
            default -> "((d.thoiDiemNhanPhong>=? AND d.thoiDiemNhanPhong<?) OR (d.thoiDiemTraPhong>=? AND d.thoiDiemTraPhong<?) OR d.trangThai=N'Đang ở')";
        };
        String base = " FROM dbo.vwDatPhongChiTiet d WHERE " + bucketFilter
                + " AND (? IS NULL OR d.trangThai=?) AND (? IS NULL OR LOWER(d.tenKhach) LIKE LOWER(?) OR d.soDienThoai LIKE ? OR d.maPhong LIKE ?)";
        String like = like(query);
        java.util.ArrayList<Object> args = new java.util.ArrayList<>();
        if (bucket.equals("ARRIVALS") || bucket.equals("DEPARTURES")) { args.add(from); args.add(to); }
        else if (bucket.equals("ALL")) { args.add(from); args.add(to); args.add(from); args.add(to); }
        args.add(statuses.convertToDatabaseColumn(status)); args.add(statuses.convertToDatabaseColumn(status));
        args.add(like); args.add(like); args.add(like); args.add(like);
        args.add((long) page * size); args.add(size);
        return jdbc.query("SELECT d.maPhieuDatPhong,d.maKhachLuuTru,d.tenKhach,d.soDienThoai,d.trangThai,"
                        + "d.thoiDiemNhanPhong,d.thoiDiemTraPhong,d.maPhong,d.soDuHoaDon "
                        + base + " ORDER BY d.thoiDiemNhanPhong,d.maPhieuDatPhong OFFSET ? ROWS FETCH NEXT ? ROWS ONLY",
                (r, n) -> new FrontDeskDashboardDtos.ReservationItem(r.getLong(1), r.getLong(2), r.getString(3),
                        r.getString(4), statuses.convertToEntityAttribute(r.getString(5)),
                        r.getTimestamp(6).toLocalDateTime(), r.getTimestamp(7).toLocalDateTime(), List.of(r.getString(8)),
                        BigDecimal.ZERO, "NOT_REQUIRED", r.getBigDecimal(9)), args.toArray());
    }

    public List<FrontDeskDashboardDtos.RoomSummary> rooms() {
        return jdbc.query("SELECT maPhong,maPhong AS tenPhong,trangThai,maLoaiPhong,tenLoaiPhong,tang,giaTheoNgay "
                        + "FROM dbo.vwPhongSoDo ORDER BY maPhong",
                (r, n) -> new FrontDeskDashboardDtos.RoomSummary(r.getString(1), r.getString(2),
                        roomStatuses.convertToEntityAttribute(r.getString(3)), r.getString(4), r.getString(5),
                        r.getObject(6, Integer.class), r.getBigDecimal(7), null));
    }

    public List<FrontDeskDashboardDtos.IncidentItem> incidents(int page, int size) { return List.of(); }

    private static String like(String query) {
        return query == null || query.isBlank() ? null : "%" + query.trim() + "%";
    }
}

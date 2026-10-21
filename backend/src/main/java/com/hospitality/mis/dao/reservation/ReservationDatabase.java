package com.hospitality.mis.dao.reservation;
import com.hospitality.mis.common.exception.DomainException;

import com.hospitality.mis.dto.reservation.ReservationDtos;
import com.hospitality.mis.entity.reservation.ReservationStatus;
import com.hospitality.mis.persistence.VietnameseEnumConverters.ReservationStatusConverter;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.math.BigDecimal;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
@Repository
public class ReservationDatabase {
    public record Snapshot(ReservationDtos.Response response) { }
    public record Document(String type, long id) { }
    private static final String QUERY = "SELECT d.maPhieuDatPhong,d.maKhachLuuTru,d.maNhanVien,d.thoiDiemDat,d.trangThai,"
            + "d.thoiDiemNhanPhongThucTe,d.thoiDiemTraPhongThucTe,d.maPhong,d.thoiDiemNhanPhong,d.thoiDiemTraPhong,"
            + "d.giaTheoNgay,d.tenLoaiPhong,d.ghiChu FROM dbo.vwDatPhongChiTiet d";
    private static final BigDecimal ZERO = BigDecimal.ZERO;
    private final JdbcTemplate jdbc;
    private final ReservationStatusConverter statuses = new ReservationStatusConverter();
    public ReservationDatabase(JdbcTemplate jdbc, com.fasterxml.jackson.databind.ObjectMapper ignored) { this.jdbc = jdbc; }
    public Snapshot get(long id) {
        return load(" WHERE d.maPhieuDatPhong=?", id).stream().findFirst()
                .orElseThrow(() -> error("RESERVATION_NOT_FOUND", "Không tìm thấy đặt phòng"));
    }
    public ReservationDtos.PageResponse page(String actor, ReservationStatus status, Long guest, int page, int size) {
        String where = " FROM dbo.vwDatPhongChiTiet d WHERE (? IS NULL OR d.maNhanVien=?) "
                + "AND (? IS NULL OR d.trangThai=?) AND (? IS NULL OR d.maKhachLuuTru=?)";
        String dbStatus = statuses.convertToDatabaseColumn(status);
        Object[] args = {actor, actor, dbStatus, dbStatus, guest, guest};
        long count = jdbc.queryForObject("SELECT COUNT_BIG(DISTINCT d.maPhieuDatPhong)" + where, Long.class, args);
        List<Object> pageArgs = new ArrayList<>(java.util.Arrays.asList(args));
        pageArgs.add((long) page * size);
        pageArgs.add(size);
        var ids = jdbc.queryForList("SELECT d.maPhieuDatPhong" + where
                + " GROUP BY d.maPhieuDatPhong,d.thoiDiemDat ORDER BY d.thoiDiemDat DESC,d.maPhieuDatPhong DESC "
                + "OFFSET ? ROWS FETCH NEXT ? ROWS ONLY", Long.class, pageArgs.toArray());
        return new ReservationDtos.PageResponse(ids.stream().map(this::get).map(Snapshot::response).toList(),
                page, size, count, (int) Math.ceil((double) count / size));
    }
    public List<Document> documents(long reservation) {
        return jdbc.query("SELECT N'INVOICE',maHoaDon FROM dbo.HoaDon WHERE maPhieuDatPhong=?",
                (r, n) -> new Document(r.getString(1), r.getLong(2)), reservation);
    }
    public long create(long guest, String employee, Long customer, ReservationDtos.RentalType rental, BigDecimal deposit,
            String key, List<ReservationDtos.RoomStay> rooms, String actor, LocalDateTime now,
            ReservationStatus initial, com.hospitality.mis.entity.reservation.CustomerPaymentMethod method,
            String paymentCode, LocalDateTime expires, String email, String source) {
        if (rooms == null || rooms.size() != 1) {
            throw error("ONE_ROOM_PER_STAY", "Mỗi lượt lưu trú chỉ hỗ trợ một phòng");
        }
        var stay = rooms.get(0);
        try {
            Long id = jdbc.queryForObject("DECLARE @id BIGINT; EXEC dbo.uspTaoDatPhong ?,?,?,?,?,NULL,@id OUTPUT; SELECT @id",
                    Long.class, guest, employee, stay.roomId(), stay.expectedCheckIn(), stay.expectedCheckOut());
            return id;
        } catch (DataAccessException error) {
            throw translate(error);
        }
    }
    public void command(String command, long id, Long customer, List<ReservationDtos.RoomStay> rooms,
            LocalDateTime at, LocalDateTime newIn, BigDecimal deposit, String reason, String service,
            Integer quantity, String paymentCode, LocalDateTime expires, String actor, LocalDateTime now) {
        try {
            switch (command) {
                case "check-in" -> jdbc.update("EXEC dbo.uspNhanPhong ?,?", id, actor);
                case "cancel" -> jdbc.update("EXEC dbo.uspHuyDatPhong ?", id);
                case "service" -> jdbc.queryForObject("DECLARE @id BIGINT; EXEC dbo.uspGhiSuDungDichVu ?,?,?,?,@id OUTPUT; SELECT @id",
                        Long.class, id, service, quantity == null ? 1 : quantity, actor);
                default -> throw error("COMMAND_NOT_SUPPORTED", "Thao tác đặt phòng không nằm trong phạm vi hỗ trợ: " + command);
            }
        } catch (DataAccessException error) {
            throw translate(error);
        }
    }
    private List<Snapshot> load(String where, Object... args) {
        var rows = jdbc.queryForList(QUERY + where + " ORDER BY d.thoiDiemDat DESC,d.maPhieuDatPhong DESC,d.maPhong", args);
        return rows.stream().map(row -> {
            long id = ((Number) row.get("maPhieuDatPhong")).longValue();
            var checkIn = date(row.get("thoiDiemNhanPhong"));
            var checkOut = date(row.get("thoiDiemTraPhong"));
            var actualIn = date(row.get("thoiDiemNhanPhongThucTe"));
            var actualOut = date(row.get("thoiDiemTraPhongThucTe"));
            String roomId = row.get("maPhong").toString();
            var line = new ReservationDtos.RoomLine(roomId, checkIn, checkOut, actualIn, actualOut);
            var serviceUsages = jdbc.query("SELECT maDichVu,tenDichVu,CONVERT(date,thoiDiem),soLuong,donGia,thanhTien "
                            + "FROM dbo.vwSuDungDichVuChiTiet WHERE maPhieuDatPhong=? AND daHuy=0 ORDER BY thoiDiem,tenDichVu",
                    (r, n) -> new ReservationDtos.ServiceUsageLine(r.getString(1), r.getString(2),
                            r.getDate(3).toLocalDate(), r.getInt(4), r.getBigDecimal(5), r.getBigDecimal(6)), id);
            var response = new ReservationDtos.Response(id, ((Number) row.get("maKhachLuuTru")).longValue(),
                    row.get("maNhanVien").toString(), statuses.convertToEntityAttribute(row.get("trangThai").toString()),
                    ReservationDtos.RentalType.PACKAGE, ZERO, date(row.get("thoiDiemDat")), actualIn, actualOut,
                    List.of(line), null, null, "DIRECT", ZERO, ZERO, ZERO, null, serviceUsages, null, null, null);
            return new Snapshot(response);
        }).toList();
    }
    private static LocalDateTime date(Object value) {
        return value == null ? null : ((java.sql.Timestamp) value).toLocalDateTime();
    }
    public static RuntimeException translate(DataAccessException error) {
        for (Throwable cause = error; cause != null; cause = cause.getCause()) {
            if (cause instanceof SQLException sql) {
                String code = switch (sql.getErrorCode()) {
                    case 51401 -> "INVALID_EMPLOYEE";
                    case 51403 -> "INVALID_INTERVAL";
                    case 51404, 51001 -> "ROOM_NOT_FOUND";
                    case 51405, 51002 -> "ROOM_NOT_AVAILABLE";
                    case 51406, 51407, 51410, 51412, 51413, 51414, 51418, 51419, 51421, 51422 -> "INVALID_STATE";
                    case 51411 -> "SERVICE_NOT_AVAILABLE";
                    default -> null;
                };
                if (code != null) return error(code, sql.getErrorCode() == 51412
                        ? "Không thể hủy dịch vụ sau khi lập hóa đơn" : sql.getMessage());
            }
        }
        return error;
    }
    private static DomainException error(String code, String message) { return new DomainException(code, message); }
}

package com.hospitality.mis.dao.room;

import com.hospitality.mis.common.exception.DomainException;
import com.hospitality.mis.dto.room.RoomAdminDtos;
import com.hospitality.mis.dto.room.RoomDtos;
import com.hospitality.mis.entity.room.RoomStatus;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

/** Room reads and operational commands against the small hotel schema. */
@Repository
public class RoomDatabase {
    public record Snapshot(String id, String name, String roomTypeId, String roomTypeName,
                           BigDecimal dailyPrice, Integer floor, RoomStatus status,
                           String workflowStatus, String description, long version) {
        public RoomDtos.Response response() {
            return new RoomDtos.Response(id, name, roomTypeId, roomTypeName, dailyPrice, floor, status, workflowStatus);
        }
        public RoomAdminDtos.Response admin() {
            return new RoomAdminDtos.Response(id, name, roomTypeId, roomTypeName, floor, description, status);
        }
    }

    private static final String COLUMNS = "SELECT maPhong,maPhong AS tenPhong,maLoaiPhong,tenLoaiPhong,giaTheoNgay,"
            + "tang,trangThai,trangThai,moTa,CAST(0 AS BIGINT)";
    private static final String SELECT = COLUMNS + " FROM dbo.vwPhongSoDo";
    // Cleaning rooms come from the housekeeping view; keep ready/occupied rooms
    // as well so the overview still displays the complete room inventory.
    private static final String SEARCH = COLUMNS + " FROM ("
            + "SELECT c.maPhong,c.tang,c.tenLoaiPhong,c.moTa,c.trangThai,"
            + "s.maLoaiPhong,s.giaTheoNgay,s.dangHoatDong "
            + "FROM dbo.vwPhongCanDon c JOIN dbo.vwPhongSoDo s ON s.maPhong=c.maPhong "
            + "UNION ALL SELECT maPhong,tang,tenLoaiPhong,moTa,trangThai,"
            + "maLoaiPhong,giaTheoNgay,dangHoatDong FROM dbo.vwPhongSoDo "
            + "WHERE trangThai NOT IN (N'Cần dọn',N'Đang dọn')) phong";
    private final JdbcTemplate jdbc;
    private final RoomStatusConverter statuses = new RoomStatusConverter();
    private final org.springframework.jdbc.core.RowMapper<Snapshot> rows = (r, n) -> new Snapshot(
            r.getString(1), r.getString(2), r.getString(3), r.getString(4), r.getBigDecimal(5),
            r.getObject(6, Integer.class), statuses.convertToEntityAttribute(r.getString(7)),
            r.getString(8), r.getString(9), r.getLong(10));

    public RoomDatabase(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public List<Snapshot> search(String type, RoomStatus status) {
        String code = statuses.convertToDatabaseColumn(status);
        return jdbc.query(SEARCH + " WHERE dangHoatDong=1 AND (? IS NULL OR maLoaiPhong=?) "
                + "AND (? IS NULL OR trangThai=?) ORDER BY maPhong", rows, type, type, code, code);
    }

    public Optional<Snapshot> find(String id) {
        return jdbc.query(SELECT + " WHERE maPhong=?", rows, id).stream().findFirst();
    }

    public Optional<RoomDtos.PriceQuote> priceQuote(String id, LocalDateTime from, LocalDateTime to) {
        var interval = sqlInterval(from, to);
        return jdbc.query("SELECT maPhong,tenLoaiPhong,giaTheoNgay,"
                        + "dbo.fnSoDemLuuTru(?,?) AS soDem,"
                        + "dbo.fnTinhTienPhong(giaTheoNgay,?,?) AS tongTienDuKien "
                        + "FROM dbo.vwPhongSoDo WHERE maPhong=? AND dangHoatDong=1",
                (r, n) -> new RoomDtos.PriceQuote(r.getString("maPhong"), r.getString("tenLoaiPhong"),
                        r.getBigDecimal("giaTheoNgay"), r.getInt("soDem"), r.getBigDecimal("tongTienDuKien")),
                interval[0], interval[1], interval[0], interval[1], id).stream().findFirst();
    }

    public Optional<Snapshot> lock(String id) { return find(id); }
    public void catalogLock() { }

    public boolean overlap(String id, LocalDateTime from, LocalDateTime to, LocalDateTime now) {
        var interval = sqlInterval(from, to);
        return !Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT dbo.fnKiemTraPhongTrong(?,?,?)", Boolean.class, id, interval[0], interval[1]));
    }

    public java.util.Map<String, Boolean> publicAvailability(String type, LocalDateTime from, LocalDateTime to, LocalDateTime now) {
        var interval = sqlInterval(from, to);
        java.util.Map<String, Boolean> result = new java.util.LinkedHashMap<>();
        jdbc.query("SELECT maPhong,dbo.fnKiemTraPhongTrong(maPhong,?,?) AS trong "
                        + "FROM dbo.vwPhongQuangCao WHERE (? IS NULL OR maLoaiPhong=?)",
                (org.springframework.jdbc.core.RowCallbackHandler) r -> result.put(r.getString(1), r.getBoolean(2)),
                interval[0], interval[1], type, type);
        return result;
    }

    private static LocalDateTime[] sqlInterval(LocalDateTime from, LocalDateTime to) {
        LocalDateTime sqlFrom = from.truncatedTo(ChronoUnit.SECONDS);
        LocalDateTime sqlTo = to.truncatedTo(ChronoUnit.SECONDS);
        if (!sqlTo.isAfter(sqlFrom)) sqlTo = sqlFrom.plusSeconds(1);
        return new LocalDateTime[]{sqlFrom, sqlTo};
    }

    public Snapshot status(Snapshot old, RoomStatus next, String actor) {
        try {
            jdbc.update("EXEC dbo.uspCapNhatTrangThaiPhong ?,?,?", old.id(), statuses.convertToDatabaseColumn(next),
                    actor);
        } catch (DataAccessException error) {
            throw translate(error);
        }
        return find(old.id()).orElseThrow();
    }

    public Snapshot status(Snapshot old, RoomStatus next, boolean technical, boolean management, LocalDateTime now) {
        return status(old, next, com.hospitality.mis.middleware.security.SecurityActor.currentActor());
    }

    public Snapshot admin(String command, String id, RoomAdminDtos.Request request, Long version) {
        if (!"create".equalsIgnoreCase(command) && !"update".equalsIgnoreCase(command)) {
            throw new DomainException("ROOM_COMMAND_NOT_SUPPORTED", "Thao tác phòng không được hỗ trợ");
        }
        try {
            jdbc.update("EXEC dbo.uspLuuPhong ?,?,?,?", id, request.roomTypeId(),
                    request.floor() == null ? 1 : request.floor(), request.description());
        } catch (DataAccessException error) {
            throw translate(error);
        }
        return find(id).orElseThrow();
    }

    private RuntimeException translate(DataAccessException error) {
        for (Throwable cause = error; cause != null; cause = cause.getCause()) {
            if (cause instanceof SQLException sql) {
                String code = switch (sql.getErrorCode()) {
                    case 51404 -> "ROOM_NOT_FOUND";
                    case 51408 -> "INVALID_ROOM_STATUS";
                    case 51409 -> "ROOM_OCCUPIED";
                    default -> null;
                };
                if (code != null) return new DomainException(code, sql.getMessage());
            }
        }
        return error;
    }
}

package com.hospitality.mis.dao.guest;
import com.hospitality.mis.common.exception.DomainException;
import com.hospitality.mis.dto.guest.GuestDtos;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
@Repository
public class GuestDatabase {
    public record Snapshot(GuestDtos.Response response, int completedStays, long version) { }
    private static final String SELECT = "SELECT maKhachLuuTru,hoVaTen,soGiayToTuyThan,soDienThoai,email,tongChiTieu "
            + "FROM dbo.vwHoSoKhachHang";
    private final JdbcTemplate jdbc;
    private final org.springframework.jdbc.core.RowMapper<Snapshot> rows = (r, n) -> {
        var response = new GuestDtos.Response(r.getLong(1), r.getString(2), r.getString(3),
                r.getString(4), r.getString(5), r.getBigDecimal(6));
        return new Snapshot(response, 0, 0L);
    };
    public GuestDatabase(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public Optional<Snapshot> find(Long id) {
        return jdbc.query(SELECT + " WHERE maKhachLuuTru=?", rows, id).stream().findFirst();
    }
    public void lockRegistration() { }
    public boolean phoneExists(String phone) {
        return jdbc.queryForObject("SELECT COUNT_BIG(*) FROM dbo.KhachLuuTru WHERE soDienThoai=?", Long.class, phone) > 0;
    }
    public boolean identityExists(String identity) {
        return jdbc.queryForObject("SELECT COUNT_BIG(*) FROM dbo.KhachLuuTru WHERE soGiayToTuyThan=?", Long.class, identity) > 0;
    }
    public List<GuestDtos.Response> search(String query) {
        String filter = query == null || query.isBlank() ? null : "%" + query.trim() + "%";
        return jdbc.query(SELECT + " WHERE (? IS NULL OR LOWER(hoVaTen) LIKE LOWER(?) OR soGiayToTuyThan LIKE ? "
                + "OR soDienThoai LIKE ?) ORDER BY hoVaTen,maKhachLuuTru", rows, filter, filter, filter, filter)
                .stream().map(Snapshot::response).toList();
    }
    public GuestDtos.Response create(GuestDtos.CreateRequest request) {
        try {
            Long id = jdbc.queryForObject("DECLARE @id BIGINT=NULL; "
                    + "EXEC dbo.uspLuuKhachHang @maKhachLuuTru=@id OUTPUT,@hoVaTen=?,@soDienThoai=?,@email=?,@soGiayToTuyThan=?; "
                    + "SELECT @id", Long.class, request.fullName(), request.phone(), request.email(), request.identityNumber());
            return find(id).orElseThrow().response();
        } catch (DataAccessException error) {
            throw translate(error);
        }
    }
    public GuestDtos.Response profile(Long id, String name, String identity, String email, String address,
                                      Integer year, long version) {
        throw new DomainException("GUEST_PROFILE_NOT_SUPPORTED", "Chỉ hỗ trợ thông tin khách trong phạm vi lưu trú");
    }
    public static RuntimeException translate(DataAccessException error) {
        for (Throwable cause = error; cause != null; cause = cause.getCause()) {
            if (cause instanceof SQLException sql) {
                String code = switch (sql.getErrorCode()) {
                    case 2627, 2601 -> "GUEST_PHONE_OR_IDENTITY_EXISTS";
                    case 52701 -> "GUEST_PHONE_EXISTS";
                    case 52702 -> "GUEST_IDENTITY_EXISTS";
                    case 52703 -> "GUEST_NOT_FOUND";
                    default -> null;
                };
                if (code != null) return new DomainException(code, sql.getMessage());
            }
        }
        return error;
    }
}

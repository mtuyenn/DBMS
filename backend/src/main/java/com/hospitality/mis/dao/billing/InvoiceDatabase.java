package com.hospitality.mis.dao.billing;

import com.hospitality.mis.common.exception.DomainException;
import com.hospitality.mis.dao.reservation.ReservationDatabase;
import com.hospitality.mis.dto.billing.InvoiceDtos;
import com.hospitality.mis.entity.billing.PaymentMethod;
import com.hospitality.mis.entity.billing.PaymentStatus;
import com.hospitality.mis.persistence.VietnameseEnumConverters.PaymentMethodConverter;
import com.hospitality.mis.persistence.VietnameseEnumConverters.PaymentStatusConverter;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/** Invoice reads and the atomic check-out transaction for the reduced schema. */
@Repository
public class InvoiceDatabase {
    public record Snapshot(InvoiceDtos.Response response, String employeeId, Long customerId) { }
    public record Deposit(long sourceId, BigDecimal amount) { }
    private static final BigDecimal ZERO = BigDecimal.ZERO;
    private static final String SELECT = "SELECT h.maHoaDon,h.maPhieuDatPhong,h.thoiDiemLap,h.tienPhong,h.tienDichVu,"
            + "h.trangThai,h.conPhaiTra,h.maNhanVien FROM dbo.vwHoaDonChiTiet h";
    private final JdbcTemplate jdbc;
    private final PaymentStatusConverter statuses = new PaymentStatusConverter();
    private final PaymentMethodConverter methods = new PaymentMethodConverter();
    private final org.springframework.jdbc.core.RowMapper<Snapshot> rows = (r, n) -> {
        BigDecimal room = r.getBigDecimal(4), services = r.getBigDecimal(5);
        var status = statuses.convertToEntityAttribute(r.getString(6));
        BigDecimal payable = r.getBigDecimal(7);
        var response = new InvoiceDtos.Response(r.getLong(1), r.getLong(2), r.getTimestamp(3).toLocalDateTime(),
                room, services, ZERO, ZERO, ZERO, ZERO, ZERO, ZERO,
                payable, null, status, false);
        return new Snapshot(response, r.getString(8), null);
    };

    public InvoiceDatabase(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public Snapshot get(long id) { return find("h.maHoaDon", id); }
    public Snapshot reservation(long id) { return find("h.maPhieuDatPhong", id); }

    private Snapshot find(String column, long id) {
        if (!"h.maHoaDon".equals(column) && !"h.maPhieuDatPhong".equals(column)) throw new IllegalArgumentException("column");
        return jdbc.query(SELECT + " WHERE " + column + "=?", rows, id).stream().findFirst()
                .orElseThrow(() -> new DomainException("INVOICE_NOT_FOUND", "Không tìm thấy hóa đơn"));
    }

    public void lock(long id) {
        jdbc.queryForObject("SELECT maHoaDon FROM dbo.HoaDon WITH (UPDLOCK,HOLDLOCK) WHERE maHoaDon=?", Long.class, id);
    }

    public Deposit deposit(long invoice) { throw new DomainException("DEPOSIT_NOT_SUPPORTED", "Không sử dụng tiền đặt cọc trong phạm vi hiện tại"); }

    public void command(String command, Long reservation, Long invoice, LocalDateTime at, PaymentMethod method,
            BigDecimal delta, String reason, String storedKey, String actor, Long approval, String fingerprint,
            Long customer, LocalDateTime now) {
        if (!"checkout".equals(command) || reservation == null || method == null) {
            throw new DomainException("BILLING_COMMAND_NOT_SUPPORTED", "Chỉ hỗ trợ thanh toán khi trả phòng");
        }
        try {
            jdbc.update("DECLARE @invoice BIGINT; EXEC dbo.uspLapHoaDon ?,@invoice OUTPUT; "
                    + "DECLARE @amount DECIMAL(12,2)=dbo.fnSoDuHoaDon(@invoice); "
                    + "EXEC dbo.uspThanhToanTraPhong ?,@amount,?,?", reservation, reservation,
                    methods.convertToDatabaseColumn(method), actor);
        } catch (org.springframework.dao.DataAccessException error) {
            for (Throwable cause = error; cause != null; cause = cause.getCause()) {
                if (cause instanceof SQLException sql && (sql.getErrorCode() == 51418 || sql.getErrorCode() == 51420)) {
                    throw new DomainException("INVALID_STATE", sql.getMessage());
                }
            }
            throw ReservationDatabase.translate(error);
        }
    }

    public InvoiceDtos.PageResponse page(PaymentStatus status, Long reservation, LocalDate from, LocalDate to,
            int page, int size) {
        int p = Math.max(0, page), s = Math.max(1, Math.min(100, size));
        String where = " WHERE (? IS NULL OR h.trangThai=?) AND (? IS NULL OR h.maPhieuDatPhong=?) "
                + "AND (? IS NULL OR h.thoiDiemLap>=?) AND (? IS NULL OR h.thoiDiemLap<?)";
        LocalDateTime start = from == null ? null : from.atStartOfDay();
        LocalDateTime end = to == null ? null : to.plusDays(1).atStartOfDay();
        Object[] args = {status == null ? null : statuses.convertToDatabaseColumn(status),
                status == null ? null : statuses.convertToDatabaseColumn(status), reservation, reservation,
                start, start, end, end};
        long total = jdbc.queryForObject("SELECT COUNT_BIG(*) FROM dbo.vwHoaDonChiTiet h" + where, Long.class, args);
        List<Object> pageArgs = new ArrayList<>(Arrays.asList(args));
        pageArgs.add((long) p * s); pageArgs.add(s);
        var items = jdbc.query(SELECT + where + " ORDER BY h.thoiDiemLap DESC,h.maHoaDon DESC OFFSET ? ROWS FETCH NEXT ? ROWS ONLY",
                rows, pageArgs.toArray()).stream().map(Snapshot::response).toList();
        return new InvoiceDtos.PageResponse(items, p, s, total, (int) Math.ceil((double) total / s));
    }
}

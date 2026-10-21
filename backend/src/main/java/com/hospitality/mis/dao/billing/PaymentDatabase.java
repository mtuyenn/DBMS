package com.hospitality.mis.dao.billing;

import com.hospitality.mis.common.exception.DomainException;
import com.hospitality.mis.dto.billing.PaymentTransactionDtos;
import com.hospitality.mis.entity.billing.PaymentMethod;
import com.hospitality.mis.entity.billing.PaymentTransaction;
import com.hospitality.mis.persistence.VietnameseEnumConverters.PaymentMethodConverter;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Payment reads and positive payment recording through the existing SQL procedure. */
@Repository
public class PaymentDatabase {
    public record InvoiceScope(long invoiceId, long reservationId, String employeeId, Long customerId) { }
    private final JdbcTemplate jdbc;
    private final PaymentMethodConverter methods = new PaymentMethodConverter();

    public PaymentDatabase(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public InvoiceScope invoice(long id) {
        return jdbc.query("SELECT maHoaDon,maPhieuDatPhong,maNhanVien FROM dbo.vwHoaDonChiTiet WHERE maHoaDon=?",
                (r, n) -> new InvoiceScope(r.getLong(1), r.getLong(2), r.getString(3), null), id).stream().findFirst()
                .orElseThrow(() -> new DomainException("INVOICE_NOT_FOUND", "Không tìm thấy hóa đơn"));
    }

    public void lock(long id) {
        jdbc.queryForObject("SELECT maHoaDon FROM dbo.HoaDon WITH (UPDLOCK,HOLDLOCK) WHERE maHoaDon=?", Long.class, id);
    }

    public PaymentTransactionDtos.Response record(String command, long invoice, BigDecimal amount, PaymentMethod method,
            String reference, String storedKey, String actor, Long approval, LocalDateTime now) {
        if (!"payment".equals(command)) throw new DomainException("REFUND_NOT_SUPPORTED", "Hoàn tiền không nằm trong phạm vi hỗ trợ");
        try {
            Long id = jdbc.queryForObject("DECLARE @transaction BIGINT,@receipt BIGINT; "
                    + "EXEC dbo.uspGhiGiaoDichThanhToan ?,?,?,@transaction OUTPUT,@receipt OUTPUT; SELECT @transaction",
                    Long.class, invoice, amount, methods.convertToDatabaseColumn(method));
            return get(id);
        } catch (org.springframework.dao.DataAccessException error) {
            throw new DomainException("PAYMENT_FAILED", error.getMostSpecificCause().getMessage());
        }
    }

    public List<PaymentTransactionDtos.Response> list(long invoice) {
        invoice(invoice);
        return jdbc.query("SELECT maGiaoDich,maHoaDon,soTien,phuongThuc,thoiDiem FROM dbo.GiaoDichThanhToan "
                        + "WHERE maHoaDon=? ORDER BY thoiDiem,maGiaoDich", (r, n) -> response(r.getLong(1), r.getLong(2),
                        r.getBigDecimal(3), r.getString(4), r.getTimestamp(5).toLocalDateTime()), invoice);
    }

    private PaymentTransactionDtos.Response get(long id) {
        return jdbc.queryForObject("SELECT maGiaoDich,maHoaDon,soTien,phuongThuc,thoiDiem FROM dbo.GiaoDichThanhToan WHERE maGiaoDich=?",
                (r, n) -> response(r.getLong(1), r.getLong(2), r.getBigDecimal(3), r.getString(4), r.getTimestamp(5).toLocalDateTime()), id);
    }

    private PaymentTransactionDtos.Response response(long id, long invoice, BigDecimal amount, String method, LocalDateTime at) {
        return new PaymentTransactionDtos.Response(id, invoice, amount, methods.convertToEntityAttribute(method),
                PaymentTransaction.TransactionType.PAYMENT, PaymentTransaction.TransactionStatus.COMPLETED, null, at, null);
    }

    public PaymentTransactionDtos.PageResponse page(Long invoice, PaymentMethod method, PaymentTransaction.TransactionType type,
            PaymentTransaction.TransactionStatus status, LocalDateTime from, LocalDateTime to,
            int page, int size, boolean ascending) {
        int p = Math.max(0, page), s = Math.max(1, Math.min(100, size));
        String where = " WHERE (? IS NULL OR maHoaDon=?) AND (? IS NULL OR phuongThuc=?) "
                + "AND (? IS NULL OR thoiDiem>=?) AND (? IS NULL OR thoiDiem<?)";
        String dbMethod = method == null ? null : methods.convertToDatabaseColumn(method);
        Object[] args = {invoice, invoice, dbMethod, dbMethod, from, from, to, to};
        long total = jdbc.queryForObject("SELECT COUNT_BIG(*) FROM dbo.GiaoDichThanhToan" + where, Long.class, args);
        List<Object> paged = new ArrayList<>(java.util.Arrays.asList(args)); paged.add((long) p * s); paged.add(s);
        String direction = ascending ? " ASC" : " DESC";
        var items = jdbc.query("SELECT maGiaoDich,maHoaDon,soTien,phuongThuc,thoiDiem FROM dbo.GiaoDichThanhToan"
                + where + " ORDER BY thoiDiem" + direction + ",maGiaoDich" + direction + " OFFSET ? ROWS FETCH NEXT ? ROWS ONLY",
                (r, n) -> response(r.getLong(1), r.getLong(2), r.getBigDecimal(3), r.getString(4), r.getTimestamp(5).toLocalDateTime()), paged.toArray());
        return new PaymentTransactionDtos.PageResponse(items, p, s, total, (int) Math.ceil((double) total / s));
    }

    public PaymentTransactionDtos.LedgerPageResponse ledgerPage(Long invoice, PaymentMethod method,
            PaymentTransaction.TransactionType type, PaymentTransaction.TransactionStatus status,
            LocalDateTime from, LocalDateTime to, String search, int page, int size) {
        String base = " FROM dbo.vwGiaoDichThanhToanChiTiet g";
        String where = " WHERE (? IS NULL OR g.maHoaDon=?) AND (? IS NULL OR g.phuongThuc=?) "
                + "AND (? IS NULL OR g.thoiDiem>=?) AND (? IS NULL OR g.thoiDiem<?) "
                + "AND (? IS NULL OR CHARINDEX(LOWER(?),LOWER(CONCAT(g.maGiaoDich,N' ',g.maHoaDon,N' ',g.maPhieuDatPhong,N' ',g.tenKhach,N' ',g.phuongThuc)))>0)";
        String dbMethod = method == null ? null : methods.convertToDatabaseColumn(method);
        Object[] common = {invoice, invoice, dbMethod, dbMethod, from, from, to, to, search, search};
        Map<String, Long> methodCounts = new LinkedHashMap<>();
        jdbc.query("SELECT g.phuongThuc,COUNT_BIG(*)" + base + where + " GROUP BY g.phuongThuc",
                (org.springframework.jdbc.core.RowCallbackHandler) r ->
                methodCounts.put(methods.convertToEntityAttribute(r.getString(1)).name(), r.getLong(2)), common);
        int p = Math.max(0, page), s = Math.max(1, Math.min(100, size));
        long total = jdbc.queryForObject("SELECT COUNT_BIG(*)" + base + where, Long.class, common);
        List<Object> args = new ArrayList<>(java.util.Arrays.asList(common)); args.add((long) p * s); args.add(s);
        var items = jdbc.query("SELECT g.maGiaoDich,g.maHoaDon,g.soTien,g.phuongThuc,g.thoiDiem,g.maPhieuDatPhong,g.tienDichVu"
                        + base + where + " ORDER BY g.thoiDiem DESC,g.maGiaoDich DESC OFFSET ? ROWS FETCH NEXT ? ROWS ONLY",
                (r, n) -> new PaymentTransactionDtos.LedgerResponse(r.getLong(1), r.getLong(2), r.getBigDecimal(3),
                        methods.convertToEntityAttribute(r.getString(4)), PaymentTransaction.TransactionType.PAYMENT,
                        PaymentTransaction.TransactionStatus.COMPLETED, null, r.getTimestamp(5).toLocalDateTime(), null,
                        r.getLong(6), r.getBigDecimal(7)), args.toArray());
        return new PaymentTransactionDtos.LedgerPageResponse(items, p, s, total, (int) Math.ceil((double) total / s), methodCounts);
    }
}

package com.hospitality.mis.dao.billing;

import com.hospitality.mis.common.exception.DomainException;
import com.hospitality.mis.dto.billing.ReceiptDtos;
import com.hospitality.mis.entity.billing.PaymentMethod;
import com.hospitality.mis.persistence.VietnameseEnumConverters.PaymentMethodConverter;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/** Receipt projections backed by payment-created receipts in BienLai. */
@Repository
public class ReceiptDatabase {
    private static final String SELECT = "SELECT b.maBienLai,b.maHoaDon,b.soTien,b.phuongThuc,b.thoiDiemPhatHanh "
            + "FROM dbo.vwBienLai b";
    private final JdbcTemplate jdbc;
    private final PaymentDatabase payments;
    private final PaymentMethodConverter methods = new PaymentMethodConverter();
    private final org.springframework.jdbc.core.RowMapper<ReceiptDtos.Response> rows = (r, n) ->
            response(r.getLong(1), r.getLong(2), r.getBigDecimal(3), r.getString(4), r.getTimestamp(5).toLocalDateTime());

    public ReceiptDatabase(JdbcTemplate jdbc, PaymentDatabase payments) { this.jdbc = jdbc; this.payments = payments; }
    public PaymentDatabase.InvoiceScope invoice(long id) { return payments.invoice(id); }

    public ReceiptDtos.Response issue(long invoice, String number, BigDecimal amount, PaymentMethod method,
            String actor, LocalDateTime now) {
        var exists = jdbc.query(SELECT + " WHERE b.maHoaDon=? AND b.soTien=? AND b.phuongThuc=? ORDER BY b.maBienLai DESC",
                rows, invoice, amount, methods.convertToDatabaseColumn(method));
        if (!exists.isEmpty()) return exists.get(0);
        Long transaction = jdbc.queryForList("SELECT TOP(1) maGiaoDich FROM dbo.vwGiaoDichChuaLapBienLai "
                        + "WHERE maHoaDon=? AND soTien=? AND phuongThuc=? ORDER BY maGiaoDich DESC", Long.class,
                invoice, amount, methods.convertToDatabaseColumn(method)).stream().findFirst()
                .orElseThrow(() -> new DomainException("RECEIPT_PAYMENT_NOT_FOUND", "Không tìm thấy giao dịch cần phát hành biên lai"));
        Long id = jdbc.queryForObject("DECLARE @id BIGINT; EXEC dbo.uspPhatHanhBienLai ?,@id OUTPUT; SELECT @id", Long.class, transaction);
        return jdbc.query(SELECT + " WHERE b.maBienLai=?", rows, id).get(0);
    }

    public ReceiptDtos.PageResponse page(Long invoice, PaymentMethod method, String actor, LocalDateTime from,
            LocalDateTime to, int page, int size, boolean asc) {
        if (invoice != null) payments.invoice(invoice);
        int p = Math.max(0, page), s = Math.max(1, Math.min(100, size));
        String where = " WHERE (? IS NULL OR b.maHoaDon=?) AND (? IS NULL OR b.phuongThuc=?) "
                + "AND (? IS NULL OR b.thoiDiemPhatHanh>=?) AND (? IS NULL OR b.thoiDiemPhatHanh<?)";
        Object dbMethod = method == null ? null : methods.convertToDatabaseColumn(method);
        Object[] args = {invoice, invoice, dbMethod, dbMethod, from, from, to, to};
        long total = jdbc.queryForObject("SELECT COUNT_BIG(*)" + SELECT.substring(SELECT.indexOf(" FROM ")) + where,
                Long.class, args);
        List<Object> paged = new ArrayList<>(Arrays.asList(args)); paged.add((long) p * s); paged.add(s);
        String direction = asc ? " ASC" : " DESC";
        var items = jdbc.query(SELECT + where + " ORDER BY b.thoiDiemPhatHanh" + direction
                        + ",b.maBienLai" + direction + " OFFSET ? ROWS FETCH NEXT ? ROWS ONLY", rows, paged.toArray());
        return new ReceiptDtos.PageResponse(items, p, s, total, (int) Math.ceil((double) total / s));
    }

    private ReceiptDtos.Response response(long id, long invoice, BigDecimal amount, String method, LocalDateTime at) {
        return new ReceiptDtos.Response(id, "BIEN-LAI-" + id, invoice, amount,
                methods.convertToEntityAttribute(method), at, "—");
    }

    public List<ReceiptDtos.UnissuedTransaction> unissuedTransactions() {
        return jdbc.query("SELECT maGiaoDich, maHoaDon, soTien, phuongThuc FROM dbo.vwGiaoDichChuaLapBienLai ORDER BY maGiaoDich DESC",
                (r, n) -> new ReceiptDtos.UnissuedTransaction(r.getLong(1), r.getLong(2), r.getBigDecimal(3),
                        methods.convertToEntityAttribute(r.getString(4))));
    }
}

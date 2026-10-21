package com.hospitality.mis.dto.billing;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.hospitality.mis.entity.billing.PaymentMethod;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/** DTO biên lai, là bằng chứng phát hành cho một khoản thu trên hóa đơn. */
public final class ReceiptDtos {
    /** Namespace không trạng thái cho payload biên lai. */
    private ReceiptDtos() {}

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    /** Request phát hành biên lai với số, số tiền dương và phương thức bắt buộc. */
    public record CreateRequest(
            /** Số biên lai hiển thị và dùng đối soát. */
            @NotBlank String receiptNumber,
            /** Số tiền trên biên lai, phải lớn hơn 0. */
            @NotNull @Positive BigDecimal amount,
            /** Phương thức nhận tiền. */
            @NotNull PaymentMethod method) {}

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    /** Biên lai đã phát hành, có thời điểm và người phát hành để truy vết. */
    public record Response(
                           /** Khóa chính biên lai. */
                           Long id,
                           /** Số biên lai. */
                           String receiptNumber,
                           /** Hóa đơn liên quan. */
                           Long invoiceId,
                           /** Số tiền đã thu. */
                           BigDecimal amount,
                           /** Phương thức thu. */
                           PaymentMethod method,
                           /** Thời điểm phát hành. */
                           LocalDateTime issuedAt,
                           /** Tác nhân phát hành. */
                           String issuedBy) {}
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record PageResponse(java.util.List<Response> items, int page, int size, long totalElements, int totalPages) {}
}

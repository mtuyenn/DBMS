package com.hospitality.mis.dto.billing;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.hospitality.mis.entity.billing.PaymentMethod;
import com.hospitality.mis.entity.billing.PaymentTransaction;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.LocalDateTime;
public final class PaymentTransactionDtos {
    private PaymentTransactionDtos() {}
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record CreateRequest(
            @NotNull @Positive BigDecimal amount,
            @NotNull PaymentMethod method,
            @NotNull PaymentTransaction.TransactionType type,
            String reference) {
    }
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record Response(
                           Long id,
                           Long invoiceId,
                           BigDecimal amount,
                           PaymentMethod method,
                           PaymentTransaction.TransactionType type,
                           PaymentTransaction.TransactionStatus status,
                           String reference,
                           LocalDateTime occurredAt,
                           String actorId) {}
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record PageResponse(java.util.List<Response> items, int page, int size, long totalElements, int totalPages) {}
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record LedgerResponse(Long id, Long invoiceId, BigDecimal amount, PaymentMethod method,
                                 PaymentTransaction.TransactionType type, PaymentTransaction.TransactionStatus status,
                                 String reference, LocalDateTime occurredAt, String actorId,
                                 Long reservationId, BigDecimal serviceTotal) {}
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record LedgerPageResponse(java.util.List<LedgerResponse> items, int page, int size,
                                     long totalElements, int totalPages, java.util.Map<String, Long> methodCounts) {}
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record DailyRevenue(java.time.LocalDate date, BigDecimal revenue) {}
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record MethodRevenue(String method, BigDecimal revenue) {}
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record RevenueSummary(BigDecimal totalRevenue, BigDecimal todayRevenue,
                                 java.util.List<DailyRevenue> daily, java.util.List<MethodRevenue> byMethod) {}
}

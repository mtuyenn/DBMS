package com.hospitality.mis.dto.billing;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
public final class ServiceConsumptionDtos {
    private ServiceConsumptionDtos() {}
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record CreateRequest(@NotNull @Positive Long reservationId,@NotBlank String serviceId,@NotNull @Positive Integer quantity) {}
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record Response(long id,long reservationId,String serviceId,String serviceName,int quantity,
            BigDecimal unitPrice,BigDecimal amount,LocalDateTime usedAt,boolean cancelled) {}
}

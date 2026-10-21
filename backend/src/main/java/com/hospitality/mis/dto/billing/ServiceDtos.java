package com.hospitality.mis.dto.billing;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDateTime;
public final class ServiceDtos {
    private ServiceDtos() {}
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record SaveRequest(@NotBlank @Size(max=20) String id,@NotBlank @Size(max=100) String name,
            @NotNull @PositiveOrZero BigDecimal price,@Size(max=20) String unit,@Size(max=300) String description) {}
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record CreateRequest(
                                @NotBlank String id,
                                @NotBlank String name,
                                @NotNull @PositiveOrZero BigDecimal price,
                                String unit,
                                @PositiveOrZero int openingStock,
                                @PositiveOrZero int safetyThreshold,
                                @Size(max = 50) String category,
                                @Size(max = 1000) String description,
                                @Size(max = 500) String imageUrl) {
        public CreateRequest(String id, String name, BigDecimal price, String unit,
                             int openingStock, int safetyThreshold) {
            this(id, name, price, unit, openingStock, safetyThreshold, null, null, null);
        }
    }
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record StockRequest(
                               @NotNull @PositiveOrZero Integer quantity) {}
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record PriceChangeRequest(@NotNull @PositiveOrZero BigDecimal price, @NotBlank String reason) {}
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record PriceHistoryResponse(Long id, String serviceId, BigDecimal price, String changedBy,
                                       Long approvalId, LocalDateTime effectiveAt) {}
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record Response(
                           String id,
                           String name,
                           BigDecimal price,
                           String unit,
                           String category,
                           String description,
                           String imageUrl,
                           int stock,
                           int safetyThreshold,
                           boolean lowStock,
                           boolean active,int durationMinutes,boolean resource) {
        public Response(String id,String name,BigDecimal price,String unit,String category,String description,String imageUrl,int stock,int safetyThreshold,boolean lowStock,boolean active){this(id,name,price,unit,category,description,imageUrl,stock,safetyThreshold,lowStock,active,60,true);}
    }
}

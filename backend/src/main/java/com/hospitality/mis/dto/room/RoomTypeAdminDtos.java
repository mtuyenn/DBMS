package com.hospitality.mis.dto.room;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
public final class RoomTypeAdminDtos {
    private RoomTypeAdminDtos() {}
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record Request(@NotBlank @Size(max=20) String id, @NotBlank @Size(max=60) String name,
            @NotNull @DecimalMin("0.00") BigDecimal dailyPrice, @Size(max=500) String description) {}
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record Response(String id,String name,BigDecimal dailyPrice,String description) {}
}

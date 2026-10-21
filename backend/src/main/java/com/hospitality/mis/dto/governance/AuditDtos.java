package com.hospitality.mis.dto.governance;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import java.time.Instant;
public final class AuditDtos {
    private AuditDtos() {
    }
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record Response(
            Long id,
            String actor,
            String action,
            String entityType,
            String entityId,
            String beforeData,
            String afterData,
            String reason,
            String correlationKey,
            Instant createdAt) {
    }
}

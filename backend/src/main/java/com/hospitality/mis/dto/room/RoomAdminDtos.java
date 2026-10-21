package com.hospitality.mis.dto.room;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.hospitality.mis.entity.room.RoomStatus;
import jakarta.validation.constraints.NotBlank;

public final class RoomAdminDtos {
    private RoomAdminDtos() {}
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record Request(@NotBlank String id, @NotBlank String name, @NotBlank String roomTypeId,
                          Integer floor, String description, RoomStatus status) {}
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record Response(String id, String name, String roomTypeId, String roomTypeName, Integer floor,
                           String description, RoomStatus status) {}
}

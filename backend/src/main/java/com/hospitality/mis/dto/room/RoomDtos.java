package com.hospitality.mis.dto.room;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;


import com.hospitality.mis.entity.room.RoomStatus;



import java.math.BigDecimal;



/** DTO hiển thị phòng, loại phòng, giá và trạng thái sử dụng. */
public final class RoomDtos {

    /** Namespace không trạng thái cho payload phòng. */
    private RoomDtos() {}

    /** Thông tin phòng dùng trên room board. */
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record Response(
                           /** Mã phòng. */
                           String id,
                           /** Tên/số phòng hiển thị. */
                           String name,
                           /** Mã loại phòng. */
                           String roomTypeId,
                           /** Tên loại phòng để tránh frontend phải tra cứu thêm. */
                           String roomTypeName,
                           /** Giá theo ngày. */
                           BigDecimal dailyPrice,
                           /** Tầng của phòng. */
                           Integer floor,
                           /** Trạng thái vận hành hiện tại. */
                           RoomStatus status,
                           /** Trạng thái lưu trong CSDL, để phân biệt phòng chờ dọn và đang dọn. */
                           String workflowStatus) {}

    /** Kết quả tra cứu khả dụng trong khoảng thời gian yêu cầu. */
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record Availability(
                               /** Mã phòng được kiểm tra. */
                               String roomId,
                               /** Mã loại phòng. */
                               String roomTypeId,
                               /** Tên loại phòng. */
                               String roomTypeName,
                               /** Giá theo ngày. */
                               BigDecimal dailyPrice,
                               /** Tầng của phòng. */
                               Integer floor,
                               /** Phòng có thể đặt trong khoảng yêu cầu hay không. */
                               boolean available) {}

    /** Báo giá tham khảo trước khi lễ tân tạo đặt phòng. */
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record PriceQuote(
                             String roomId,
                             String roomTypeName,
                             BigDecimal dailyPrice,
                             int nights,
                             BigDecimal estimatedTotal) {}

}

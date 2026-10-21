package com.hospitality.mis.dto.billing;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;


import com.hospitality.mis.entity.billing.PaymentMethod;

import com.hospitality.mis.entity.billing.PaymentStatus;


import java.math.BigDecimal;

import java.time.LocalDateTime;



/** DTO hóa đơn; các khoản tiền dùng BigDecimal để tránh sai số số thực. */
public final class InvoiceDtos {

    /** Namespace không trạng thái cho các payload hóa đơn. */
    private InvoiceDtos() {}

    /** Hóa đơn tổng hợp của một đặt phòng, trả về trạng thái thanh toán hiện tại. */
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record Response(
                           /** Khóa chính hóa đơn. */
                           Long id,
                           /** Đặt phòng được tính hóa đơn. */
                           Long reservationId,
                           /** Thời điểm phát hành hóa đơn. */
                           LocalDateTime issuedAt,
                           /** Tổng tiền phòng. */
                           BigDecimal roomTotal,

                           /** Tổng tiền dịch vụ đã sử dụng. */
                           BigDecimal serviceTotal,
                           /** Phụ thu trả phòng muộn. */
                           BigDecimal lateSurcharge,
                           /** Khoản bồi thường được tính vào hóa đơn. */
                           BigDecimal compensation,

                           /** Tiền phát sinh do gia hạn thời gian ở. */
                           BigDecimal extensionTotal,
                           /** Tổng các điều chỉnh hóa đơn. */
                           BigDecimal adjustmentTotal,
                           /** Khoản giảm giá. */
                           BigDecimal discount,
                           /** Tiền đặt cọc còn giữ sau các giao dịch hoàn đã hoàn tất. */
                           BigDecimal deposit,

                           /** Số tiền còn phải thanh toán. */
                           BigDecimal payable,
                           /** Phương thức thanh toán được chọn. */
                           PaymentMethod paymentMethod,
                           /** Trạng thái vòng đời hóa đơn. */
                           PaymentStatus status,
                           /** Booking đã hủy và toàn bộ cọc đã được ghi nhận hoàn trong sổ giao dịch. */
                           boolean depositRefunded) {}
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record PageResponse(java.util.List<Response> items, int page, int size, long totalElements, int totalPages) {}
}

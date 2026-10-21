package com.hospitality.mis.entity.reservation;

/** Trạng thái hướng dẫn thanh toán tiền cọc do customer booking tạo ra. */
public enum DepositPaymentStatus {
    /** Booking nội bộ hoặc chưa yêu cầu phát hành hướng dẫn cọc. */
    NOT_REQUIRED,
    /** Mã đã phát hành nhưng cổng thanh toán chưa xác nhận giao dịch. */
    PENDING,
    /** Cổng thanh toán đã xác nhận tiền cọc. */
    PAID,
    /** Hướng dẫn thanh toán không còn hiệu lực. */
    EXPIRED
}

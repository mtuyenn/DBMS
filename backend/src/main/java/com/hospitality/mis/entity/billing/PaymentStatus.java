package com.hospitality.mis.entity.billing;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/** Trạng thái thanh toán được lưu trên hóa đơn. */
public enum PaymentStatus {
    /** Hóa đơn đã được thanh toán đủ. */
    DA_THANH_TOAN,
    /** Hóa đơn chưa hoàn tất thanh toán. */
    CHUA_THANH_TOAN,
    /** Khoản thanh toán mới là dự kiến, chưa quyết toán. */
    DU_KIEN;

    /** Đọc giá trị JSON theo tên enum, bỏ khoảng trắng và không phân biệt hoa thường. */
    @JsonCreator
    public static PaymentStatus from(String value) {
        return value == null ? null : valueOf(value.trim().toUpperCase());
    }

    @JsonValue
    /** Xuất đúng mã enum hiện hành trong JSON. */
    public String value() { return name(); }
}

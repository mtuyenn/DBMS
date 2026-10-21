package com.hospitality.mis.entity.billing;



/** Các kênh thanh toán được chấp nhận khi thu hoặc hoàn tiền. */
public enum PaymentMethod {

    /** Thanh toán bằng tiền mặt. */
    CASH,

    /** Thanh toán qua thẻ. */
    CARD,

    /** Thanh toán bằng chuyển khoản ngân hàng. */
    BANK_TRANSFER

}

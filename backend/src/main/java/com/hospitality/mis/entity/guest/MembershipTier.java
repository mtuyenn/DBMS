package com.hospitality.mis.entity.guest;



/** Các hạng thành viên và phần trăm giảm giá gắn với từng hạng. */
public enum MembershipTier {

    /** Hạng khởi điểm, không giảm giá. */
    STANDARD(0),
    /** Hạng bạc, giảm 5 phần trăm. */
    SILVER(5),
    /** Hạng vàng, giảm 10 phần trăm. */
    GOLD(10),
    /** Hạng bạch kim, giảm 15 phần trăm. */
    PLATINUM(15);

    /** Tỷ lệ giảm giá tính theo phần trăm. */
    private final int discountPercent;

    MembershipTier(int discountPercent) { this.discountPercent = discountPercent; }

    public int discountPercent() { return discountPercent; }

}

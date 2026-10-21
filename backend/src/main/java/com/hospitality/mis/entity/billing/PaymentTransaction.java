package com.hospitality.mis.entity.billing;
public final class PaymentTransaction {
    private PaymentTransaction() {}
    public enum TransactionType { PAYMENT, REFUND }
    public enum TransactionStatus { COMPLETED, FAILED, VOIDED }
}

package com.hospitality.mis.persistence;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import com.hospitality.mis.entity.billing.PaymentMethod;
import com.hospitality.mis.entity.billing.PaymentStatus;
import com.hospitality.mis.entity.billing.PaymentTransaction;
import com.hospitality.mis.entity.identity.EmployeeRole;
import com.hospitality.mis.entity.reservation.ReservationStatus;
public final class VietnameseEnumConverters {
    private VietnameseEnumConverters() {}
    private static <T extends Enum<T>> Map.Entry<T, String> value(T key, String text) {
        return Map.entry(key, text);
    }

    private static class EnumMapping<E extends Enum<E>> {
        private final Map<E, String> toDatabase;
        private final Map<String, E> fromDatabase;

        @SafeVarargs
        protected EnumMapping(Class<E> type, Map.Entry<E, String>... entries) {
            Map<E, String> forward = new LinkedHashMap<>();
            Map<String, E> reverse = new LinkedHashMap<>();
            for (Map.Entry<E, String> entry : entries) {
                if (forward.put(entry.getKey(), entry.getValue()) != null
                        || reverse.put(entry.getValue(), entry.getKey()) != null) {
                    throw new IllegalArgumentException("Duplicate enum persistence mapping for " + type.getSimpleName());
                }
            }
            if (forward.size() != type.getEnumConstants().length) {
                throw new IllegalArgumentException("Incomplete enum persistence mapping for " + type.getSimpleName());
            }
            toDatabase = Collections.unmodifiableMap(forward);
            fromDatabase = Collections.unmodifiableMap(reverse);
        }
        public String convertToDatabaseColumn(E value) {
            if (value == null) return null;
            String translated = toDatabase.get(value);
            if (translated == null) throw new IllegalArgumentException("Unsupported enum value: " + value);
            return translated;
        }
        public E convertToEntityAttribute(String value) {
            if (value == null) return null;
            E translated = fromDatabase.get(value);
            if (translated == null) throw new IllegalArgumentException("Unknown Vietnamese database value: " + value);
            return translated;
        }

    }

    public static final class EmployeeRoleConverter {
        private final EnumMapping<EmployeeRole> mapping;
        public EmployeeRoleConverter() { mapping = new EnumMapping<>(EmployeeRole.class,
                value(EmployeeRole.MANAGER, "Quản lý"), value(EmployeeRole.FRONT_DESK, "Lễ tân"),
                value(EmployeeRole.ACCOUNTING, "Kế toán"), value(EmployeeRole.HOUSEKEEPING, "Buồng phòng/Dịch vụ")); }
        public String convertToDatabaseColumn(EmployeeRole value) { return mapping.convertToDatabaseColumn(value); }
        public EmployeeRole convertToEntityAttribute(String value) { return mapping.convertToEntityAttribute(value); }
    }
    public static final class ReservationStatusConverter {
        private final EnumMapping<ReservationStatus> mapping;
        public ReservationStatusConverter() { mapping = new EnumMapping<>(ReservationStatus.class,
                value(ReservationStatus.DRAFT, "Bản nháp"), value(ReservationStatus.PENDING_PAYMENT, "Chờ thanh toán"),
                value(ReservationStatus.DEPOSIT_PAID, "Đã thanh toán cọc"),
                value(ReservationStatus.CONFIRMED, "Đã xác nhận"), value(ReservationStatus.CHECKED_IN, "Đang ở"),
                value(ReservationStatus.CHECKED_OUT, "Đã trả phòng"), value(ReservationStatus.CANCELLED, "Đã hủy"),
                value(ReservationStatus.NO_SHOW, "Không đến")); }
        public String convertToDatabaseColumn(ReservationStatus value) { return mapping.convertToDatabaseColumn(value); }
          public ReservationStatus convertToEntityAttribute(String value) {
              if ("Đang ở".equals(value)) return ReservationStatus.CHECKED_IN;
              return mapping.convertToEntityAttribute(value);
          }
    }
    public static final class PaymentMethodConverter {
        private final EnumMapping<PaymentMethod> mapping;
        public PaymentMethodConverter() { mapping = new EnumMapping<>(PaymentMethod.class,
                value(PaymentMethod.CASH, "Tiền mặt"), value(PaymentMethod.CARD, "Thẻ"),
                value(PaymentMethod.BANK_TRANSFER, "Chuyển khoản ngân hàng")); }
          public String convertToDatabaseColumn(PaymentMethod value) {
              if (value == PaymentMethod.BANK_TRANSFER) return "Chuyển khoản";
              return mapping.convertToDatabaseColumn(value);
          }
          public PaymentMethod convertToEntityAttribute(String value) {
              if ("Chuyển khoản".equals(value)) return PaymentMethod.BANK_TRANSFER;
              return mapping.convertToEntityAttribute(value);
          }
    }
    public static final class PaymentStatusConverter {
        private final EnumMapping<PaymentStatus> mapping;
        public PaymentStatusConverter() { mapping = new EnumMapping<>(PaymentStatus.class,
                value(PaymentStatus.DA_THANH_TOAN, "Đã thanh toán"), value(PaymentStatus.CHUA_THANH_TOAN, "Chưa thanh toán"),
                value(PaymentStatus.DU_KIEN, "Dự kiến")); }
        public String convertToDatabaseColumn(PaymentStatus value) { return mapping.convertToDatabaseColumn(value); }
        public PaymentStatus convertToEntityAttribute(String value) { return mapping.convertToEntityAttribute(value); }
    }
    public static final class TransactionTypeConverter {
        private final EnumMapping<PaymentTransaction.TransactionType> mapping;
        public TransactionTypeConverter() { mapping = new EnumMapping<>(PaymentTransaction.TransactionType.class,
                value(PaymentTransaction.TransactionType.PAYMENT, "Thanh toán"), value(PaymentTransaction.TransactionType.REFUND, "Hoàn tiền")); }
        public String convertToDatabaseColumn(PaymentTransaction.TransactionType value) { return mapping.convertToDatabaseColumn(value); }
        public PaymentTransaction.TransactionType convertToEntityAttribute(String value) { return mapping.convertToEntityAttribute(value); }
    }
    public static final class TransactionStatusConverter {
        private final EnumMapping<PaymentTransaction.TransactionStatus> mapping;
        public TransactionStatusConverter() { mapping = new EnumMapping<>(PaymentTransaction.TransactionStatus.class,
                value(PaymentTransaction.TransactionStatus.COMPLETED, "Đã hoàn tất"), value(PaymentTransaction.TransactionStatus.FAILED, "Thất bại"),
                value(PaymentTransaction.TransactionStatus.VOIDED, "Đã vô hiệu")); }
        public String convertToDatabaseColumn(PaymentTransaction.TransactionStatus value) { return mapping.convertToDatabaseColumn(value); }
        public PaymentTransaction.TransactionStatus convertToEntityAttribute(String value) { return mapping.convertToEntityAttribute(value); }
    }
}

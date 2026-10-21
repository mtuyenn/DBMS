package com.hospitality.mis.service.reservation;

import com.hospitality.mis.common.exception.DomainException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

/**
 * Đảm bảo tính bất biến khi lặp lại lệnh cho các dịch vụ ứng dụng đặt phòng và vận hành.
 *
 * <p>Lược đồ chuẩn hiện chỉ lưu một khóa cho việc tạo đặt phòng. Các bảng thao tác
 * khác không có cột khóa và không thể thay đổi trong phạm vi này, vì vậy kết quả
 * các lệnh đã hoàn tất được dịch vụ ứng dụng này giữ lại. Khóa luôn được gắn với
 * tác nhân đã xác thực và dấu vân tay của yêu cầu.</p>
 */
public final class IdempotencySupport {
    /** Kết quả đã hoàn tất trong lifetime của service, lập chỉ mục theo scope và key. */
    private final Map<String, Entry> completed = new ConcurrentHashMap<>();

    /** Tuần tự hóa kiểm tra-key/thực thi/lưu-kết-quả để retry đồng thời không chạy lại lệnh. */
    @SuppressWarnings("unchecked")
    public synchronized <T> T execute(String scope, String key, String actor,
                                       String fingerprint, Supplier<T> command) {
        String normalizedKey = requireKey(key);
        Objects.requireNonNull(actor, "actor");
        Objects.requireNonNull(fingerprint, "fingerprint");
        String mapKey = scope + "|" + normalizedKey;
        Entry previous = completed.get(mapKey);
        if (previous != null) {
            if (!previous.actor().equals(actor) || !previous.fingerprint().equals(fingerprint)) {
                throw new DomainException("IDEMPOTENCY_KEY_CONFLICT",
                        "Idempotency key đã được dùng cho yêu cầu khác hoặc actor khác");
            }
            return (T) previous.result();
        }
        T result = command.get();
        completed.put(mapKey, new Entry(actor, fingerprint, result));
        return result;
    }

    /** Chuẩn hóa và bắt buộc key retry trong giới hạn giao thức hiện tại. */
    public static String requireKey(String key) {
        if (key == null || key.isBlank()) {
            throw new DomainException("IDEMPOTENCY_KEY_REQUIRED", "Thiếu Idempotency-Key");
        }
        String normalized = key.trim();
        if (normalized.length() > 100) {
            throw new DomainException("INVALID_IDEMPOTENCY_KEY", "Idempotency-Key không được vượt quá 100 ký tự");
        }
        return normalized;
    }

    /** Băm biểu diễn request chuẩn hóa để phát hiện dùng lại key cho payload khác. */
    public static String fingerprint(String canonicalRequest) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(canonicalRequest.getBytes(StandardCharsets.UTF_8));
            StringBuilder result = new StringBuilder(digest.length * 2);
            for (byte value : digest) result.append(String.format("%02x", value));
            return result.toString();
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is required", impossible);
        }
    }

    private record Entry(String actor, String fingerprint, Object result) {}
}

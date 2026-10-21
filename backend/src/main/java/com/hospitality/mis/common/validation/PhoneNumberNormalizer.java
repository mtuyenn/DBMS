package com.hospitality.mis.common.validation;

import com.hospitality.mis.common.exception.DomainException;

/** Canonicalizes phone numbers before lookup, uniqueness checks and persistence. */
public final class PhoneNumberNormalizer {
    private PhoneNumberNormalizer() {}

    public static String normalize(String value) {
        if (value == null || value.isBlank()) {
            throw new DomainException("PHONE_REQUIRED", "Số điện thoại là bắt buộc");
        }
        String normalized = value.trim().replaceAll("[\\s.()\\-]", "");
        if (normalized.startsWith("+84")) normalized = "0" + normalized.substring(3);
        else if (normalized.startsWith("84") && normalized.length() == 11) normalized = "0" + normalized.substring(2);
        if (!normalized.matches("\\+?[0-9]{9,15}")) {
            throw new DomainException("PHONE_INVALID", "Số điện thoại không hợp lệ");
        }
        return normalized;
    }
}

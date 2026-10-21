package com.hospitality.mis.middleware.security;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;

/** Quyền thao tác dựa trên người thực hiện ca trực hiện tại, không phải người tạo đặt phòng. */
public final class ReservationAccess {
    /** Utility class, không có state riêng để tránh tạo đường vòng quanh SecurityContext. */
    private ReservationAccess() {}

    /** Bắt buộc actor của thao tác khớp principal hiện tại và thuộc nhóm được sửa đặt phòng. */
    public static void requireOperator(String actor) {
        SecurityActor.requireBoundActor(actor);
        if (!hasRole("FRONT_DESK", "MANAGER")) {
            throw new AccessDeniedException("Chỉ lễ tân hoặc quản lý được thay đổi đặt phòng");
        }
    }

    /** Kiểm tra quyền đọc toàn cục sau khi buộc SecurityActor xác nhận có principal. */
    public static boolean hasGlobalRead() {
        SecurityActor.currentActor();
        return hasRole("FRONT_DESK", "MANAGER", "HOUSEKEEPING", "ACCOUNTING");
    }

    /** Đối chiếu authority role chính xác trong SecurityContext; thiếu context thì trả false. */
    private static boolean hasRole(String... roles) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null && authentication.getAuthorities().stream()
                .anyMatch(authority -> java.util.Arrays.stream(roles)
                        .anyMatch(role -> authority.getAuthority().equals("ROLE_" + role)));
    }
}

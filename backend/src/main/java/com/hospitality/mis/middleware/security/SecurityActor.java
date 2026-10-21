package com.hospitality.mis.middleware.security;

import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

/** Truy xuất người thực hiện đã xác thực; giá trị trong header và body của request không bao giờ là người thực hiện. */
public final class SecurityActor {
    /** Utility class chỉ đọc SecurityContext, không lưu actor vào state dùng chung giữa request. */
    private SecurityActor() {
    }

    /**
     * Lấy principal từ authentication đã được Spring Security xác nhận.
     * Với JWT, type/id phải có đủ và id phải khớp tên authentication; thiếu hoặc lệch thì fail-closed.
     */
    public static Principal currentPrincipal() {
        // Context là nguồn actor duy nhất; request header/body không được tham gia phân giải này.
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken
                || authentication.getName() == null || authentication.getName().isBlank()) {
            throw new AuthenticationCredentialsNotFoundException("Yêu cầu phải được xác thực");
        }
        if (authentication instanceof JwtAuthenticationToken jwt) {
            // JWT principal claims phải khớp authentication name do converter đã xác minh.
            String type = jwt.getToken().getClaimAsString("principal_type");
            String id = jwt.getToken().getClaimAsString("principal_id");
            if (type == null || id == null || id.isBlank() || !id.equals(authentication.getName())) {
                throw new AuthenticationCredentialsNotFoundException("JWT principal không hợp lệ");
            }
            return new Principal(type, id);
        }
        return new Principal("EMPLOYEE", authentication.getName());
    }

    /** Trả ID actor hiện tại để service ghi audit và kiểm tra ownership. */
    public static String currentActor() {
        return currentPrincipal().id();
    }

    /** Chặn actor do client truyền vào nếu không trùng principal đã xác thực trong context. */
    public static String requireBoundActor(String actor) {
        String current = currentActor();
        if (actor == null || actor.isBlank() || !current.equals(actor)) {
            throw new AccessDeniedException("Actor không khớp principal hiện tại");
        }
        return current;
    }

    public record Principal(String type, String id) {
        /** type phân biệt loại danh tính; id là định danh đã được dùng làm authentication name. */
        public Principal {
            if (type == null || type.isBlank() || id == null || id.isBlank()) {
                throw new IllegalArgumentException("Principal type and id are required");
            }
        }

        /** Cho biết principal có phải nhân viên để áp dụng policy nghiệp vụ tương ứng. */
        public boolean isEmployee() {
            return "EMPLOYEE".equals(type);
        }

        /** Cho biết principal có phải khách hàng để tách khỏi quyền vận hành nội bộ. */
        public boolean isCustomer() {
            return "CUSTOMER".equals(type);
        }
    }
}

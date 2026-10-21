package com.hospitality.mis.middleware.security;

import com.hospitality.mis.service.governance.SecurityAuditService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;

/** Chỉ ghi nhận kết quả; thông tin xác thực, chuỗi truy vấn và body của request không bao giờ được ghi log. */
public class SecurityAuditFilter extends OncePerRequestFilter {
    /** Service ghi audit; filter chỉ cung cấp outcome và metadata request đã được redaction. */
    private final SecurityAuditService audit;
    /** Nhận sink audit để filter không tự quản lý transaction hay dữ liệu audit. */
    public SecurityAuditFilter(SecurityAuditService audit) { this.audit = audit; }

    @Override
    /**
     * Để chain hoàn tất trước khi đọc status cuối, rồi chỉ ghi các thất bại 401/403 của API.
     * URI được dùng nguyên path nhưng không ghi query/body/header credential; actor customer được
     * gắn namespace để tránh nhầm với employee có cùng chuỗi ID.
     */
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                  FilterChain chain) throws ServletException, IOException {
        chain.doFilter(request, response);
        if (!request.getRequestURI().startsWith("/api/") || request.getMethod().equals("OPTIONS")) return;
        // Chỉ audit hai outcome bảo mật; request thành công không tạo log nhiễu hoặc dữ liệu thừa.
        int status = response.getStatus();
        String action = status == 401 ? "AUTHENTICATION_REJECTED" : status == 403 ? "ACCESS_DENIED" : null;
        if (action == null) return;
        // actor chỉ lấy từ SecurityContext; URI không có query string nên không kéo theo dữ liệu nhạy cảm.
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        String actor = "ANONYMOUS";
        if (authentication != null && authentication.isAuthenticated()
                && !(authentication instanceof AnonymousAuthenticationToken)) {
            actor = authentication.getName();
            if (authentication instanceof JwtAuthenticationToken jwt
                    && "CUSTOMER".equals(jwt.getToken().getClaimAsString("principal_type"))) actor = "customer:" + actor;
        }
        audit.record(actor, action, request.getMethod(), request.getRequestURI(), status);
    }
}

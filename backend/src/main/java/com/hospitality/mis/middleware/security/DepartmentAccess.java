package com.hospitality.mis.middleware.security;

import com.hospitality.mis.entity.identity.EmployeeRole;
import com.hospitality.mis.entity.identity.Permission;
import com.hospitality.mis.entity.billing.PaymentTransaction.TransactionType;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

@Component("departmentAccess")
/** Kiểm tra capability dựa trên authority của authentication hiện tại, không dựa vào input request. */
public class DepartmentAccess {
    /** Quyền thu tiền không được suy ra từ quyền hoàn tiền hoặc lập phiếu thu. */
    public boolean allowsPayment(Authentication authentication, TransactionType type) {
        if (type == null) return false;
        return allows(authentication, switch (type) {
            case PAYMENT -> "PAYMENT_COLLECT";
            case REFUND -> "PAYMENT_WRITE";
        });
    }

    /**
     * Từ chối anonymous/chưa xác thực, sau đó đối chiếu capability với quyền của từng role.
     * Role lạ bị bỏ qua thay vì được suy diễn thành quyền; đây là điểm kiểm soát fail-closed.
     */
    public boolean allows(Authentication authentication, String capability) {
        if (authentication == null || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken) return false;
        // capability phải ánh xạ vào enum hiện hành; authority chỉ được công nhận nếu role biết rõ.
        Permission permission = Permission.valueOf(capability);
        return authentication.getAuthorities().stream().anyMatch(authority -> {
            String name = authority.getAuthority();
            if (!name.startsWith("ROLE_")) return false;
            try {
                return EmployeeRole.valueOf(name.substring(5)).permissions().contains(permission);
            } catch (IllegalArgumentException ignored) {
                return false;
            }
        });
    }
}

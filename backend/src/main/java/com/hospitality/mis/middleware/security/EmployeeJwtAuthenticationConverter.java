package com.hospitality.mis.middleware.security;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.Collection;

/**
 * Chuyển JWT đã được ký và giải mã thành authority của đúng principal.
 * Các claim định danh, loại token và session phải nhất quán; thiếu hoặc lệch bất kỳ phần nào
 * đều bị coi là credential không hợp lệ thay vì tự suy đoán danh tính.
 */
@Component
public class EmployeeJwtAuthenticationConverter implements Converter<Jwt, Collection<GrantedAuthority>> {
    /** Dịch vụ nạp trạng thái, mật khẩu và quyền hiện tại của employee/customer. */
    private final EmployeeUserDetailsService users;
    /** Nạp trạng thái và quyền hiện tại của nhân viên trước khi chấp nhận token. */
    public EmployeeJwtAuthenticationConverter(EmployeeUserDetailsService users) {
        this.users = users;
    }

    @Override
    /**
     * Kiểm tra subject/principal claims, loại access token, session chưa revoke/hết hạn và account.
     * Authority luôn được nạp lại từ server để claim không thể tự nâng quyền cho người dùng.
     */
    public Collection<GrantedAuthority> convert(Jwt jwt) {
        // Ba claim định danh phải cùng một principal; không có đường fallback sang request input.
        String subject = jwt.getSubject();
        String principalType = jwt.getClaimAsString("principal_type");
        String principalId = jwt.getClaimAsString("principal_id");
        if (subject == null || subject.isBlank() || principalType == null || principalType.isBlank()
                || principalId == null || principalId.isBlank() || !subject.equals(principalId)) {
            throw new BadCredentialsException("JWT principal is required");
        }
        if (!"access".equals(jwt.getClaimAsString("token_type"))) {
            throw new BadCredentialsException("JWT token type is not valid");
        }
        // UserDetails là nguồn quyền/trạng thái hiện tại, không phải authority do JWT tự khai báo.
        UserDetails user;
        try {
            if ("EMPLOYEE".equals(principalType)) {
                user = users.loadEmployeeById(principalId);
            } else {
                throw new BadCredentialsException("JWT principal type is not valid");
            }
        } catch (org.springframework.security.core.AuthenticationException exception) {
            throw new BadCredentialsException("JWT principal is not valid", exception);
        }
        if (!user.isEnabled() || !user.isAccountNonLocked()) {
            throw new BadCredentialsException("JWT account is not active");
        }
        return user.getAuthorities().stream().map(authority -> (GrantedAuthority) authority).toList();
    }
}

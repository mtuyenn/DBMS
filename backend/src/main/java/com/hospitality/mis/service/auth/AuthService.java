package com.hospitality.mis.service.auth;
import com.hospitality.mis.common.exception.AuthFailureException;
import com.hospitality.mis.dao.identity.EmployeeDatabase.Snapshot;
import com.hospitality.mis.dto.auth.AuthDtos;
import com.hospitality.mis.entity.auth.PrincipalType;
import com.hospitality.mis.middleware.security.SecurityActor;
import com.hospitality.mis.service.governance.AuditService;
import com.hospitality.mis.service.identity.EmployeeService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service
public class AuthService {
    private final AuthenticationManager authenticationManager;
    private final EmployeeService employeeService;
    private final JwtTokenService tokenService;
    private final AuditService audit;
    public AuthService(AuthenticationManager authenticationManager, EmployeeService employeeService,
                       JwtTokenService tokenService, AuditService audit) {
        this.authenticationManager=authenticationManager; this.employeeService=employeeService;
        this.tokenService=tokenService; this.audit=audit;
    }
    @Transactional(noRollbackFor = AuthFailureException.class)
    public AuthDtos.TokenResponse login(AuthDtos.LoginRequest request) {
        try {
            var authentication = authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(request.employeeId(), request.password()));
            UserDetails user = (UserDetails) authentication.getPrincipal();
            return issueAndStore(PrincipalType.EMPLOYEE, user.getUsername(), user,
                    tokenService.generateFamilyId());
        } catch (DisabledException exception) {
            throw new AuthFailureException("ACCOUNT_DISABLED");
        } catch (LockedException exception) {
            throw new AuthFailureException("ACCOUNT_LOCKED");
        } catch (AuthenticationException exception) {
            throw new AuthFailureException();
        }
    }
    @Transactional(readOnly = true)
    public AuthDtos.EmployeeProfileResponse employeeMe(SecurityActor.Principal actor) {
        if (!actor.isEmployee()) throw new org.springframework.security.access.AccessDeniedException("Employee principal required");
        Snapshot employee = employeeService.findRequired(actor.id());
        return new AuthDtos.EmployeeProfileResponse(employee.employeeId(), employee.fullName(),
                employee.role(), employee.role().permissions().stream().sorted().toList());
    }
    @Transactional
    public void logout(SecurityActor.Principal actor) {
        if (actor == null || !actor.isEmployee()) throw new AuthFailureException();
        audit.record(actor.id(), "LOGOUT", "NhanVien", actor.id(), null, null, null);
    }
    @Transactional
    public void changeOwnPassword(SecurityActor.Principal actor, AuthDtos.ChangeOwnPasswordRequest request) {
        if (!actor.isEmployee()) throw new AuthFailureException();
        SecurityActor.requireBoundActor(actor.id());
        employeeService.changeOwnPassword(actor.id(), request == null ? null : request.password());
        audit.record(actor.id(), "PASSWORD_CHANGED", "EMPLOYEE", actor.id(), null, null, null);
    }
    private AuthDtos.TokenResponse issueAndStore(PrincipalType type, String principalId,
                                                 UserDetails user, String familyId) {
        AuthDtos.TokenResponse issued = tokenService.issue(type, principalId, user.getAuthorities(), familyId);
        return new AuthDtos.TokenResponse(issued.accessToken(), null, "Bearer",
                issued.expiresIn(), 0);
    }
}

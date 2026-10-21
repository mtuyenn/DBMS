package com.hospitality.mis.controller.auth;
import com.hospitality.mis.dto.auth.AuthDtos;
import com.hospitality.mis.service.auth.AuthService;
import com.hospitality.mis.middleware.security.SecurityActor;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService service;
    public AuthController(AuthService service) { this.service=service; }
    @PostMapping("/login")
    public AuthDtos.TokenResponse login(@Valid @RequestBody AuthDtos.LoginRequest request) { return service.login(request); }
    @GetMapping("/me") @PreAuthorize("isAuthenticated()")
    public AuthDtos.EmployeeProfileResponse me() { return service.employeeMe(SecurityActor.currentPrincipal()); }
    @PostMapping("/logout") @ResponseStatus(HttpStatus.NO_CONTENT) @PreAuthorize("isAuthenticated()")
    public void logout() { service.logout(SecurityActor.currentPrincipal()); }
    @PostMapping("/me/password") @ResponseStatus(HttpStatus.NO_CONTENT) @PreAuthorize("isAuthenticated()")
    public void changeOwnPassword(@Valid @RequestBody AuthDtos.ChangeOwnPasswordRequest request) {
        service.changeOwnPassword(SecurityActor.currentPrincipal(),request);
    }
}

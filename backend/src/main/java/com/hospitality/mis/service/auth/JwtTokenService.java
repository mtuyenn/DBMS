package com.hospitality.mis.service.auth;
import com.hospitality.mis.dto.auth.AuthDtos;
import com.hospitality.mis.entity.auth.PrincipalType;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;
import java.time.Duration;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
@Service
public class JwtTokenService {
    public static final Duration ACCESS_TOKEN_TTL = Duration.ofMinutes(15);
    private final JwtEncoder encoder;
    public JwtTokenService(JwtEncoder encoder) {
        this.encoder = encoder;
    }
    public AuthDtos.TokenResponse issue(PrincipalType principalType, String principalId,
                              Collection<? extends GrantedAuthority> authorities, String familyId) {
        if (principalType == null || principalId == null || principalId.isBlank()) {
            throw new IllegalArgumentException("JWT principal type and id are required");
        }
        if (familyId == null || familyId.isBlank()) {
            throw new IllegalArgumentException("JWT family id is required");
        }
        Instant issuedAt = Instant.now();
        List<String> roles = authorities == null ? List.of() : authorities.stream()
                .map(GrantedAuthority::getAuthority)
                .filter(authority -> authority != null && authority.startsWith("ROLE_"))
                .map(authority -> authority.substring("ROLE_".length()))
                .toList();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .subject(principalId)
                .issuedAt(issuedAt)
                .expiresAt(issuedAt.plus(ACCESS_TOKEN_TTL))
                .id(UUID.randomUUID().toString())
                .claim("token_type", "access")
                .claim("principal_type", principalType.name())
                .claim("principal_id", principalId)
                .claim("session_id", familyId)
                .claim("roles", roles)
                .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256)
                .type("JWT")
                .keyId("hotel-mis")
                .build();
        String accessToken = encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
        return new AuthDtos.TokenResponse(accessToken, null, "Bearer", ACCESS_TOKEN_TTL.toSeconds(), 0);
    }
    public String generateFamilyId() {
        return UUID.randomUUID().toString();
    }

}

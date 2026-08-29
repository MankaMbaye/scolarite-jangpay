package com.scolarite.backend.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {

    private final SecretKey key;
    private final long expirationMs;

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiration-ms}") long expirationMs) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    public String generateToken(UUID userId, String email, UUID tenantId, String role) {
        Instant now = Instant.now();
        var builder = Jwts.builder()
                .subject(userId.toString())
                .claim("email", email)
                .claim("role", role)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusMillis(expirationMs)));
        if (tenantId != null) {
            builder.claim("tenantId", tenantId.toString());
        }
        return builder.signWith(key).compact();
    }

    public Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public record TokenPrincipal(UUID userId, String email, UUID tenantId, String role) {
    }

    public TokenPrincipal toPrincipal(Claims claims) {
        String tenantIdClaim = claims.get("tenantId", String.class);
        return new TokenPrincipal(
                UUID.fromString(claims.getSubject()),
                claims.get("email", String.class),
                tenantIdClaim != null ? UUID.fromString(tenantIdClaim) : null,
                claims.get("role", String.class)
        );
    }
}

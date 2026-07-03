package com.healthwise.assessment.auth.security;

import com.healthwise.assessment.user.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import java.util.UUID;

/**
 * Small focused helper (not a full Spring Security provider) used by both the login flow
 * and {@link JwtAuthenticationFilter}. Access and refresh tokens are both signed JWTs;
 * refresh tokens carry a {@code type=refresh} claim so they can never be accepted as an
 * access token even if replayed into the wrong header, and a {@code remember} claim so
 * the "Remember me" TTL class survives token rotation on {@code /api/auth/refresh}.
 */
@Component
public class JwtService {

    private static final String CLAIM_TYPE = "type";
    private static final String CLAIM_REMEMBER = "remember";
    private static final String CLAIM_EMAIL = "email";
    private static final String TYPE_REFRESH = "refresh";

    private final SecretKey key;
    private final long accessTokenTtlMinutes;
    private final long defaultRefreshTokenTtlDays;
    private final long rememberMeRefreshTokenTtlDays;

    public JwtService(@Value("${jwt.secret}") String secret,
                       @Value("${jwt.access-token-ttl-minutes}") long accessTokenTtlMinutes,
                       @Value("${jwt.refresh-token-ttl-days}") long defaultRefreshTokenTtlDays,
                       @Value("${auth.cookie.remember-me-ttl-days}") long rememberMeRefreshTokenTtlDays) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTokenTtlMinutes = accessTokenTtlMinutes;
        this.defaultRefreshTokenTtlDays = defaultRefreshTokenTtlDays;
        this.rememberMeRefreshTokenTtlDays = rememberMeRefreshTokenTtlDays;
    }

    public long accessTokenTtlSeconds() {
        return Duration.ofMinutes(accessTokenTtlMinutes).toSeconds();
    }

    public Duration refreshTokenTtl(boolean rememberMe) {
        return rememberMe ? Duration.ofDays(rememberMeRefreshTokenTtlDays) : Duration.ofDays(defaultRefreshTokenTtlDays);
    }

    public String generateAccessToken(User user) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(user.getId())
                .claim(CLAIM_EMAIL, user.getEmail())
                .claim("roles", user.getRoles())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(Duration.ofMinutes(accessTokenTtlMinutes))))
                .signWith(key)
                .compact();
    }

    public String generateRefreshToken(User user, boolean rememberMe) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(user.getId())
                .claim(CLAIM_TYPE, TYPE_REFRESH)
                .claim(CLAIM_REMEMBER, rememberMe)
                .id(UUID.randomUUID().toString())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(refreshTokenTtl(rememberMe))))
                .signWith(key)
                .compact();
    }

    public Optional<Jws<Claims>> parseAndValidate(String token) {
        try {
            return Optional.of(Jwts.parser().verifyWith(key).build().parseSignedClaims(token));
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    public boolean isRefreshToken(Claims claims) {
        return TYPE_REFRESH.equals(claims.get(CLAIM_TYPE, String.class));
    }

    public boolean rememberMeClaim(Claims claims) {
        Boolean remember = claims.get(CLAIM_REMEMBER, Boolean.class);
        return remember != null && remember;
    }

    public String extractUserId(Claims claims) {
        return claims.getSubject();
    }
}

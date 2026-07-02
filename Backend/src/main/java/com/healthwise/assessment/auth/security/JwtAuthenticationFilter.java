package com.healthwise.assessment.auth.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

/**
 * Populates the security context from a Bearer access token, if present and valid. Never
 * throws on a missing/invalid token - it simply leaves the request unauthenticated so the
 * {@code authenticated()} rule in {@link SecurityConfig} (via the custom entry point) is
 * what ultimately produces a consistent 401 response shape.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtService jwtService;

    public JwtAuthenticationFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith(BEARER_PREFIX)) {
            String token = header.substring(BEARER_PREFIX.length());
            Optional<Claims> claims = jwtService.parseAndValidate(token).map(jws -> jws.getPayload());
            if (claims.isPresent() && !jwtService.isRefreshToken(claims.get())) {
                String userId = jwtService.extractUserId(claims.get());
                Collection<SimpleGrantedAuthority> authorities = extractAuthorities(claims.get());
                var authentication = new UsernamePasswordAuthenticationToken(userId, null, authorities);
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        }
        filterChain.doFilter(request, response);
    }

    @SuppressWarnings("unchecked")
    private Collection<SimpleGrantedAuthority> extractAuthorities(Claims claims) {
        List<String> roles = claims.get("roles", List.class);
        if (roles == null || roles.isEmpty()) {
            return List.of(new SimpleGrantedAuthority("ROLE_USER"));
        }
        return roles.stream().map(SimpleGrantedAuthority::new).toList();
    }
}

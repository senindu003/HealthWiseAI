package com.healthwise.assessment.auth.controller;

import com.healthwise.assessment.auth.dto.AuthResponse;
import com.healthwise.assessment.auth.dto.ForgotPasswordRequest;
import com.healthwise.assessment.auth.dto.GoogleAuthRequest;
import com.healthwise.assessment.auth.dto.LoginRequest;
import com.healthwise.assessment.auth.dto.RefreshResponse;
import com.healthwise.assessment.auth.dto.RegisterRequest;
import com.healthwise.assessment.auth.dto.ResetPasswordRequest;
import com.healthwise.assessment.auth.dto.UserSummary;
import com.healthwise.assessment.auth.security.CurrentUserProvider;
import com.healthwise.assessment.auth.service.AuthResult;
import com.healthwise.assessment.auth.service.AuthService;
import com.healthwise.assessment.auth.service.RefreshResult;
import com.healthwise.assessment.common.exception.InvalidRefreshTokenException;
import com.healthwise.assessment.common.response.ApiResponse;
import com.healthwise.assessment.user.repository.UserRepository;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;
    private final CurrentUserProvider currentUserProvider;
    private final String cookieName;
    private final boolean cookieSecure;
    private final String cookieSameSite;
    private final String frontendBaseUrl;

    public AuthController(AuthService authService,
                           UserRepository userRepository,
                           CurrentUserProvider currentUserProvider,
                           @Value("${auth.cookie.name}") String cookieName,
                           @Value("${auth.cookie.secure}") boolean cookieSecure,
                           @Value("${auth.cookie.same-site}") String cookieSameSite,
                           @Value("${app.frontend-base-url}") String frontendBaseUrl) {
        this.authService = authService;
        this.userRepository = userRepository;
        this.currentUserProvider = currentUserProvider;
        this.cookieName = cookieName;
        this.cookieSecure = cookieSecure;
        this.cookieSameSite = cookieSameSite;
        this.frontendBaseUrl = frontendBaseUrl;
    }

    @PostMapping("/register")
    public ApiResponse<AuthResponse> register(@Valid @RequestBody RegisterRequest request, HttpServletResponse response) {
        AuthResult result = authService.register(request);
        setRefreshCookie(response, result.refreshToken(), result.refreshTokenTtl());
        return ApiResponse.success(result.response());
    }

    @PostMapping("/login")
    public ApiResponse<AuthResponse> login(@Valid @RequestBody LoginRequest request, HttpServletResponse response) {
        AuthResult result = authService.login(request);
        setRefreshCookie(response, result.refreshToken(), result.refreshTokenTtl());
        return ApiResponse.success(result.response());
    }

    @PostMapping("/google")
    public ApiResponse<AuthResponse> google(@Valid @RequestBody GoogleAuthRequest request, HttpServletResponse response) {
        AuthResult result = authService.googleAuth(request);
        setRefreshCookie(response, result.refreshToken(), result.refreshTokenTtl());
        return ApiResponse.success(result.response());
    }

    @PostMapping("/refresh")
    public ApiResponse<RefreshResponse> refresh(
            @CookieValue(name = "${auth.cookie.name}", required = false) String refreshToken,
            HttpServletResponse response) {
        if (refreshToken == null) {
            throw new InvalidRefreshTokenException("Missing refresh token");
        }
        RefreshResult result = authService.refresh(refreshToken);
        setRefreshCookie(response, result.refreshToken(), result.refreshTokenTtl());
        return ApiResponse.success(result.response());
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(HttpServletResponse response) {
        clearRefreshCookie(response);
        return ApiResponse.success(null);
    }

    @PostMapping("/forgot-password")
    public ApiResponse<Void> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request);
        return ApiResponse.success(null);
    }

    @PostMapping("/reset-password")
    public ApiResponse<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ApiResponse.success(null);
    }

    @GetMapping("/verify-email")
    public ResponseEntity<Void> verifyEmail(@RequestParam String token) {
        authService.verifyEmail(token);
        return ResponseEntity.status(302)
                .location(URI.create(frontendBaseUrl + "/signin?verified=true"))
                .build();
    }

    @GetMapping("/me")
    public ApiResponse<UserSummary> me() {
        String userId = currentUserProvider.currentUserId();
        return ApiResponse.success(UserSummary.from(userRepository.findById(userId).orElseThrow()));
    }

    private void setRefreshCookie(HttpServletResponse response, String value, java.time.Duration ttl) {
        ResponseCookie cookie = ResponseCookie.from(cookieName, value)
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite(cookieSameSite)
                .path("/api/auth")
                .maxAge(ttl)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private void clearRefreshCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(cookieName, "")
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite(cookieSameSite)
                .path("/api/auth")
                .maxAge(0)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}

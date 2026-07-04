package com.healthwise.assessment.auth.service.impl;

import com.healthwise.assessment.auth.dto.AuthResponse;
import com.healthwise.assessment.auth.dto.ForgotPasswordRequest;
import com.healthwise.assessment.auth.dto.GoogleAuthRequest;
import com.healthwise.assessment.auth.dto.LoginRequest;
import com.healthwise.assessment.auth.dto.RefreshResponse;
import com.healthwise.assessment.auth.dto.RegisterRequest;
import com.healthwise.assessment.auth.dto.ResetPasswordRequest;
import com.healthwise.assessment.auth.dto.UserSummary;
import com.healthwise.assessment.auth.security.JwtService;
import com.healthwise.assessment.auth.service.AuthResult;
import com.healthwise.assessment.auth.service.AuthService;
import com.healthwise.assessment.auth.service.GoogleTokenVerifierService;
import com.healthwise.assessment.auth.service.GoogleTokenVerifierService.GoogleUserInfo;
import com.healthwise.assessment.auth.service.MailService;
import com.healthwise.assessment.auth.service.PasswordPolicyValidator;
import com.healthwise.assessment.auth.service.RefreshResult;
import com.healthwise.assessment.common.exception.EmailAlreadyRegisteredException;
import com.healthwise.assessment.common.exception.InvalidCredentialsException;
import com.healthwise.assessment.common.exception.InvalidOrExpiredTokenException;
import com.healthwise.assessment.common.exception.InvalidRefreshTokenException;
import com.healthwise.assessment.user.model.AuthProvider;
import com.healthwise.assessment.user.model.User;
import com.healthwise.assessment.user.repository.UserRepository;
import io.jsonwebtoken.Claims;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final MailService mailService;
    private final PasswordPolicyValidator passwordPolicyValidator;
    private final GoogleTokenVerifierService googleTokenVerifierService;
    private final int maxFailedAttempts;
    private final long lockoutDurationMinutes;
    private final String frontendBaseUrl;
    private final String backendBaseUrl;

    public AuthServiceImpl(UserRepository userRepository,
                            PasswordEncoder passwordEncoder,
                            JwtService jwtService,
                            MailService mailService,
                            PasswordPolicyValidator passwordPolicyValidator,
                            GoogleTokenVerifierService googleTokenVerifierService,
                            @Value("${auth.lockout.max-failed-attempts}") int maxFailedAttempts,
                            @Value("${auth.lockout.lockout-duration-minutes}") long lockoutDurationMinutes,
                            @Value("${app.frontend-base-url}") String frontendBaseUrl,
                            @Value("${app.backend-base-url}") String backendBaseUrl) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.mailService = mailService;
        this.passwordPolicyValidator = passwordPolicyValidator;
        this.googleTokenVerifierService = googleTokenVerifierService;
        this.maxFailedAttempts = maxFailedAttempts;
        this.lockoutDurationMinutes = lockoutDurationMinutes;
        this.frontendBaseUrl = frontendBaseUrl;
        this.backendBaseUrl = backendBaseUrl;
    }

    @Override
    public AuthResult register(RegisterRequest request) {
        String email = normalizeEmail(request.email());
        passwordPolicyValidator.validate(request.password());
        if (userRepository.existsByEmail(email)) {
            throw new EmailAlreadyRegisteredException("An account with this email already exists");
        }

        Instant now = Instant.now();
        User user = User.builder()
                .fullName(request.fullName())
                .address(request.address())
                .email(email)
                .passwordHash(passwordEncoder.encode(request.password()))
                .authProvider(AuthProvider.LOCAL)
                .emailVerified(false)
                .emailVerificationToken(UUID.randomUUID().toString())
                .emailVerificationTokenExpiresAt(now.plus(Duration.ofHours(24)))
                .createdAt(now)
                .updatedAt(now)
                .build();

        User saved;
        try {
            saved = userRepository.save(user);
        } catch (DuplicateKeyException e) {
            // Lost a race against a concurrent registration for the same email.
            throw new EmailAlreadyRegisteredException("An account with this email already exists");
        }

        try {
            String verificationLink = backendBaseUrl + "/api/auth/verify-email?token=" + saved.getEmailVerificationToken();
            mailService.sendVerificationEmail(saved, verificationLink);
        } catch (Exception e) {
            // Account must remain usable immediately even if the verification email fails to send.
        }

        return issueTokens(saved, false, true);
    }

    @Override
    public AuthResult login(LoginRequest request) {
        String email = normalizeEmail(request.email());
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new InvalidCredentialsException("Invalid email or password"));

        if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(Instant.now())) {
            throw new InvalidCredentialsException("Invalid email or password");
        }
        if (user.getPasswordHash() == null || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            registerFailedAttempt(user);
            throw new InvalidCredentialsException("Invalid email or password");
        }

        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        user.setUpdatedAt(Instant.now());
        User saved = userRepository.save(user);

        return issueTokens(saved, request.rememberMe(), false);
    }

    @Override
    public AuthResult googleAuth(GoogleAuthRequest request) {
        GoogleUserInfo info = googleTokenVerifierService.verify(request.idToken());
        String email = normalizeEmail(info.email());
        Instant now = Instant.now();

        Optional<User> existing = userRepository.findByEmail(email);
        boolean isNewAccount = existing.isEmpty();
        User user;
        if (existing.isEmpty()) {
            user = User.builder()
                    .fullName(info.fullName() != null ? info.fullName() : email)
                    .address("")
                    .email(email)
                    .passwordHash(null)
                    .authProvider(AuthProvider.GOOGLE)
                    .emailVerified(true)
                    .createdAt(now)
                    .updatedAt(now)
                    .build();
        } else {
            // Auto-link: Google has already cryptographically proven ownership of this email,
            // which is stronger proof than the original password signup, so we authenticate as
            // the existing account rather than rejecting. authProvider is left untouched so the
            // user can still also log in with their original password.
            user = existing.get();
            user.setEmailVerified(true);
            user.setUpdatedAt(now);
        }

        User saved = userRepository.save(user);
        return issueTokens(saved, false, isNewAccount);
    }

    @Override
    public RefreshResult refresh(String refreshTokenCookieValue) {
        if (refreshTokenCookieValue == null || refreshTokenCookieValue.isBlank()) {
            throw new InvalidRefreshTokenException("Missing refresh token");
        }
        Claims claims = jwtService.parseAndValidate(refreshTokenCookieValue)
                .map(jws -> jws.getPayload())
                .filter(jwtService::isRefreshToken)
                .orElseThrow(() -> new InvalidRefreshTokenException("Refresh token is invalid or expired"));

        User user = userRepository.findById(jwtService.extractUserId(claims))
                .orElseThrow(() -> new InvalidRefreshTokenException("Refresh token is invalid or expired"));

        boolean rememberMe = jwtService.rememberMeClaim(claims);
        String newAccessToken = jwtService.generateAccessToken(user);
        String newRefreshToken = jwtService.generateRefreshToken(user, rememberMe);

        RefreshResponse response = new RefreshResponse(newAccessToken, jwtService.accessTokenTtlSeconds());
        return new RefreshResult(response, newRefreshToken, jwtService.refreshTokenTtl(rememberMe));
    }

    @Override
    public void forgotPassword(ForgotPasswordRequest request) {
        String email = normalizeEmail(request.email());
        // Always behave the same regardless of whether the account exists (non-enumeration).
        userRepository.findByEmail(email).ifPresent(user -> {
            user.setPasswordResetToken(UUID.randomUUID().toString());
            user.setPasswordResetTokenExpiresAt(Instant.now().plus(Duration.ofHours(1)));
            User saved = userRepository.save(user);
            String resetLink = frontendBaseUrl + "/reset-password?token=" + saved.getPasswordResetToken();
            mailService.sendPasswordResetEmail(saved, resetLink);
        });
    }

    @Override
    public void resetPassword(ResetPasswordRequest request) {
        User user = userRepository.findByPasswordResetToken(request.token())
                .filter(u -> u.getPasswordResetTokenExpiresAt() != null && u.getPasswordResetTokenExpiresAt().isAfter(Instant.now()))
                .orElseThrow(() -> new InvalidOrExpiredTokenException("This reset link is invalid or has expired"));

        passwordPolicyValidator.validate(request.newPassword());

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setPasswordResetToken(null);
        user.setPasswordResetTokenExpiresAt(null);
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        user.setUpdatedAt(Instant.now());
        userRepository.save(user);
    }

    @Override
    public void verifyEmail(String token) {
        User user = userRepository.findByEmailVerificationToken(token)
                .filter(u -> u.getEmailVerificationTokenExpiresAt() != null && u.getEmailVerificationTokenExpiresAt().isAfter(Instant.now()))
                .orElseThrow(() -> new InvalidOrExpiredTokenException("This verification link is invalid or has expired"));

        user.setEmailVerified(true);
        user.setEmailVerificationToken(null);
        user.setEmailVerificationTokenExpiresAt(null);
        user.setUpdatedAt(Instant.now());
        userRepository.save(user);
    }

    private void registerFailedAttempt(User user) {
        int attempts = user.getFailedLoginAttempts() + 1;
        user.setFailedLoginAttempts(attempts);
        if (attempts >= maxFailedAttempts) {
            user.setLockedUntil(Instant.now().plus(Duration.ofMinutes(lockoutDurationMinutes)));
            user.setFailedLoginAttempts(0);
        }
        user.setUpdatedAt(Instant.now());
        userRepository.save(user);
    }

    private AuthResult issueTokens(User user, boolean rememberMe, boolean isNewAccount) {
        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user, rememberMe);
        AuthResponse response = new AuthResponse(accessToken, jwtService.accessTokenTtlSeconds(), UserSummary.from(user), isNewAccount);
        return new AuthResult(response, refreshToken, jwtService.refreshTokenTtl(rememberMe));
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase();
    }
}

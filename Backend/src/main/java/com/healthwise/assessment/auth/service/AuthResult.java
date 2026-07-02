package com.healthwise.assessment.auth.service;

import com.healthwise.assessment.auth.dto.AuthResponse;

import java.time.Duration;

/**
 * Internal carrier returned by {@link AuthService} to the controller layer only - the raw
 * refresh token and its TTL are used to set the httpOnly cookie and must never appear in
 * the {@link AuthResponse} body sent to the client.
 */
public record AuthResult(AuthResponse response, String refreshToken, Duration refreshTokenTtl) {
}

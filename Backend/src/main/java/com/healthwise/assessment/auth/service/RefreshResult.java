package com.healthwise.assessment.auth.service;

import com.healthwise.assessment.auth.dto.RefreshResponse;

import java.time.Duration;

public record RefreshResult(RefreshResponse response, String refreshToken, Duration refreshTokenTtl) {
}

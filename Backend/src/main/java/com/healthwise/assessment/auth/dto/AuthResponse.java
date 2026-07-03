package com.healthwise.assessment.auth.dto;

public record AuthResponse(String accessToken, long expiresInSeconds, UserSummary user) {
}

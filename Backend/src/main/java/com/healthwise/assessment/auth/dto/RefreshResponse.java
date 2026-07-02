package com.healthwise.assessment.auth.dto;

public record RefreshResponse(String accessToken, long expiresInSeconds) {
}

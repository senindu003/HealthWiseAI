package com.healthwise.assessment.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record GoogleAuthRequest(
        @NotBlank(message = "Google ID token is required") String idToken) {
}

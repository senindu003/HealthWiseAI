package com.healthwise.assessment.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record ForgotPasswordRequest(
        @NotBlank(message = "Email is required") @Email(message = "Email must be a valid address") String email) {
}

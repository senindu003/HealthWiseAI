package com.healthwise.assessment.auth.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "Full name is required") @Size(max = 200, message = "Full name is too long") String fullName,
        @NotBlank(message = "Address is required") @Size(max = 500, message = "Address is too long") String address,
        @NotBlank(message = "Email is required") @Email(message = "Email must be a valid address") @Size(max = 254, message = "Email is too long") String email,
        @NotBlank(message = "Password is required") @Size(min = 8, max = 128, message = "Password must be between 8 and 128 characters") String password,
        @AssertTrue(message = "You must agree to the Terms & Privacy Policy") boolean agreedToTerms) {
}

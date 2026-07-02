package com.healthwise.assessment.auth.service;

import com.healthwise.assessment.common.exception.WeakPasswordException;
import org.springframework.stereotype.Component;

import java.util.regex.Pattern;

/**
 * Server-side enforcement of the password policy shown to the user as a live checklist
 * during registration/reset (8+ chars, uppercase, lowercase, number-or-special). The
 * client-side checklist is UX only - this is the source of truth and must never be
 * bypassed by trusting client input alone.
 */
@Component
public class PasswordPolicyValidator {

    private static final int MIN_LENGTH = 8;
    private static final Pattern UPPERCASE = Pattern.compile("[A-Z]");
    private static final Pattern LOWERCASE = Pattern.compile("[a-z]");
    private static final Pattern NUMBER_OR_SPECIAL = Pattern.compile("[0-9!@#$%^&*()_+\\-=\\[\\]{}|;:'\",.<>/?]");

    public void validate(String password) {
        if (password == null || password.length() < MIN_LENGTH) {
            throw new WeakPasswordException("Password must be at least " + MIN_LENGTH + " characters long");
        }
        if (!UPPERCASE.matcher(password).find()) {
            throw new WeakPasswordException("Password must contain at least one uppercase letter");
        }
        if (!LOWERCASE.matcher(password).find()) {
            throw new WeakPasswordException("Password must contain at least one lowercase letter");
        }
        if (!NUMBER_OR_SPECIAL.matcher(password).find()) {
            throw new WeakPasswordException("Password must contain at least one number or special character");
        }
    }
}

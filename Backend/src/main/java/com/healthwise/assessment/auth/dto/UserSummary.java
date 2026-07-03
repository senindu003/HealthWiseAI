package com.healthwise.assessment.auth.dto;

import com.healthwise.assessment.user.model.AuthProvider;
import com.healthwise.assessment.user.model.User;

public record UserSummary(String id, String fullName, String email, boolean emailVerified, AuthProvider authProvider) {

    public static UserSummary from(User user) {
        return new UserSummary(user.getId(), user.getFullName(), user.getEmail(), user.isEmailVerified(), user.getAuthProvider());
    }
}

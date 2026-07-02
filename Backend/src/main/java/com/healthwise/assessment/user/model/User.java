package com.healthwise.assessment.user.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "users")
public class User {

    @Id
    private String id;

    private String fullName;

    private String address;

    @Indexed(unique = true, name = "email_idx")
    private String email;

    private String passwordHash;

    private AuthProvider authProvider;

    @Builder.Default
    private Set<String> roles = Set.of("ROLE_USER");

    private boolean emailVerified;

    private String emailVerificationToken;

    private Instant emailVerificationTokenExpiresAt;

    private String passwordResetToken;

    private Instant passwordResetTokenExpiresAt;

    @Builder.Default
    private int failedLoginAttempts = 0;

    private Instant lockedUntil;

    private Instant createdAt;

    private Instant updatedAt;
}

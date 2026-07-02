package com.healthwise.assessment.auth.service;

import com.healthwise.assessment.user.model.User;

public interface MailService {

    void sendVerificationEmail(User user, String verificationLink);

    void sendPasswordResetEmail(User user, String resetLink);
}

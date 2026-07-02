package com.healthwise.assessment.auth.service;

import com.healthwise.assessment.auth.dto.ForgotPasswordRequest;
import com.healthwise.assessment.auth.dto.GoogleAuthRequest;
import com.healthwise.assessment.auth.dto.LoginRequest;
import com.healthwise.assessment.auth.dto.RegisterRequest;
import com.healthwise.assessment.auth.dto.ResetPasswordRequest;

public interface AuthService {

    AuthResult register(RegisterRequest request);

    AuthResult login(LoginRequest request);

    AuthResult googleAuth(GoogleAuthRequest request);

    RefreshResult refresh(String refreshTokenCookieValue);

    void forgotPassword(ForgotPasswordRequest request);

    void resetPassword(ResetPasswordRequest request);

    void verifyEmail(String token);
}

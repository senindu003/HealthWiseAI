package com.healthwise.assessment.auth.service;

public interface GoogleTokenVerifierService {

    record GoogleUserInfo(String googleSubject, String email, String fullName) {
    }

    GoogleUserInfo verify(String idToken);
}

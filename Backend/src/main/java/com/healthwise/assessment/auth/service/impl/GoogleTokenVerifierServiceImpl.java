package com.healthwise.assessment.auth.service.impl;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.healthwise.assessment.auth.service.GoogleTokenVerifierService;
import com.healthwise.assessment.common.exception.InvalidGoogleTokenException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.GeneralSecurityException;
import java.util.Collections;

@Service
public class GoogleTokenVerifierServiceImpl implements GoogleTokenVerifierService {

    private final GoogleIdTokenVerifier verifier;

    public GoogleTokenVerifierServiceImpl(@Value("${google.client-id}") String googleClientId) {
        this.verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance())
                .setAudience(Collections.singletonList(googleClientId))
                .build();
    }

    @Override
    public GoogleUserInfo verify(String idToken) {
        try {
            GoogleIdToken token = verifier.verify(idToken);
            if (token == null) {
                throw new InvalidGoogleTokenException("Google sign-in token is invalid or expired");
            }
            GoogleIdToken.Payload payload = token.getPayload();
            String email = payload.getEmail();
            String fullName = (String) payload.get("name");
            return new GoogleUserInfo(payload.getSubject(), email, fullName != null ? fullName : email);
        } catch (GeneralSecurityException | java.io.IOException | IllegalArgumentException e) {
            throw new InvalidGoogleTokenException("Failed to verify Google sign-in token: " + e.getMessage());
        }
    }
}

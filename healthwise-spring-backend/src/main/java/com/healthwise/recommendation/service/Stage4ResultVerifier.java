package com.healthwise.recommendation.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Verifies FastAPI's signed validated result and ignores browser-authored content. */
@Component
public class Stage4ResultVerifier {
    private final ObjectMapper mapper;
    private final String secret;
    public Stage4ResultVerifier(ObjectMapper mapper, @Value("${app.stage4-validation-secret}") String secret) {
        this.mapper = mapper; this.secret = secret;
    }
    public Map<String,Object> verifiedResult(String token) {
        try {
            String[] parts = token.split("\\.", 2);
            if (parts.length != 2) throw new IllegalArgumentException();
            byte[] signature = Base64.getUrlDecoder().decode(parts[1]);
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            if (!MessageDigest.isEqual(signature, mac.doFinal(parts[0].getBytes(StandardCharsets.US_ASCII)))) throw new IllegalArgumentException();
            Map<String,Object> claims = mapper.readValue(Base64.getUrlDecoder().decode(parts[0]), new TypeReference<>() {});
            if (!"validated_stage4_result".equals(claims.get("purpose")) || ((Number) claims.getOrDefault("exp", 0)).longValue() < Instant.now().getEpochSecond()) throw new IllegalArgumentException();
            Object result = claims.get("result");
            if (!(result instanceof Map<?,?> raw) || !raw.containsKey("references") || !raw.containsKey("clinicalBoundaries")) throw new IllegalArgumentException();
            @SuppressWarnings("unchecked") Map<String,Object> typed = (Map<String,Object>) raw;
            return typed;
        } catch (Exception ex) { throw new IllegalArgumentException("Only a current FastAPI-validated Stage 4 result can be saved."); }
    }
}

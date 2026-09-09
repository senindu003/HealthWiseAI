package com.healthwise.recommendation.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class Stage4ResultVerifierTest {
    private static final String SECRET = "test-shared-stage4-validation-secret-at-least-32";

    @Test void acceptsOnlySignedValidatedResult() throws Exception {
        String encoded = Base64.getUrlEncoder().withoutPadding().encodeToString(("{\"purpose\":\"validated_stage4_result\",\"exp\":4102444800,\"result\":{\"summary\":\"Validated\",\"references\":[],\"clinicalBoundaries\":[]}}").getBytes(StandardCharsets.UTF_8));
        Mac mac = Mac.getInstance("HmacSHA256"); mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        String token = encoded + "." + Base64.getUrlEncoder().withoutPadding().encodeToString(mac.doFinal(encoded.getBytes(StandardCharsets.US_ASCII)));
        assertEquals("Validated", new Stage4ResultVerifier(new ObjectMapper(), SECRET).verifiedResult(token).get("summary"));
        assertThrows(IllegalArgumentException.class, () -> new Stage4ResultVerifier(new ObjectMapper(), SECRET).verifiedResult(token + "x"));
    }
}

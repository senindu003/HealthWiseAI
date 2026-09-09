package com.healthwise.baseline.dto;

import jakarta.validation.constraints.NotEmpty;
import java.time.Instant;
import java.util.Map;

public final class BaselineDtos {
    private BaselineDtos() {}
    public record Create(@NotEmpty Map<String, Object> questionnaire) {}
    public record Response(String userId, Instant updatedAt, Map<String, Object> questionnaire) {}
}

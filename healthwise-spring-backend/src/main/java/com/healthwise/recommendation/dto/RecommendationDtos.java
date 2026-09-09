package com.healthwise.recommendation.dto;

import jakarta.validation.constraints.NotBlank;
import java.time.Instant;
import java.util.List;
import java.util.Map;

public final class RecommendationDtos {
    private RecommendationDtos() {}

    /** Spring never accepts browser-authored recommendation prose or citations. */
    public record Create(@NotBlank String questionnaireId, @NotBlank String stage4ValidationToken) {}
    public record Response(String id, String questionnaireId, Instant generatedAt, String summary,
                           List<Map<String, Object>> recommendations, Map<String, Object> validatedResult) {}
}

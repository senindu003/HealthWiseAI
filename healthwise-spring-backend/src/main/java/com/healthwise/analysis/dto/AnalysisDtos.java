package com.healthwise.analysis.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.time.Instant;
import java.util.List;
import java.util.Map;

public final class AnalysisDtos {
    private AnalysisDtos() {}

    public record Create(
        @NotBlank String recommendationId,
        @NotEmpty List<@NotBlank String> reportIds,
        @NotBlank String analysisType,
        boolean complete,
        @NotEmpty Map<String, Object> analysis
    ) {}

    public record Response(
        String id,
        String recommendationId,
        List<String> reportIds,
        String analysisType,
        boolean complete,
        Instant analyzedAt,
        Map<String, Object> analysis
    ) {}
}

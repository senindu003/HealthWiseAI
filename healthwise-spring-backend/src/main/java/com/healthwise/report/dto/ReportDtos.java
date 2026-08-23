package com.healthwise.report.dto;

import java.time.Instant;

public final class ReportDtos {
    private ReportDtos() {}

    public record Response(String id, String recommendationId, String reportName, Instant uploadedAt, String reportType) {}
}

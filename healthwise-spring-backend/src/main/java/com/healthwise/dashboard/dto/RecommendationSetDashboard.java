package com.healthwise.dashboard.dto;

import com.healthwise.analysis.dto.AnalysisDtos;
import com.healthwise.recommendation.dto.RecommendationDtos;
import com.healthwise.report.dto.ReportDtos;
import java.util.List;

/** A recommendation set and every report/analysis currently connected to it. */
public record RecommendationSetDashboard(
    RecommendationDtos.Response recommendation,
    List<ReportDtos.Response> reports,
    List<AnalysisDtos.Response> analyses,
    String analysisStatus
) {}

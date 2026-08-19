package com.healthwise.dashboard.dto;

import com.healthwise.timeline.dto.TimelineEvent;
import java.util.List;

/** MongoDB-backed dashboard projection for the authenticated user. */
public record DashboardResponse(
    String firstName,
    Object latestQuestionnaire,
    Object latestRecommendation,
    Object latestReport,
    Object latestAnalysis,
    long pendingRecommendationCount,
    long completedRecommendationCount,
    List<TimelineEvent> timelineSummary
) {}

package com.healthwise.dashboard.dto;

import com.healthwise.timeline.dto.TimelineEvent;
import java.util.List;

/** MongoDB-backed dashboard projection for the authenticated user. */
public record DashboardResponse(
    String firstName,
    Object latestQuestionnaire,
    List<RecommendationSetDashboard> pendingRecommendations,
    List<RecommendationSetDashboard> analysedRecommendations,
    long pendingRecommendationCount,
    long analysedRecommendationCount,
    List<TimelineEvent> timelineSummary
) {}

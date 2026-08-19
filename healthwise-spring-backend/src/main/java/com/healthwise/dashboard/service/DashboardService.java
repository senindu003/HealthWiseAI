package com.healthwise.dashboard.service;

import com.healthwise.analysis.repository.AnalysisHistoryRepository;
import com.healthwise.dashboard.dto.DashboardResponse;
import com.healthwise.questionnaire.repository.QuestionnaireRepository;
import com.healthwise.recommendation.repository.RecommendationRepository;
import com.healthwise.report.repository.ReportRepository;
import com.healthwise.timeline.service.TimelineService;
import com.healthwise.user.entity.User;
import com.healthwise.user.repository.UserRepository;
import org.springframework.stereotype.Service;

/** Reads the authenticated user's dashboard information from MongoDB. */
@Service
public class DashboardService {
    private final QuestionnaireRepository questionnaires;
    private final RecommendationRepository recommendations;
    private final ReportRepository reports;
    private final AnalysisHistoryRepository analyses;
    private final TimelineService timeline;
    private final UserRepository users;

    public DashboardService(
        QuestionnaireRepository questionnaires,
        RecommendationRepository recommendations,
        ReportRepository reports,
        AnalysisHistoryRepository analyses,
        TimelineService timeline,
        UserRepository users
    ) {
        this.questionnaires = questionnaires;
        this.recommendations = recommendations;
        this.reports = reports;
        this.analyses = analyses;
        this.timeline = timeline;
        this.users = users;
    }

    public DashboardResponse get(String userId) {
        long completed = analyses.countByUserId(userId);
        long total = recommendations.countByUserId(userId);
        String firstName = users.findById(userId)
            .map(User::getFirstName)
            .map(String::trim)
            .filter(name -> !name.isBlank())
            .orElse("");

        return new DashboardResponse(
            firstName,
            questionnaires.findFirstByUserIdOrderBySubmittedAtDesc(userId).orElse(null),
            recommendations.findFirstByUserIdOrderByGeneratedAtDesc(userId).orElse(null),
            reports.findFirstByUserIdOrderByUploadedAtDesc(userId).orElse(null),
            analyses.findFirstByUserIdOrderByAnalyzedAtDesc(userId).orElse(null),
            Math.max(0, total - completed),
            completed,
            timeline.timeline(userId)
        );
    }
}

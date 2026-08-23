package com.healthwise.dashboard.service;

import com.healthwise.analysis.repository.AnalysisHistoryRepository;
import com.healthwise.analysis.dto.AnalysisDtos;
import com.healthwise.dashboard.dto.RecommendationSetDashboard;
import com.healthwise.dashboard.dto.DashboardResponse;
import com.healthwise.questionnaire.repository.QuestionnaireRepository;
import com.healthwise.recommendation.dto.RecommendationDtos;
import com.healthwise.recommendation.entity.Recommendation;
import com.healthwise.recommendation.repository.RecommendationRepository;
import com.healthwise.report.dto.ReportDtos;
import com.healthwise.report.entity.Report;
import com.healthwise.report.repository.ReportRepository;
import com.healthwise.timeline.service.TimelineService;
import com.healthwise.user.entity.User;
import com.healthwise.user.repository.UserRepository;
import java.util.List;
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
        List<RecommendationSetDashboard> sets = recommendations.findByUserIdOrderByGeneratedAtDesc(userId)
            .stream().map(recommendation -> workspace(userId, recommendation)).toList();
        List<RecommendationSetDashboard> pending = sets.stream()
            .filter(set -> !"COMPLETE".equals(set.analysisStatus())).toList();
        List<RecommendationSetDashboard> analysed = sets.stream()
            .filter(set -> !set.analyses().isEmpty()).toList();
        String firstName = users.findById(userId)
            .map(User::getFirstName)
            .map(String::trim)
            .filter(name -> !name.isBlank())
            .orElse("");

        return new DashboardResponse(
            firstName,
            questionnaires.findFirstByUserIdOrderBySubmittedAtDesc(userId).orElse(null),
            pending,
            analysed,
            pending.size(),
            analysed.size(),
            timeline.timeline(userId)
        );
    }

    private RecommendationSetDashboard workspace(String userId, Recommendation recommendation) {
        List<Report> savedReports = reports.findByUserIdAndRecommendationIdOrderByUploadedAtDesc(userId, recommendation.getId());
        List<com.healthwise.analysis.entity.AnalysisHistory> savedAnalyses =
            analyses.findByUserIdAndRecommendationIdOrderByAnalyzedAtDesc(userId, recommendation.getId());
        String status = savedAnalyses.isEmpty() ? "PENDING" : savedAnalyses.get(0).isComplete() ? "COMPLETE" : "PARTIAL";
        RecommendationDtos.Response recommendationDto = new RecommendationDtos.Response(
            recommendation.getId(), recommendation.getQuestionnaireId(), recommendation.getGeneratedAt(),
            recommendation.getSummary(), recommendation.getRecommendations());
        List<ReportDtos.Response> reportDtos = savedReports.stream().map(report -> new ReportDtos.Response(
            report.getId(), report.getRecommendationId(), report.getRecommendedTestName(), report.getReportName(), report.getUploadedAt(), report.getReportType())).toList();
        List<AnalysisDtos.Response> analysisDtos = savedAnalyses.stream().map(analysis -> new AnalysisDtos.Response(
            analysis.getId(), analysis.getRecommendationId(), analysis.getReportIds(), analysis.isComplete(),
            analysis.getAnalyzedAt(), analysis.getAnalysis())).toList();
        return new RecommendationSetDashboard(recommendationDto, reportDtos, analysisDtos, status);
    }
}

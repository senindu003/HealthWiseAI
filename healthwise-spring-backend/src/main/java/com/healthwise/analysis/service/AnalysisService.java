package com.healthwise.analysis.service;

import com.healthwise.analysis.dto.AnalysisDtos.Create;
import com.healthwise.analysis.dto.AnalysisDtos.Response;
import com.healthwise.analysis.entity.AnalysisHistory;
import com.healthwise.analysis.repository.AnalysisHistoryRepository;
import com.healthwise.exception.ResourceNotFoundException;
import com.healthwise.recommendation.entity.Recommendation;
import com.healthwise.recommendation.repository.RecommendationRepository;
import com.healthwise.report.entity.Report;
import com.healthwise.report.repository.ReportRepository;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class AnalysisService {
    public static final String SET_ANALYSIS = "SET";
    public static final String INDIVIDUAL_ANALYSIS = "INDIVIDUAL";
    private final AnalysisHistoryRepository analyses;
    private final RecommendationRepository recommendations;
    private final ReportRepository reports;

    public AnalysisService(AnalysisHistoryRepository analyses, RecommendationRepository recommendations, ReportRepository reports) {
        this.analyses = analyses;
        this.recommendations = recommendations;
        this.reports = reports;
    }

    private Response dto(AnalysisHistory analysis) {
        return new Response(analysis.getId(), analysis.getRecommendationId(), analysis.getReportIds(),
            analysis.getAnalysisType(), analysis.isComplete(), analysis.getAnalyzedAt(), analysis.getAnalysis());
    }

    public Response save(String userId, Create request) {
        Recommendation recommendation = recommendations.findById(request.recommendationId()).filter(item -> item.getUserId().equals(userId))
            .orElseThrow(() -> new ResourceNotFoundException("Recommendation set not found"));
        List<Report> currentReports = reports.findByUserIdAndRecommendationIdOrderByUploadedAtDesc(userId, request.recommendationId());
        if (currentReports.isEmpty()) throw new IllegalArgumentException("Upload at least one report before analysis.");
        String analysisType = request.analysisType().trim().toUpperCase(Locale.ROOT);
        if (!SET_ANALYSIS.equals(analysisType) && !INDIVIDUAL_ANALYSIS.equals(analysisType)) {
            throw new IllegalArgumentException("analysisType must be SET or INDIVIDUAL.");
        }
        Set<String> currentReportIds = currentReports.stream().map(Report::getId).collect(java.util.stream.Collectors.toSet());
        Set<String> requestedReportIds = Set.copyOf(request.reportIds());
        if (!currentReportIds.containsAll(requestedReportIds)) {
            throw new IllegalArgumentException("Every analysed report must belong to this recommendation set.");
        }
        boolean complete;
        if (SET_ANALYSIS.equals(analysisType)) {
            if (!currentReportIds.equals(requestedReportIds)) {
                throw new IllegalArgumentException("Set analysis must include every report currently uploaded for this recommendation set.");
            }
            requireEveryRecommendedTestHasReport(recommendation, currentReports);
            if (!request.complete()) throw new IllegalArgumentException("Confirm that all recommended-test reports have been uploaded before set analysis.");
            complete = true;
        } else {
            if (requestedReportIds.size() != 1) {
                throw new IllegalArgumentException("Individual analysis must contain exactly one uploaded report.");
            }
            complete = false;
        }
        AnalysisHistory analysis = new AnalysisHistory();
        analysis.setUserId(userId);
        analysis.setRecommendationId(request.recommendationId());
        analysis.setReportIds(List.copyOf(request.reportIds()));
        analysis.setAnalysisType(analysisType);
        analysis.setComplete(complete);
        analysis.setAnalysis(Map.copyOf(request.analysis()));
        analysis.setAnalyzedAt(Instant.now());
        return dto(analyses.save(analysis));
    }

    public List<Response> list(String userId) { return analyses.findByUserIdOrderByAnalyzedAtDesc(userId).stream().map(this::dto).toList(); }
    public Response get(String userId, String id) { return dto(findOwned(userId, id)); }
    public void delete(String userId, String id) { analyses.delete(findOwned(userId, id)); }

    private void requireEveryRecommendedTestHasReport(Recommendation recommendation, List<Report> currentReports) {
        Set<String> uploadedTests = currentReports.stream().map(Report::getRecommendedTestName)
            .filter(java.util.Objects::nonNull).map(this::normalize).collect(java.util.stream.Collectors.toSet());
        List<String> missingTests = recommendation.getRecommendations().stream()
            .map(item -> item.getOrDefault("test_name", item.getOrDefault("name", "")).toString())
            .filter(name -> !name.isBlank()).filter(name -> !uploadedTests.contains(normalize(name))).distinct().toList();
        if (!missingTests.isEmpty()) {
            throw new IllegalArgumentException("Upload a report for every recommended test before set analysis. Missing: " + String.join(", ", missingTests));
        }
    }

    private AnalysisHistory findOwned(String userId, String id) {
        return analyses.findById(id).filter(analysis -> analysis.getUserId().equals(userId))
            .orElseThrow(() -> new ResourceNotFoundException("Analysis not found"));
    }
    private String normalize(String value) { return value.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT); }
}

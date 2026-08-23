package com.healthwise.analysis.service;

import com.healthwise.analysis.dto.AnalysisDtos.Create;
import com.healthwise.analysis.dto.AnalysisDtos.Response;
import com.healthwise.analysis.entity.AnalysisHistory;
import com.healthwise.analysis.repository.AnalysisHistoryRepository;
import com.healthwise.exception.ResourceNotFoundException;
import com.healthwise.recommendation.repository.RecommendationRepository;
import com.healthwise.report.entity.Report;
import com.healthwise.report.repository.ReportRepository;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class AnalysisService {
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
            analysis.isComplete(), analysis.getAnalyzedAt(), analysis.getAnalysis());
    }

    public Response save(String userId, Create request) {
        recommendations.findById(request.recommendationId()).filter(item -> item.getUserId().equals(userId))
            .orElseThrow(() -> new ResourceNotFoundException("Recommendation set not found"));
        List<Report> currentReports = reports.findByUserIdAndRecommendationIdOrderByUploadedAtDesc(userId, request.recommendationId());
        if (currentReports.isEmpty()) throw new IllegalArgumentException("Upload at least one report before analysis.");
        Set<String> savedReportIds = currentReports.stream().map(Report::getId).collect(java.util.stream.Collectors.toSet());
        if (!savedReportIds.equals(Set.copyOf(request.reportIds()))) {
            throw new IllegalArgumentException("Analysis must include every report currently uploaded for this recommendation set.");
        }
        AnalysisHistory analysis = new AnalysisHistory();
        analysis.setUserId(userId);
        analysis.setRecommendationId(request.recommendationId());
        analysis.setReportIds(List.copyOf(request.reportIds()));
        analysis.setComplete(request.complete());
        analysis.setAnalysis(Map.copyOf(request.analysis()));
        analysis.setAnalyzedAt(Instant.now());
        return dto(analyses.save(analysis));
    }

    public List<Response> list(String userId) {
        return analyses.findByUserIdOrderByAnalyzedAtDesc(userId).stream().map(this::dto).toList();
    }

    public Response get(String userId, String id) { return dto(findOwned(userId, id)); }

    public void delete(String userId, String id) { analyses.delete(findOwned(userId, id)); }

    private AnalysisHistory findOwned(String userId, String id) {
        return analyses.findById(id).filter(analysis -> analysis.getUserId().equals(userId))
            .orElseThrow(() -> new ResourceNotFoundException("Analysis not found"));
    }
}

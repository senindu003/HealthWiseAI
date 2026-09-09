package com.healthwise.recommendation.service;

import com.healthwise.analysis.repository.AnalysisHistoryRepository;
import com.healthwise.exception.ResourceNotFoundException;
import com.healthwise.recommendation.dto.RecommendationDtos.Create;
import com.healthwise.recommendation.dto.RecommendationDtos.Response;
import com.healthwise.recommendation.entity.Recommendation;
import com.healthwise.recommendation.repository.RecommendationRepository;
import com.healthwise.report.entity.Report;
import com.healthwise.report.repository.ReportRepository;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.gridfs.GridFsTemplate;
import org.springframework.stereotype.Service;

@Service
public class RecommendationService {
    /** A user keeps at most five complete, independently managed recommendation records. */
    public static final int MAX_RECOMMENDATION_SETS = 5;
    private final RecommendationRepository recommendations;
    private final ReportRepository reports;
    private final AnalysisHistoryRepository analyses;
    private final GridFsTemplate gridFs;
    private final Stage4ResultVerifier stage4Results;

    public RecommendationService(RecommendationRepository recommendations, ReportRepository reports,
                                 AnalysisHistoryRepository analyses, GridFsTemplate gridFs, Stage4ResultVerifier stage4Results) {
        this.recommendations = recommendations;
        this.reports = reports;
        this.analyses = analyses;
        this.gridFs = gridFs;
        this.stage4Results = stage4Results;
    }

    private Response dto(Recommendation recommendation) {
        return new Response(recommendation.getId(), recommendation.getQuestionnaireId(), recommendation.getGeneratedAt(),
            recommendation.getSummary(), recommendation.getRecommendations(), recommendation.getValidatedResult());
    }

    public Response save(String userId, Create request) {
        if (recommendations.countByUserId(userId) >= MAX_RECOMMENDATION_SETS) {
            throw new IllegalArgumentException("You can keep up to five recommendation sets. Delete an older set before creating another.");
        }
        Map<String,Object> validated = stage4Results.verifiedResult(request.stage4ValidationToken());
        Object rawRecommendations = validated.get("recommendations");
        if (!(rawRecommendations instanceof List<?> rawList)) {
            throw new IllegalArgumentException("The validated Stage 4 result has no recommendation list.");
        }
        List<Map<String,Object>> tests = rawList.stream().map(item -> {
            if (!(item instanceof Map<?,?> raw)) throw new IllegalArgumentException("The validated Stage 4 result is malformed.");
            @SuppressWarnings("unchecked") Map<String,Object> typed = (Map<String,Object>) raw;
            return typed;
        }).toList();
        Recommendation recommendation = new Recommendation();
        recommendation.setUserId(userId);
        recommendation.setQuestionnaireId(request.questionnaireId());
        recommendation.setGeneratedAt(Instant.now());
        recommendation.setSummary(String.valueOf(validated.getOrDefault("summary", "Validated Stage 4 review")));
        recommendation.setRecommendations(List.copyOf(tests));
        recommendation.setValidatedResult(validated);
        return dto(recommendations.save(recommendation));
    }

    public List<Response> list(String userId) {
        return recommendations.findByUserIdOrderByGeneratedAtDesc(userId).stream().map(this::dto).toList();
    }

    public Response get(String userId, String id) { return dto(findOwned(userId, id)); }

    /** Permanently deletes the set plus every linked GridFS PDF and analysis. */
    public void delete(String userId, String id) {
        Recommendation recommendation = findOwned(userId, id);
        analyses.deleteAll(analyses.findByUserIdAndRecommendationIdOrderByAnalyzedAtDesc(userId, id));
        for (Report report : reports.findByUserIdAndRecommendationIdOrderByUploadedAtDesc(userId, id)) {
            if (report.getStorageId() != null && ObjectId.isValid(report.getStorageId())) {
                gridFs.delete(new Query(Criteria.where("_id").is(new ObjectId(report.getStorageId()))));
            }
            reports.delete(report);
        }
        recommendations.delete(recommendation);
    }

    private Recommendation findOwned(String userId, String id) {
        return recommendations.findById(id).filter(item -> item.getUserId().equals(userId))
            .orElseThrow(() -> new ResourceNotFoundException("Recommendation set not found"));
    }
}

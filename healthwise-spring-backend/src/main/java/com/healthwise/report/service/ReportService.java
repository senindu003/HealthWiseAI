package com.healthwise.report.service;

import com.healthwise.analysis.repository.AnalysisHistoryRepository;
import com.healthwise.exception.ResourceNotFoundException;
import com.healthwise.recommendation.entity.Recommendation;
import com.healthwise.recommendation.repository.RecommendationRepository;
import com.healthwise.report.dto.ReportDtos.Response;
import com.healthwise.report.entity.Report;
import com.healthwise.report.repository.ReportRepository;
import com.mongodb.client.gridfs.model.GridFSFile;
import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import java.util.List;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.gridfs.GridFsResource;
import org.springframework.data.mongodb.gridfs.GridFsTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ReportService {
    private final ReportRepository reports;
    private final RecommendationRepository recommendations;
    private final AnalysisHistoryRepository analyses;
    private final GridFsTemplate gridFs;

    public ReportService(ReportRepository reports, RecommendationRepository recommendations,
                         AnalysisHistoryRepository analyses, GridFsTemplate gridFs) {
        this.reports = reports;
        this.recommendations = recommendations;
        this.analyses = analyses;
        this.gridFs = gridFs;
    }

    private Response dto(Report report) {
        return new Response(report.getId(), report.getRecommendationId(), report.getRecommendedTestName(), report.getReportName(),
            report.getUploadedAt(), report.getReportType());
    }

    public Response upload(String userId, String recommendationId, String testName, MultipartFile file) {
        Recommendation recommendation = requireOwnedRecommendation(userId, recommendationId);
        if (testName == null || testName.isBlank() || !recommendedTestNames(recommendation).contains(normalize(testName))) {
            throw new IllegalArgumentException("Choose a test from this recommendation set before uploading its report.");
        }
        String fileName = file.getOriginalFilename();
        if (file.isEmpty() || fileName == null || !fileName.toLowerCase().endsWith(".pdf")
            || fileName.contains("/") || fileName.contains("\\")) {
            throw new IllegalArgumentException("Upload a non-empty PDF laboratory report.");
        }
        String storageId;
        try (InputStream input = file.getInputStream()) {
            storageId = gridFs.store(input, fileName, file.getContentType()).toHexString();
        } catch (IOException exception) {
            throw new IllegalStateException("Could not store the uploaded report.", exception);
        }
        try {
            Report report = new Report();
            report.setUserId(userId);
            report.setRecommendationId(recommendationId);
            report.setRecommendedTestName(testName.trim());
            report.setStorageId(storageId);
            report.setReportName(fileName);
            report.setReportType("Laboratory Report");
            report.setUploadedAt(Instant.now());
            // A new file makes every previous aggregate analysis stale.
            analyses.deleteAll(analyses.findByUserIdAndRecommendationIdOrderByAnalyzedAtDesc(userId, recommendationId));
            return dto(reports.save(report));
        } catch (RuntimeException exception) {
            deleteStoredFile(storageId);
            throw exception;
        }
    }

    public List<Response> list(String userId, String recommendationId) {
        if (recommendationId == null || recommendationId.isBlank()) {
            return reports.findByUserIdOrderByUploadedAtDesc(userId).stream().map(this::dto).toList();
        }
        requireOwnedRecommendation(userId, recommendationId);
        return reports.findByUserIdAndRecommendationIdOrderByUploadedAtDesc(userId, recommendationId).stream().map(this::dto).toList();
    }

    public Response get(String userId, String id) { return dto(findOwned(userId, id)); }

    public GridFsResource file(String userId, String id) {
        Report report = findOwned(userId, id);
        if (report.getStorageId() == null || !ObjectId.isValid(report.getStorageId())) {
            throw new ResourceNotFoundException("Report file not found");
        }
        GridFSFile stored = gridFs.findOne(new Query(Criteria.where("_id").is(new ObjectId(report.getStorageId()))));
        if (stored == null) throw new ResourceNotFoundException("Report file not found");
        return gridFs.getResource(stored);
    }

    public void delete(String userId, String id) {
        Report report = findOwned(userId, id);
        analyses.deleteAll(analyses.findByUserIdAndRecommendationIdOrderByAnalyzedAtDesc(userId, report.getRecommendationId()));
        reports.delete(report);
        deleteStoredFile(report.getStorageId());
    }

    private Report findOwned(String userId, String id) {
        return reports.findById(id).filter(report -> report.getUserId().equals(userId))
            .orElseThrow(() -> new ResourceNotFoundException("Report not found"));
    }

    private Recommendation requireOwnedRecommendation(String userId, String recommendationId) {
        return recommendations.findById(recommendationId).filter(recommendation -> recommendation.getUserId().equals(userId))
            .orElseThrow(() -> new ResourceNotFoundException("Recommendation set not found"));
    }

    private java.util.Set<String> recommendedTestNames(Recommendation recommendation) {
        return recommendation.getRecommendations().stream()
            .map(item -> item.getOrDefault("test_name", item.getOrDefault("name", "")).toString())
            .map(this::normalize).filter(name -> !name.isBlank()).collect(java.util.stream.Collectors.toSet());
    }

    private String normalize(String value) { return value.trim().replaceAll("\\s+", " ").toLowerCase(java.util.Locale.ROOT); }

    private void deleteStoredFile(String storageId) {
        if (storageId != null && ObjectId.isValid(storageId)) {
            gridFs.delete(new Query(Criteria.where("_id").is(new ObjectId(storageId))));
        }
    }
}

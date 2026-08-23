package com.healthwise.report.repository;

import com.healthwise.report.entity.Report;
import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ReportRepository extends MongoRepository<Report, String> {
    List<Report> findByUserIdOrderByUploadedAtDesc(String userId);
    List<Report> findByUserIdAndRecommendationIdOrderByUploadedAtDesc(String userId, String recommendationId);
    Optional<Report> findFirstByUserIdOrderByUploadedAtDesc(String userId);
}

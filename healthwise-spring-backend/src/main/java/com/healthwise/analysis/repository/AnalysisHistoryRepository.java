package com.healthwise.analysis.repository;

import com.healthwise.analysis.entity.AnalysisHistory;
import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface AnalysisHistoryRepository extends MongoRepository<AnalysisHistory, String> {
    List<AnalysisHistory> findByUserIdOrderByAnalyzedAtDesc(String userId);
    List<AnalysisHistory> findByUserIdAndRecommendationIdOrderByAnalyzedAtDesc(String userId, String recommendationId);
    Optional<AnalysisHistory> findFirstByUserIdOrderByAnalyzedAtDesc(String userId);
    long countByUserId(String userId);
}

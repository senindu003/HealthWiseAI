package com.healthwise.analysis.entity;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

/** A report analysis always belongs to one recommendation set. */
@Document("analysis_history")
public class AnalysisHistory {
    @Id private String id;
    @Indexed private String userId;
    @Indexed private String recommendationId;
    private String analysisType;
    private List<String> reportIds;
    private boolean complete;
    private Instant analyzedAt;
    private Map<String, Object> analysis;
    public String getId() { return id; }
    public String getUserId() { return userId; }
    public String getRecommendationId() { return recommendationId; }
    public String getAnalysisType() { return analysisType; }
    public List<String> getReportIds() { return reportIds; }
    public boolean isComplete() { return complete; }
    public Instant getAnalyzedAt() { return analyzedAt; }
    public Map<String, Object> getAnalysis() { return analysis; }
    public void setUserId(String value) { userId = value; }
    public void setRecommendationId(String value) { recommendationId = value; }
    public void setAnalysisType(String value) { analysisType = value; }
    public void setReportIds(List<String> value) { reportIds = value; }
    public void setComplete(boolean value) { complete = value; }
    public void setAnalyzedAt(Instant value) { analyzedAt = value; }
    public void setAnalysis(Map<String, Object> value) { analysis = value; }
}

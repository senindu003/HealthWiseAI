package com.healthwise.report.entity;

import java.time.Instant;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

/** Metadata for a laboratory-report PDF stored privately in Mongo GridFS. */
@Document("reports")
public class Report {
    @Id private String id;
    @Indexed private String userId;
    @Indexed private String recommendationId;
    private String storageId;
    private String reportName;
    private Instant uploadedAt;
    private String reportType;
    public String getId() { return id; }
    public String getUserId() { return userId; }
    public String getRecommendationId() { return recommendationId; }
    public String getStorageId() { return storageId; }
    public String getReportName() { return reportName; }
    public Instant getUploadedAt() { return uploadedAt; }
    public String getReportType() { return reportType; }
    public void setUserId(String value) { userId = value; }
    public void setRecommendationId(String value) { recommendationId = value; }
    public void setStorageId(String value) { storageId = value; }
    public void setReportName(String value) { reportName = value; }
    public void setUploadedAt(Instant value) { uploadedAt = value; }
    public void setReportType(String value) { reportType = value; }
}

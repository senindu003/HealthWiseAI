package com.healthwise.recommendation.entity;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

/** Only a FastAPI-signed, already validated Stage 4 payload is retained. */
@Document("recommendations")
public class Recommendation {
    @Id private String id;
    @Indexed private String userId;
    @Indexed private String questionnaireId;
    private Instant generatedAt;
    private String summary;
    private List<Map<String, Object>> recommendations;
    private Map<String, Object> validatedResult;
    public String getId(){return id;} public String getUserId(){return userId;} public String getQuestionnaireId(){return questionnaireId;}
    public Instant getGeneratedAt(){return generatedAt;} public String getSummary(){return summary;}
    public List<Map<String,Object>> getRecommendations(){return recommendations;} public Map<String,Object> getValidatedResult(){return validatedResult;}
    public void setUserId(String v){userId=v;} public void setQuestionnaireId(String v){questionnaireId=v;} public void setGeneratedAt(Instant v){generatedAt=v;}
    public void setSummary(String v){summary=v;} public void setRecommendations(List<Map<String,Object>> v){recommendations=v;}
    public void setValidatedResult(Map<String,Object> v){validatedResult=v;}
}

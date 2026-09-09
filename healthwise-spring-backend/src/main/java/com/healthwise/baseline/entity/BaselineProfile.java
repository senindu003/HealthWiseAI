package com.healthwise.baseline.entity;

import java.time.Instant;
import java.util.Map;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/** One overwriteable Stage 1–2 baseline per user; Stage 3 is never stored here. */
@Document("baseline_profiles")
public class BaselineProfile {
    @Id private String userId;
    private Instant updatedAt;
    private Map<String, Object> questionnaire;
    public String getUserId(){ return userId; }
    public Instant getUpdatedAt(){ return updatedAt; }
    public Map<String, Object> getQuestionnaire(){ return questionnaire; }
    public void setUserId(String value){ userId=value; }
    public void setUpdatedAt(Instant value){ updatedAt=value; }
    public void setQuestionnaire(Map<String, Object> value){ questionnaire=value; }
}

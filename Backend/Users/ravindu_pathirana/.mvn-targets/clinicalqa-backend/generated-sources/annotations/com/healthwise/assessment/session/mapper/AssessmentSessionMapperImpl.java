package com.healthwise.assessment.session.mapper;

import com.healthwise.assessment.session.dto.response.AssessmentSessionResponse;
import com.healthwise.assessment.session.model.AssessmentSession;
import com.healthwise.assessment.session.model.SessionStatus;
import com.healthwise.assessment.session.model.StageType;
import com.healthwise.assessment.session.model.assessmentdata.AssessmentData;
import java.time.Instant;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-07-04T13:05:17+0530",
    comments = "version: 1.6.3, compiler: Eclipse JDT (IDE) 3.46.100.v20260624-0231, environment: Java 21.0.11 (Homebrew)"
)
@Component
public class AssessmentSessionMapperImpl implements AssessmentSessionMapper {

    @Override
    public AssessmentSessionResponse toResponse(AssessmentSession entity) {
        if ( entity == null ) {
            return null;
        }

        String sessionId = null;
        String userId = null;
        String assessmentVersion = null;
        SessionStatus status = null;
        StageType currentStage = null;
        Instant startedAt = null;
        Instant updatedAt = null;
        Instant completedAt = null;
        Instant lastAutoSavedAt = null;
        AssessmentData assessmentData = null;

        sessionId = entity.getSessionId();
        userId = entity.getUserId();
        assessmentVersion = entity.getAssessmentVersion();
        status = entity.getStatus();
        currentStage = entity.getCurrentStage();
        startedAt = entity.getStartedAt();
        updatedAt = entity.getUpdatedAt();
        completedAt = entity.getCompletedAt();
        lastAutoSavedAt = entity.getLastAutoSavedAt();
        assessmentData = entity.getAssessmentData();

        AssessmentSessionResponse assessmentSessionResponse = new AssessmentSessionResponse( sessionId, userId, assessmentVersion, status, currentStage, startedAt, updatedAt, completedAt, lastAutoSavedAt, assessmentData );

        return assessmentSessionResponse;
    }
}

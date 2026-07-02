package com.healthwise.assessment.session.dto.response;

import com.healthwise.assessment.session.model.SessionStatus;
import com.healthwise.assessment.session.model.StageType;
import com.healthwise.assessment.session.model.assessmentdata.AssessmentData;

import java.time.Instant;

/**
 * Full session response. Deliberately omits the internal Mongo {@code id} - callers
 * address sessions by {@code sessionId}. Reuses the entity's nested {@link AssessmentData}
 * tree directly (it's a plain data holder with no persistence-only fields) instead of a
 * parallel response DTO hierarchy, keeping mapping trivial and avoiding duplication.
 */
public record AssessmentSessionResponse(
        String sessionId,
        String userId,
        String assessmentVersion,
        SessionStatus status,
        StageType currentStage,
        Instant startedAt,
        Instant updatedAt,
        Instant completedAt,
        Instant lastAutoSavedAt,
        AssessmentData assessmentData
) {
}

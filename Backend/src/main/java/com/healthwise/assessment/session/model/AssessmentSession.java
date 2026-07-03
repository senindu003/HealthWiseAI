package com.healthwise.assessment.session.model;

import com.healthwise.assessment.session.model.assessmentdata.AssessmentData;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * Single-document-per-session model: the full assessment payload is embedded via
 * {@link AssessmentData} rather than split across collections, since a session is
 * always read/written as one unit (autosave, resume, complete).
 */
/**
 * The compound index is a unique partial index scoped to status=IN_PROGRESS: it still
 * backs the userId+status lookup used by "current session", but its uniqueness only
 * applies to in-progress sessions, so completed/cancelled history can accumulate freely
 * while guaranteeing at most one active session per user even under concurrent creates.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "assessment_sessions")
@CompoundIndex(
        name = "unique_in_progress_per_user_idx",
        def = "{'userId': 1, 'status': 1}",
        unique = true,
        partialFilter = "{'status': 'IN_PROGRESS'}"
)
public class AssessmentSession {

    @Id
    private String id;

    @Indexed(unique = true, name = "sessionId_idx")
    private String sessionId;

    @Indexed(name = "userId_idx")
    private String userId;

    private String assessmentVersion;

    @Indexed(name = "status_idx")
    private SessionStatus status;

    private StageType currentStage;

    private Instant startedAt;

    @Indexed(name = "updatedAt_idx")
    private Instant updatedAt;

    private Instant completedAt;

    private Instant lastAutoSavedAt;

    private AssessmentData assessmentData = new AssessmentData();
}

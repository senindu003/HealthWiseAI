package com.healthwise.assessment.session.repository;

import com.healthwise.assessment.session.model.AssessmentSession;
import com.healthwise.assessment.session.model.SessionStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface AssessmentSessionRepository extends MongoRepository<AssessmentSession, String> {

    Optional<AssessmentSession> findBySessionId(String sessionId);

    Optional<AssessmentSession> findByUserIdAndStatus(String userId, SessionStatus status);
}

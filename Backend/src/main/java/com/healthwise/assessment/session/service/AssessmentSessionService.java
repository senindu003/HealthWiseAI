package com.healthwise.assessment.session.service;

import com.healthwise.assessment.session.dto.request.AutoSaveRequest;
import com.healthwise.assessment.session.dto.request.CreateSessionRequest;
import com.healthwise.assessment.session.dto.request.UpdateStageRequest;
import com.healthwise.assessment.session.dto.response.AssessmentSessionResponse;

public interface AssessmentSessionService {

    AssessmentSessionResponse createSession(String userId, CreateSessionRequest request);

    AssessmentSessionResponse getCurrentSession(String userId);

    AssessmentSessionResponse getSession(String userId, String sessionId);

    AssessmentSessionResponse updateStage(String userId, String sessionId, UpdateStageRequest request);

    AssessmentSessionResponse autoSave(String userId, String sessionId, AutoSaveRequest request);

    AssessmentSessionResponse completeSession(String userId, String sessionId);

    AssessmentSessionResponse cancelSession(String userId, String sessionId);
}

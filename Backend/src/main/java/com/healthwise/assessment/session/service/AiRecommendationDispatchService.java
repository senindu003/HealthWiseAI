package com.healthwise.assessment.session.service;

import com.healthwise.assessment.session.model.AssessmentSession;

/**
 * Seam for the future FastAPI AI backend hop. When a session is completed, its
 * assessmentData needs to be sent for AI analysis - not implemented yet, kept as its
 * own interface so the real implementation (e.g. a WebClient call) can be swapped in
 * later without touching {@link com.healthwise.assessment.session.service.AssessmentSessionService}.
 */
public interface AiRecommendationDispatchService {

    void dispatchForAnalysis(AssessmentSession session);
}

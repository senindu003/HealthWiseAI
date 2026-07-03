package com.healthwise.assessment.session.service.impl;

import com.healthwise.assessment.session.model.AssessmentSession;
import com.healthwise.assessment.session.service.AiRecommendationDispatchService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class AiRecommendationDispatchServiceImpl implements AiRecommendationDispatchService {

    private static final Logger log = LoggerFactory.getLogger(AiRecommendationDispatchServiceImpl.class);

    @Override
    public void dispatchForAnalysis(AssessmentSession session) {
        // TODO: once the FastAPI AI backend is available, POST session.getAssessmentData()
        // to it here (e.g. via a WebClient/RestClient bean) and store the returned
        // recommendation reference on the session. No-op for now.
        log.info("Assessment session {} completed - AI dispatch not yet implemented", session.getSessionId());
    }
}

package com.healthwise.assessment.session.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.healthwise.assessment.common.exception.InvalidSessionStateException;
import com.healthwise.assessment.common.exception.ResourceNotFoundException;
import com.healthwise.assessment.common.exception.SessionAccessDeniedException;
import com.healthwise.assessment.session.dto.request.AutoSaveRequest;
import com.healthwise.assessment.session.dto.request.CreateSessionRequest;
import com.healthwise.assessment.session.dto.request.UpdateStageRequest;
import com.healthwise.assessment.session.dto.response.AssessmentSessionResponse;
import com.healthwise.assessment.session.mapper.AssessmentSessionMapper;
import com.healthwise.assessment.session.model.AssessmentSession;
import com.healthwise.assessment.session.model.SessionStatus;
import com.healthwise.assessment.session.model.StageType;
import com.healthwise.assessment.session.model.assessmentdata.AssessmentData;
import com.healthwise.assessment.session.model.assessmentdata.BasicProfile;
import com.healthwise.assessment.session.model.assessmentdata.SymptomsData;
import com.healthwise.assessment.session.repository.AssessmentSessionRepository;
import com.healthwise.assessment.session.service.AiRecommendationDispatchService;
import com.healthwise.assessment.session.service.AssessmentSessionService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
public class AssessmentSessionServiceImpl implements AssessmentSessionService {

    private static final Set<String> EMERGENCY_SYMPTOMS = Set.of("Chest Pain", "Shortness of Breath");

    private final AssessmentSessionRepository repository;
    private final AssessmentSessionMapper mapper;
    private final ObjectMapper objectMapper;
    private final AiRecommendationDispatchService aiRecommendationDispatchService;
    private final String defaultVersion;

    public AssessmentSessionServiceImpl(AssessmentSessionRepository repository,
                                         AssessmentSessionMapper mapper,
                                         ObjectMapper objectMapper,
                                         AiRecommendationDispatchService aiRecommendationDispatchService,
                                         @Value("${healthwise.assessment.default-version}") String defaultVersion) {
        this.repository = repository;
        this.mapper = mapper;
        this.objectMapper = objectMapper;
        this.aiRecommendationDispatchService = aiRecommendationDispatchService;
        this.defaultVersion = defaultVersion;
    }

    @Override
    public AssessmentSessionResponse createSession(String userId, CreateSessionRequest request) {
        Optional<AssessmentSession> existing = repository.findByUserIdAndStatus(userId, SessionStatus.IN_PROGRESS);
        if (existing.isPresent()) {
            return mapper.toResponse(existing.get());
        }
        try {
            return mapper.toResponse(repository.save(newSession(userId, request)));
        } catch (DuplicateKeyException e) {
            // Lost a race against a concurrent create for the same user (enforced by the
            // unique partial index on {userId, status=IN_PROGRESS}) - the winner is now
            // findable, so return that instead of failing the request.
            return repository.findByUserIdAndStatus(userId, SessionStatus.IN_PROGRESS)
                    .map(mapper::toResponse)
                    .orElseThrow(() -> e);
        }
    }

    @Override
    public AssessmentSessionResponse getCurrentSession(String userId) {
        AssessmentSession session = repository.findByUserIdAndStatus(userId, SessionStatus.IN_PROGRESS)
                .orElseThrow(() -> new ResourceNotFoundException("No active assessment session for this user"));
        return mapper.toResponse(session);
    }

    @Override
    public AssessmentSessionResponse getSession(String userId, String sessionId) {
        return mapper.toResponse(loadOwnedSession(userId, sessionId));
    }

    @Override
    public AssessmentSessionResponse updateStage(String userId, String sessionId, UpdateStageRequest request) {
        AssessmentSession session = loadOwnedSession(userId, sessionId);
        requireInProgress(session);
        mergeStageData(session.getAssessmentData(), request.stage(), request.data());
        session.setCurrentStage(request.shouldMarkStageComplete() ? request.stage().next() : request.stage());
        session.setUpdatedAt(Instant.now());
        return mapper.toResponse(repository.save(session));
    }

    @Override
    public AssessmentSessionResponse autoSave(String userId, String sessionId, AutoSaveRequest request) {
        AssessmentSession session = loadOwnedSession(userId, sessionId);
        requireInProgress(session);
        mergeStageData(session.getAssessmentData(), request.stage(), request.data());
        Instant now = Instant.now();
        session.setLastAutoSavedAt(now);
        session.setUpdatedAt(now);
        return mapper.toResponse(repository.save(session));
    }

    @Override
    public AssessmentSessionResponse completeSession(String userId, String sessionId) {
        AssessmentSession session = loadOwnedSession(userId, sessionId);
        requireInProgress(session);
        Instant now = Instant.now();
        session.setStatus(SessionStatus.COMPLETED);
        session.setCompletedAt(now);
        session.setUpdatedAt(now);
        AssessmentSession saved = repository.save(session);
        aiRecommendationDispatchService.dispatchForAnalysis(saved);
        return mapper.toResponse(saved);
    }

    @Override
    public AssessmentSessionResponse cancelSession(String userId, String sessionId) {
        AssessmentSession session = loadOwnedSession(userId, sessionId);
        requireInProgress(session);
        session.setStatus(SessionStatus.CANCELLED);
        session.setUpdatedAt(Instant.now());
        return mapper.toResponse(repository.save(session));
    }

    private AssessmentSession newSession(String userId, CreateSessionRequest request) {
        Instant now = Instant.now();
        AssessmentSession session = new AssessmentSession();
        session.setSessionId(UUID.randomUUID().toString());
        session.setUserId(userId);
        String requestedVersion = request == null ? null : request.assessmentVersion();
        session.setAssessmentVersion(requestedVersion != null ? requestedVersion : defaultVersion);
        session.setStatus(SessionStatus.IN_PROGRESS);
        session.setCurrentStage(StageType.STAGE_1_BASIC_PROFILE);
        session.setStartedAt(now);
        session.setUpdatedAt(now);
        session.setAssessmentData(new AssessmentData());
        return session;
    }

    private AssessmentSession loadOwnedSession(String userId, String sessionId) {
        AssessmentSession session = repository.findBySessionId(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Assessment session not found: " + sessionId));
        if (!session.getUserId().equals(userId)) {
            throw new SessionAccessDeniedException("This assessment session does not belong to the requesting user");
        }
        return session;
    }

    private void requireInProgress(AssessmentSession session) {
        if (session.getStatus() != SessionStatus.IN_PROGRESS) {
            throw new InvalidSessionStateException(
                    "Assessment session " + session.getSessionId() + " is not in progress (status=" + session.getStatus() + ")");
        }
    }

    /**
     * Single point of "which StageType maps to which nested section(s)" - adding a
     * future stage only needs one new case here, no controller/DTO changes.
     */
    private void mergeStageData(AssessmentData data, StageType stage, Map<String, Object> raw) {
        try {
            switch (stage) {
                case STAGE_1_BASIC_PROFILE -> mergeBasicProfileAndLifestyle(data, raw);
                case STAGE_2_MEDICAL_HISTORY -> objectMapper.updateValue(data.getMedicalHistory(), raw);
                case STAGE_3_SYMPTOMS -> mergeSymptoms(data, raw);
                case STAGE_4_REVIEW -> objectMapper.updateValue(data.getPreferences(), raw);
            }
        } catch (JsonMappingException e) {
            throw new InvalidSessionStateException("Invalid stage data payload for " + stage + ": " + e.getOriginalMessage());
        }
    }

    private void mergeBasicProfileAndLifestyle(AssessmentData data, Map<String, Object> raw) throws JsonMappingException {
        objectMapper.updateValue(data.getBasicProfile(), raw);
        objectMapper.updateValue(data.getLifestyle(), raw);
        recomputeBmi(data.getBasicProfile());
    }

    private void recomputeBmi(BasicProfile profile) {
        if (profile.getHeight() != null && profile.getWeight() != null && profile.getHeight() > 0) {
            double heightMeters = profile.getHeight() / 100.0;
            profile.setBmi(profile.getWeight() / (heightMeters * heightMeters));
        }
    }

    private void mergeSymptoms(AssessmentData data, Map<String, Object> raw) throws JsonMappingException {
        objectMapper.updateValue(data.getSymptoms(), raw);
        recomputeSymptomDerivations(data.getSymptoms());
    }

    private void recomputeSymptomDerivations(SymptomsData symptoms) {
        List<String> allSymptoms = symptoms.getSymptomsByCategory().values().stream()
                .flatMap(List::stream)
                .toList();
        boolean hasEmergency = allSymptoms.stream().anyMatch(EMERGENCY_SYMPTOMS::contains);
        int totalCount = allSymptoms.size();
        String riskLevel = hasEmergency ? "High Risk" : totalCount > 3 ? "Moderate" : "Low";
        symptoms.setTotalCount(totalCount);
        symptoms.setHasEmergency(hasEmergency);
        symptoms.setRiskLevel(riskLevel);
    }
}

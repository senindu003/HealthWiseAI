package com.healthwise.assessment.session.controller;

import com.healthwise.assessment.auth.security.CurrentUserProvider;
import com.healthwise.assessment.common.response.ApiResponse;
import com.healthwise.assessment.session.dto.request.AutoSaveRequest;
import com.healthwise.assessment.session.dto.request.CreateSessionRequest;
import com.healthwise.assessment.session.dto.request.UpdateStageRequest;
import com.healthwise.assessment.session.dto.response.AssessmentSessionResponse;
import com.healthwise.assessment.session.service.AssessmentSessionService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Thin controller - all logic lives in {@link AssessmentSessionService}. The requesting
 * user is identified from the JWT authenticated principal via {@link CurrentUserProvider};
 * every service method already takes userId as an explicit parameter, so this layer is the
 * only place identity is resolved.
 */
@RestController
@RequestMapping("/api/assessment-sessions")
public class AssessmentSessionController {

    private final AssessmentSessionService service;
    private final CurrentUserProvider currentUserProvider;

    public AssessmentSessionController(AssessmentSessionService service, CurrentUserProvider currentUserProvider) {
        this.service = service;
        this.currentUserProvider = currentUserProvider;
    }

    @PostMapping
    public ApiResponse<AssessmentSessionResponse> create(@RequestBody(required = false) CreateSessionRequest request) {
        return ApiResponse.success(service.createSession(currentUserProvider.currentUserId(), request));
    }

    @GetMapping("/current")
    public ApiResponse<AssessmentSessionResponse> getCurrent() {
        return ApiResponse.success(service.getCurrentSession(currentUserProvider.currentUserId()));
    }

    @GetMapping("/{sessionId}")
    public ApiResponse<AssessmentSessionResponse> getOne(@PathVariable String sessionId) {
        return ApiResponse.success(service.getSession(currentUserProvider.currentUserId(), sessionId));
    }

    @PutMapping("/{sessionId}/stage")
    public ApiResponse<AssessmentSessionResponse> updateStage(
            @PathVariable String sessionId,
            @Valid @RequestBody UpdateStageRequest request) {
        return ApiResponse.success(service.updateStage(currentUserProvider.currentUserId(), sessionId, request));
    }

    @PutMapping("/{sessionId}/autosave")
    public ApiResponse<AssessmentSessionResponse> autoSave(
            @PathVariable String sessionId,
            @Valid @RequestBody AutoSaveRequest request) {
        return ApiResponse.success(service.autoSave(currentUserProvider.currentUserId(), sessionId, request));
    }

    @PostMapping("/{sessionId}/complete")
    public ApiResponse<AssessmentSessionResponse> complete(@PathVariable String sessionId) {
        return ApiResponse.success(service.completeSession(currentUserProvider.currentUserId(), sessionId));
    }

    @DeleteMapping("/{sessionId}")
    public ApiResponse<AssessmentSessionResponse> cancel(@PathVariable String sessionId) {
        return ApiResponse.success(service.cancelSession(currentUserProvider.currentUserId(), sessionId));
    }
}

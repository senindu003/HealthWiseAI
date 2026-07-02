package com.healthwise.assessment.session.controller;

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
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Thin controller - all logic lives in {@link AssessmentSessionService}. The requesting
 * user is identified via the stub {@code X-User-Id} header for now; every service method
 * already takes userId as an explicit parameter, so swapping this for real auth later only
 * touches this layer.
 */
@RestController
@RequestMapping("/api/assessment-sessions")
public class AssessmentSessionController {

    private final AssessmentSessionService service;

    public AssessmentSessionController(AssessmentSessionService service) {
        this.service = service;
    }

    @PostMapping
    public ApiResponse<AssessmentSessionResponse> create(
            @RequestHeader("X-User-Id") String userId,
            @RequestBody(required = false) CreateSessionRequest request) {
        return ApiResponse.success(service.createSession(userId, request));
    }

    @GetMapping("/current")
    public ApiResponse<AssessmentSessionResponse> getCurrent(@RequestHeader("X-User-Id") String userId) {
        return ApiResponse.success(service.getCurrentSession(userId));
    }

    @GetMapping("/{sessionId}")
    public ApiResponse<AssessmentSessionResponse> getOne(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String sessionId) {
        return ApiResponse.success(service.getSession(userId, sessionId));
    }

    @PutMapping("/{sessionId}/stage")
    public ApiResponse<AssessmentSessionResponse> updateStage(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String sessionId,
            @Valid @RequestBody UpdateStageRequest request) {
        return ApiResponse.success(service.updateStage(userId, sessionId, request));
    }

    @PutMapping("/{sessionId}/autosave")
    public ApiResponse<AssessmentSessionResponse> autoSave(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String sessionId,
            @Valid @RequestBody AutoSaveRequest request) {
        return ApiResponse.success(service.autoSave(userId, sessionId, request));
    }

    @PostMapping("/{sessionId}/complete")
    public ApiResponse<AssessmentSessionResponse> complete(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String sessionId) {
        return ApiResponse.success(service.completeSession(userId, sessionId));
    }

    @DeleteMapping("/{sessionId}")
    public ApiResponse<AssessmentSessionResponse> cancel(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String sessionId) {
        return ApiResponse.success(service.cancelSession(userId, sessionId));
    }
}

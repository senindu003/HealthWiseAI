package com.healthwise.assessment.session.dto.request;

import com.healthwise.assessment.session.model.StageType;
import jakarta.validation.constraints.NotNull;

import java.util.Map;

/**
 * Same shape as {@link UpdateStageRequest} minus {@code markStageComplete} - autosave
 * never changes currentStage or status, only assessmentData + lastAutoSavedAt.
 */
public record AutoSaveRequest(
        @NotNull(message = "stage is required") StageType stage,
        @NotNull(message = "data is required") Map<String, Object> data
) {
}

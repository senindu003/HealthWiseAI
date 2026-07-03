package com.healthwise.assessment.session.dto.request;

import com.healthwise.assessment.session.model.StageType;
import jakarta.validation.constraints.NotNull;

import java.util.Map;

/**
 * Generic stage-update payload. {@code data} is intentionally untyped at the transport
 * boundary - the service resolves the correct nested target class from {@code stage} and
 * merges it, so adding a future stage never requires a new request DTO or endpoint.
 */
public record UpdateStageRequest(
        @NotNull(message = "stage is required") StageType stage,
        @NotNull(message = "data is required") Map<String, Object> data,
        Boolean markStageComplete
) {
    public boolean shouldMarkStageComplete() {
        return Boolean.TRUE.equals(markStageComplete);
    }
}

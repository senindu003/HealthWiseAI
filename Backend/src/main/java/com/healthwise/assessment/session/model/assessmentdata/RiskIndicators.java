package com.healthwise.assessment.session.model.assessmentdata;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Placeholder bag for risk signals the future FastAPI AI backend will populate.
 * Kept as a free-form map so the AI backend's output shape can evolve without a
 * migration on this side.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RiskIndicators {
    private Map<String, Object> flags = new LinkedHashMap<>();
}

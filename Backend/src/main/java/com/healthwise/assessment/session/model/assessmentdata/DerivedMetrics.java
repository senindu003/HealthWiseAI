package com.healthwise.assessment.session.model.assessmentdata;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Placeholder bag for computed/derived scores, reserved for the future FastAPI AI backend.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DerivedMetrics {
    private Map<String, Object> metrics = new LinkedHashMap<>();
}

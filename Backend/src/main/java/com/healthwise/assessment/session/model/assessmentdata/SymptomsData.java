package com.healthwise.assessment.session.model.assessmentdata;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SymptomsData {
    private Map<String, List<String>> symptomsByCategory = new LinkedHashMap<>();
    private Integer totalCount;
    private String riskLevel;
    private Boolean hasEmergency;
}

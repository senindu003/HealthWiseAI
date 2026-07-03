package com.healthwise.assessment.session.model.assessmentdata;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Embedded container for the full assessment payload. Every section defaults to an
 * empty (never-null) instance so partial/autosave merges never have to null-check.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AssessmentData {
    private BasicProfile basicProfile = new BasicProfile();
    private Lifestyle lifestyle = new Lifestyle();
    private MedicalHistory medicalHistory = new MedicalHistory();
    private SymptomsData symptoms = new SymptomsData();
    private RiskIndicators riskIndicators = new RiskIndicators();
    private DerivedMetrics derivedMetrics = new DerivedMetrics();
    private Preferences preferences = new Preferences();
}

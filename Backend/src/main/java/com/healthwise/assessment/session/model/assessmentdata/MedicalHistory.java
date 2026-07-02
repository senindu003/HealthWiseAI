package com.healthwise.assessment.session.model.assessmentdata;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.LinkedHashSet;
import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MedicalHistory {
    private Set<String> personalConditions = new LinkedHashSet<>();
    private Set<String> familyHistory = new LinkedHashSet<>();
    private Set<String> medications = new LinkedHashSet<>();
    private Boolean majorSurgery;
    private Boolean hospitalization;
    private Set<String> allergies = new LinkedHashSet<>();
    private Boolean hasAbnormalLabs;
    private Set<String> abnormalLabAreas = new LinkedHashSet<>();
    // Nullable tri-state: null = not applicable/unanswered, only meaningful when the
    // user's basicProfile.gender is "female" (enforced client-side, not here).
    private Boolean isPregnant;
}

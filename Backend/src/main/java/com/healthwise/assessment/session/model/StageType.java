package com.healthwise.assessment.session.model;

/**
 * Wizard stages, in wizard order. Adding a future stage only requires a new constant
 * here (appended before REVIEW, or after it) plus one branch in the service's stage-data
 * merge switch - no controller or DTO changes are needed.
 */
public enum StageType {
    STAGE_1_BASIC_PROFILE,
    STAGE_2_MEDICAL_HISTORY,
    STAGE_3_SYMPTOMS,
    STAGE_4_REVIEW;

    public boolean isFinalStage() {
        return this.ordinal() == values().length - 1;
    }

    public StageType next() {
        return isFinalStage() ? this : values()[this.ordinal() + 1];
    }
}

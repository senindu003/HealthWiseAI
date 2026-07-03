package com.healthwise.assessment.session.model.assessmentdata;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Lifestyle {
    private String smokingStatus;
    private String alcoholConsumption;
    private Integer exerciseHoursPerWeek;
    private Double sleepHours;
    private String stressLevel;
}

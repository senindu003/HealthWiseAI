package com.healthwise.assessment.session.model.assessmentdata;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BasicProfile {
    private Integer age;
    private String gender;
    private Double height;
    private Double weight;
    private Double bmi;
}

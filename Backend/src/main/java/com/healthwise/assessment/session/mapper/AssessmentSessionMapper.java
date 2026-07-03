package com.healthwise.assessment.session.mapper;

import com.healthwise.assessment.session.dto.response.AssessmentSessionResponse;
import com.healthwise.assessment.session.model.AssessmentSession;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface AssessmentSessionMapper {

    AssessmentSessionResponse toResponse(AssessmentSession entity);
}

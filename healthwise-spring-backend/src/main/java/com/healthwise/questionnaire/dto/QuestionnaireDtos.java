package com.healthwise.questionnaire.dto;
import jakarta.validation.constraints.NotEmpty; import java.time.Instant; import java.util.Map; public final class QuestionnaireDtos{private QuestionnaireDtos(){}public record Create(@NotEmpty Map<String,Object> questionnaire){}public record Response(String id,Instant submittedAt,Map<String,Object> questionnaire){}}

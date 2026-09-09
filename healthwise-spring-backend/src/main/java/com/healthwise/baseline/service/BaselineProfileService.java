package com.healthwise.baseline.service;

import com.healthwise.baseline.dto.BaselineDtos;
import com.healthwise.baseline.entity.BaselineProfile;
import com.healthwise.baseline.repository.BaselineProfileRepository;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class BaselineProfileService {
    private final BaselineProfileRepository profiles;
    public BaselineProfileService(BaselineProfileRepository profiles){ this.profiles=profiles; }

    /** Replace only the reusable Stage 1–2 baseline for this user. */
    public BaselineDtos.Response overwrite(String userId, BaselineDtos.Create request){
        Map<String,Object> safe = new LinkedHashMap<>();
        for (String section : new String[]{"stage1", "stage2"}) {
            Object value = request.questionnaire().get(section);
            if (value instanceof Map<?, ?>) safe.put(section, value);
        }
        if (safe.size() != 2) throw new IllegalArgumentException("Baseline must contain Stage 1 and Stage 2 only.");
        BaselineProfile profile = profiles.findById(userId).orElseGet(BaselineProfile::new);
        profile.setUserId(userId);
        profile.setUpdatedAt(Instant.now());
        profile.setQuestionnaire(Map.copyOf(safe));
        BaselineProfile saved = profiles.save(profile);
        return new BaselineDtos.Response(saved.getUserId(), saved.getUpdatedAt(), saved.getQuestionnaire());
    }
}

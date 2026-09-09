package com.healthwise.baseline.controller;

import com.healthwise.baseline.dto.BaselineDtos;
import com.healthwise.baseline.service.BaselineProfileService;
import com.healthwise.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/questionnaires")
public class BaselineProfileController {
    private final BaselineProfileService profiles;
    public BaselineProfileController(BaselineProfileService profiles){ this.profiles=profiles; }

    @PutMapping("/baseline")
    @ResponseStatus(HttpStatus.OK)
    public BaselineDtos.Response overwrite(
        @AuthenticationPrincipal CurrentUser user,
        @Valid @RequestBody BaselineDtos.Create request
    ){
        return profiles.overwrite(user.id(), request);
    }
}

package com.healthwise.analysis.controller;

import com.healthwise.analysis.dto.AnalysisDtos.Create;
import com.healthwise.analysis.dto.AnalysisDtos.Response;
import com.healthwise.analysis.service.AnalysisService;
import com.healthwise.security.CurrentUser;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/analysis")
public class AnalysisController {
    private final AnalysisService service;
    public AnalysisController(AnalysisService service) { this.service = service; }
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public Response save(@AuthenticationPrincipal CurrentUser user, @Valid @RequestBody Create request) { return service.save(user.id(), request); }
    @GetMapping public List<Response> list(@AuthenticationPrincipal CurrentUser user) { return service.list(user.id()); }
    @GetMapping("/{id}") public Response get(@AuthenticationPrincipal CurrentUser user, @PathVariable String id) { return service.get(user.id(), id); }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal CurrentUser user, @PathVariable String id) { service.delete(user.id(), id); }
}

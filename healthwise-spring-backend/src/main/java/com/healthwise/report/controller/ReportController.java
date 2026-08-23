package com.healthwise.report.controller;

import com.healthwise.report.dto.ReportDtos.Response;
import com.healthwise.report.service.ReportService;
import com.healthwise.security.CurrentUser;
import java.io.IOException;
import java.util.List;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/reports")
public class ReportController {
    private final ReportService service;
    public ReportController(ReportService service) { this.service = service; }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @org.springframework.web.bind.annotation.ResponseStatus(HttpStatus.CREATED)
    public Response upload(@AuthenticationPrincipal CurrentUser user,
                           @RequestParam String recommendationId,
                           @RequestParam("reportFile") MultipartFile reportFile) {
        return service.upload(user.id(), recommendationId, reportFile);
    }

    @GetMapping
    public List<Response> list(@AuthenticationPrincipal CurrentUser user,
                               @RequestParam(required = false) String recommendationId) {
        return service.list(user.id(), recommendationId);
    }

    @GetMapping("/{id}")
    public Response get(@AuthenticationPrincipal CurrentUser user, @PathVariable String id) {
        return service.get(user.id(), id);
    }

    @GetMapping("/{id}/file")
    public ResponseEntity<InputStreamResource> file(@AuthenticationPrincipal CurrentUser user, @PathVariable String id) throws IOException {
        var resource = service.file(user.id(), id);
        String fileName = resource.getFilename() == null ? "laboratory-report.pdf" : resource.getFilename();
        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_PDF)
            .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(fileName).build().toString())
            .body(new InputStreamResource(resource.getInputStream()));
    }

    @DeleteMapping("/{id}")
    @org.springframework.web.bind.annotation.ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal CurrentUser user, @PathVariable String id) {
        service.delete(user.id(), id);
    }
}

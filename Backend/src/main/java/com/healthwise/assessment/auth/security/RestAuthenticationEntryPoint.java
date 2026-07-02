package com.healthwise.assessment.auth.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.healthwise.assessment.common.response.ApiError;
import com.healthwise.assessment.common.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Spring Security's default entry point returns a bare, non-JSON 401/403. This keeps the
 * {@link ApiResponse} envelope contract consistent so the frontend's success/error parsing
 * works the same for auth failures as it does for every other endpoint.
 */
@Component
public class RestAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;

    public RestAuthenticationEntryPoint(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException authException)
            throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        ApiResponse<Void> body = ApiResponse.error(ApiError.of("UNAUTHORIZED", "Authentication required"));
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }
}

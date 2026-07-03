package com.healthwise.assessment.common.exception;

import com.healthwise.assessment.common.response.ApiError;
import com.healthwise.assessment.common.response.ApiResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.List;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNotFound(ResourceNotFoundException ex) {
        return build(HttpStatus.NOT_FOUND, "NOT_FOUND", ex.getMessage(), List.of());
    }

    @ExceptionHandler(SessionAccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDenied(SessionAccessDeniedException ex) {
        return build(HttpStatus.FORBIDDEN, "ACCESS_DENIED", ex.getMessage(), List.of());
    }

    @ExceptionHandler(InvalidSessionStateException.class)
    public ResponseEntity<ApiResponse<Void>> handleInvalidState(InvalidSessionStateException ex) {
        return build(HttpStatus.CONFLICT, "INVALID_STATE", ex.getMessage(), List.of());
    }

    @ExceptionHandler(EmailAlreadyRegisteredException.class)
    public ResponseEntity<ApiResponse<Void>> handleEmailTaken(EmailAlreadyRegisteredException ex) {
        return build(HttpStatus.CONFLICT, "EMAIL_TAKEN", ex.getMessage(), List.of());
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<ApiResponse<Void>> handleInvalidCredentials(InvalidCredentialsException ex) {
        return build(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", ex.getMessage(), List.of());
    }

    @ExceptionHandler(WeakPasswordException.class)
    public ResponseEntity<ApiResponse<Void>> handleWeakPassword(WeakPasswordException ex) {
        return build(HttpStatus.BAD_REQUEST, "WEAK_PASSWORD", ex.getMessage(), List.of());
    }

    @ExceptionHandler(InvalidGoogleTokenException.class)
    public ResponseEntity<ApiResponse<Void>> handleInvalidGoogleToken(InvalidGoogleTokenException ex) {
        return build(HttpStatus.UNAUTHORIZED, "INVALID_GOOGLE_TOKEN", ex.getMessage(), List.of());
    }

    @ExceptionHandler(InvalidOrExpiredTokenException.class)
    public ResponseEntity<ApiResponse<Void>> handleInvalidOrExpiredToken(InvalidOrExpiredTokenException ex) {
        return build(HttpStatus.BAD_REQUEST, "INVALID_OR_EXPIRED_TOKEN", ex.getMessage(), List.of());
    }

    @ExceptionHandler(InvalidRefreshTokenException.class)
    public ResponseEntity<ApiResponse<Void>> handleInvalidRefreshToken(InvalidRefreshTokenException ex) {
        return build(HttpStatus.UNAUTHORIZED, "INVALID_REFRESH_TOKEN", ex.getMessage(), List.of());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex) {
        List<String> details = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .toList();
        return build(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "Request validation failed", details);
    }

    @ExceptionHandler(MissingRequestHeaderException.class)
    public ResponseEntity<ApiResponse<Void>> handleMissingHeader(MissingRequestHeaderException ex) {
        return build(HttpStatus.BAD_REQUEST, "MISSING_HEADER", ex.getMessage(), List.of());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleUnexpected(Exception ex) {
        log.error("Unhandled exception while processing request", ex);
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "An unexpected error occurred", List.of());
    }

    private ResponseEntity<ApiResponse<Void>> build(HttpStatus status, String code, String message, List<String> details) {
        return ResponseEntity.status(status).body(ApiResponse.error(ApiError.of(code, message, details)));
    }
}

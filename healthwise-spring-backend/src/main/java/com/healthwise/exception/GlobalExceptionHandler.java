package com.healthwise.exception;

import com.healthwise.common.dto.ErrorResponse;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Converts expected and unexpected failures into safe HTTP responses. */
@RestControllerAdvice
public class GlobalExceptionHandler {
  private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);
  @ExceptionHandler(ResourceNotFoundException.class) ResponseEntity<ErrorResponse> notFound(ResourceNotFoundException ex) { return error(HttpStatus.NOT_FOUND, ex.getMessage(), Map.of()); }
  @ExceptionHandler(ConflictException.class) ResponseEntity<ErrorResponse> conflict(ConflictException ex) { return error(HttpStatus.CONFLICT, ex.getMessage(), Map.of()); }
  @ExceptionHandler(IllegalArgumentException.class) ResponseEntity<ErrorResponse> invalid(IllegalArgumentException ex) { return error(HttpStatus.BAD_REQUEST, ex.getMessage(), Map.of()); }
  @ExceptionHandler(MethodArgumentNotValidException.class) ResponseEntity<ErrorResponse> validation(MethodArgumentNotValidException ex) { Map<String,String> fields=new LinkedHashMap<>(); for(FieldError e:ex.getBindingResult().getFieldErrors()) fields.put(e.getField(),e.getDefaultMessage()); return error(HttpStatus.BAD_REQUEST,"Validation failed",fields); }
  @ExceptionHandler(Exception.class) ResponseEntity<ErrorResponse> unexpected(Exception ex) { log.error("Unhandled API error", ex); return error(HttpStatus.INTERNAL_SERVER_ERROR,"An unexpected server error occurred",Map.of()); }
  private ResponseEntity<ErrorResponse> error(HttpStatus status,String message,Map<String,String> fields) { return ResponseEntity.status(status).body(new ErrorResponse(Instant.now(),status.value(),status.getReasonPhrase(),message,fields)); }
}

package com.healthwise.common.dto;

import java.time.Instant;
import java.util.Map;

/** Standard error body returned by the API. */
public record ErrorResponse(Instant timestamp, int status, String error, String message, Map<String, String> fieldErrors) { }

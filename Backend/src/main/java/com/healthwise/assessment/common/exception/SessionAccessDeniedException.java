package com.healthwise.assessment.common.exception;

public class SessionAccessDeniedException extends RuntimeException {

    public SessionAccessDeniedException(String message) {
        super(message);
    }
}

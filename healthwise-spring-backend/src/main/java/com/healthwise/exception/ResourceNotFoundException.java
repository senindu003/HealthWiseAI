package com.healthwise.exception;
/** Raised when an owned resource does not exist. */
public class ResourceNotFoundException extends RuntimeException { public ResourceNotFoundException(String message) { super(message); } }

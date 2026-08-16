package com.healthwise.exception;
/** Raised for duplicate or conflicting state. */
public class ConflictException extends RuntimeException { public ConflictException(String message) { super(message); } }

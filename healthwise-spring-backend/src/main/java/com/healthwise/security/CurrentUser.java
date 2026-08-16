package com.healthwise.security;
/** Authenticated user identity exposed to services. */
public record CurrentUser(String id,String email) { }

package com.healthwise.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** External JWT configuration. */
@ConfigurationProperties(prefix = "app.jwt")
public record JwtProperties(String secret, long accessTokenMinutes, long refreshTokenDays) { }

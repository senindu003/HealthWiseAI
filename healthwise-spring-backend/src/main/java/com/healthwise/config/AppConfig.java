package com.healthwise.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/** Enables strongly typed application configuration. */
@Configuration
@EnableConfigurationProperties(JwtProperties.class)
public class AppConfig { }

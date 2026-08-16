package com.healthwise;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.mongodb.config.EnableMongoAuditing;

@SpringBootApplication
@EnableMongoAuditing
public class HealthWiseApplication {
  public static void main(String[] args) { SpringApplication.run(HealthWiseApplication.class, args); }
}

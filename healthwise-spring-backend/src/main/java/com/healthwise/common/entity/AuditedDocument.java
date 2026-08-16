package com.healthwise.common.entity;

import java.time.Instant;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Field;

/** Base audit fields shared by persisted documents. */
public abstract class AuditedDocument {
  @CreatedDate @Field("createdAt") protected Instant createdAt;
  @LastModifiedDate @Field("updatedAt") protected Instant updatedAt;
  public Instant getCreatedAt() { return createdAt; }
  public Instant getUpdatedAt() { return updatedAt; }
}

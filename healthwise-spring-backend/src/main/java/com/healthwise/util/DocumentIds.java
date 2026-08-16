package com.healthwise.util;

/** Small validation helpers for Mongo document identifiers. */
public final class DocumentIds {
  private DocumentIds() { }
  /** Validates that a controller path identifier is present. */
  public static String required(String id, String resource) {
    if (id == null || id.isBlank()) throw new IllegalArgumentException(resource + " id is required");
    return id;
  }
}

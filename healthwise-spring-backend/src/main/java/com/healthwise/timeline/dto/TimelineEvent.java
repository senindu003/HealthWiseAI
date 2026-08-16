package com.healthwise.timeline.dto;import java.time.Instant;/** A dashboard activity event. */public record TimelineEvent(String eventType,Instant timestamp,String title,String description){}

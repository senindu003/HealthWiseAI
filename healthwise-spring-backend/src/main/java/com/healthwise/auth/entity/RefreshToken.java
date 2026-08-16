package com.healthwise.auth.entity;
import java.time.Instant; import org.springframework.data.annotation.Id; import org.springframework.data.mongodb.core.index.Indexed; import org.springframework.data.mongodb.core.mapping.Document;
/** Rotatable refresh token stored server-side. */
@Document("refresh_tokens") public class RefreshToken { @Id private String id; @Indexed(unique=true) private String token; @Indexed private String userId; private Instant expiresAt; public String getId(){return id;} public String getToken(){return token;} public String getUserId(){return userId;} public Instant getExpiresAt(){return expiresAt;} public void setToken(String v){token=v;} public void setUserId(String v){userId=v;} public void setExpiresAt(Instant v){expiresAt=v;} }

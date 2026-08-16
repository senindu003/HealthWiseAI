package com.healthwise.security;
import com.healthwise.config.JwtProperties;
import com.healthwise.user.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;
/** Creates and validates signed access tokens. */
@Service public class JwtService {
 private final JwtProperties properties; public JwtService(JwtProperties p){properties=p;}
 private SecretKey key(){ if(properties.secret()==null||properties.secret().length()<32) throw new IllegalStateException("JWT_SECRET must contain at least 32 characters"); return Keys.hmacShaKeyFor(properties.secret().getBytes(StandardCharsets.UTF_8)); }
 public String createAccessToken(User user){ Instant now=Instant.now(); return Jwts.builder().subject(user.getId()).claim("email",user.getEmail()).claim("roles",user.getRoles()).issuedAt(Date.from(now)).expiration(Date.from(now.plusSeconds(properties.accessTokenMinutes()*60))).signWith(key()).compact(); }
 public Claims parse(String token){ return Jwts.parser().verifyWith(key()).build().parseSignedClaims(token).getPayload(); }
}

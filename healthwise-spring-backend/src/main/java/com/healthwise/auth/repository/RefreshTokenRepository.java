package com.healthwise.auth.repository;
import com.healthwise.auth.entity.RefreshToken; import java.util.Optional; import org.springframework.data.mongodb.repository.MongoRepository;
/** Repository for refresh token lifecycle. */
public interface RefreshTokenRepository extends MongoRepository<RefreshToken,String>{Optional<RefreshToken> findByToken(String token);void deleteByUserId(String userId);}

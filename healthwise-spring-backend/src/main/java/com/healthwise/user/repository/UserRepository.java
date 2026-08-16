package com.healthwise.user.repository;
import com.healthwise.user.entity.User;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;
/** Repository for users. */
public interface UserRepository extends MongoRepository<User,String> { Optional<User> findByEmailIgnoreCase(String email); boolean existsByEmailIgnoreCase(String email); }

package com.healthwise.baseline.repository;

import com.healthwise.baseline.entity.BaselineProfile;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface BaselineProfileRepository extends MongoRepository<BaselineProfile, String> {}

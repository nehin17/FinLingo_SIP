package com.finlingo.backend.learning;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface LearningAttemptRepository extends JpaRepository<LearningAttempt, Long> {
    List<LearningAttempt> findByUser_Id(UUID userId);
}

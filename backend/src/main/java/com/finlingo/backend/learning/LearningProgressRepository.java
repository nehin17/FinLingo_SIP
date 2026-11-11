package com.finlingo.backend.learning;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LearningProgressRepository extends JpaRepository<LearningProgress, Long> {
    List<LearningProgress> findByUser_IdOrderByCompletedAtAsc(UUID userId);
    Optional<LearningProgress> findByUser_IdAndLessonId(UUID userId, String lessonId);
}

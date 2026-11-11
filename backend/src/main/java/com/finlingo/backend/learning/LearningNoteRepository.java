package com.finlingo.backend.learning;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface LearningNoteRepository extends JpaRepository<LearningNote, Long> {
    Optional<LearningNote> findByUser_IdAndResourceId(UUID userId, String resourceId);
}

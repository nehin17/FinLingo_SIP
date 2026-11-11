package com.finlingo.backend.learning;

import com.finlingo.backend.user.User;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "learning_progress", uniqueConstraints =
    @UniqueConstraint(name = "uk_learning_progress_user_lesson", columnNames = {"user_id", "lesson_id"}))
public class LearningProgress {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "lesson_id", nullable = false, length = 96)
    private String lessonId;

    @Column(name = "completed_at", nullable = false)
    private LocalDateTime completedAt;

    protected LearningProgress() {}

    public LearningProgress(User user, String lessonId) {
        this.user = user;
        this.lessonId = lessonId;
        this.completedAt = LocalDateTime.now();
    }

    public String getLessonId() { return lessonId; }
    public LocalDateTime getCompletedAt() { return completedAt; }
}

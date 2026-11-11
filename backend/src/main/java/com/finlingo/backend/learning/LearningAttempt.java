package com.finlingo.backend.learning;

import com.finlingo.backend.user.User;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "learning_challenge_attempts", indexes = @Index(name = "idx_learn_attempt_user", columnList = "user_id"))
public class LearningAttempt {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "question_id", nullable = false, length = 64)
    private String questionId;

    @Column(name = "selected_option", nullable = false)
    private int selectedOption;

    @Column(name = "correct", nullable = false)
    private boolean correct;

    @Column(name = "attempted_at", nullable = false)
    private LocalDateTime attemptedAt;

    protected LearningAttempt() {}

    public LearningAttempt(User user, String questionId, int selectedOption, boolean correct) {
        this.user = user;
        this.questionId = questionId;
        this.selectedOption = selectedOption;
        this.correct = correct;
        this.attemptedAt = LocalDateTime.now();
    }
    public boolean isCorrect() { return correct; }
    public LocalDateTime getAttemptedAt() { return attemptedAt; }
}

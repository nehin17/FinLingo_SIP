package com.finlingo.backend.learning;

import com.finlingo.backend.user.User;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "learning_notes", uniqueConstraints = @UniqueConstraint(
    name = "uk_learning_notes_user_resource", columnNames = {"user_id", "resource_id"}))
public class LearningNote {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "resource_id", nullable = false, length = 128)
    private String resourceId;

    @Column(name = "body", nullable = false, columnDefinition = "TEXT")
    private String body = "";

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected LearningNote() {}
    public LearningNote(User user, String resourceId) {
        this.user = user;
        this.resourceId = resourceId;
    }
    public String getBody() { return body; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setBody(String body) {
        this.body = body;
        this.updatedAt = LocalDateTime.now();
    }
}

package com.finlingo.backend.Watchlist;

import com.finlingo.backend.company.Company;
import com.finlingo.backend.user.User;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "watchlists", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "company_ticker"}))
public class Watchlist {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne
    @JoinColumn(name = "company_ticker")
    private Company company;

    @Column(name = "added_at")
    private LocalDateTime addedAt = LocalDateTime.now();

    // User-supplied analysis. Never populated from promotional/demo text.
    @Column(name = "research_thesis", columnDefinition = "TEXT")
    private String thesis;

    @Column(name = "research_catalyst", columnDefinition = "TEXT")
    private String catalyst;

    @Column(name = "research_risk", columnDefinition = "TEXT")
    private String risk;

    @Column(name = "research_status", length = 24)
    private String status = "unassessed";

    @Column(name = "next_review_date")
    private LocalDate nextReviewDate;

    @Column(name = "research_updated_at")
    private LocalDateTime researchUpdatedAt;

    public Integer getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public Company getCompany() { return company; }
    public void setCompany(Company company) { this.company = company; }
    public LocalDateTime getAddedAt() { return addedAt; }
    public String getThesis() { return thesis; }
    public void setThesis(String thesis) { this.thesis = thesis; }
    public String getCatalyst() { return catalyst; }
    public void setCatalyst(String catalyst) { this.catalyst = catalyst; }
    public String getRisk() { return risk; }
    public void setRisk(String risk) { this.risk = risk; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDate getNextReviewDate() { return nextReviewDate; }
    public void setNextReviewDate(LocalDate nextReviewDate) { this.nextReviewDate = nextReviewDate; }
    public LocalDateTime getResearchUpdatedAt() { return researchUpdatedAt; }
    public void setResearchUpdatedAt(LocalDateTime researchUpdatedAt) { this.researchUpdatedAt = researchUpdatedAt; }
}

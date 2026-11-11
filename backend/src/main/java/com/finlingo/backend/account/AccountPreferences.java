package com.finlingo.backend.account;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "account_preferences")
public class AccountPreferences {
    @Id
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "theme_preference", nullable = false, length = 10)
    private String themePreference = "light";

    @Column(name = "profile_picture_data", columnDefinition = "text")
    private String profilePictureData;

    @Column(name = "cognitive_status", length = 24)
    private String cognitiveStatus = "research";

    protected AccountPreferences() {}

    public AccountPreferences(UUID userId) { this.userId = userId; }
    public UUID getUserId() { return userId; }
    public String getCognitiveStatus() { return cognitiveStatus == null ? "research" : cognitiveStatus; }
    public void setCognitiveStatus(String cognitiveStatus) { this.cognitiveStatus = cognitiveStatus; }
    public String getThemePreference() { return themePreference; }
    public void setThemePreference(String themePreference) { this.themePreference = themePreference; }
    public String getProfilePictureData() { return profilePictureData; }
    public void setProfilePictureData(String profilePictureData) { this.profilePictureData = profilePictureData; }
}

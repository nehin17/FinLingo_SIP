package com.finlingo.backend.account;

import com.finlingo.backend.Watchlist.Watchlist;
import com.finlingo.backend.auth.JwtUtil;
import com.finlingo.backend.learning.LearningAttempt;
import com.finlingo.backend.learning.LearningNote;
import com.finlingo.backend.learning.LearningProgress;
import com.finlingo.backend.user.User;
import com.finlingo.backend.user.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** Account-owned settings. Never accepts a client-supplied user ID. */
@RestController
@RequestMapping("/api/account")
public class AccountSettingsController {
    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private static final List<String> LEVELS = List.of("beginner", "intermediate", "advanced");
    private static final List<String> THEMES = List.of("light", "dark", "system");

    private final UserRepository users;
    private final AccountPreferencesRepository preferences;
    private final PasswordEncoder encoder;
    private final JwtUtil jwt;
    private final EntityManager em;

    public AccountSettingsController(UserRepository users, AccountPreferencesRepository preferences,
                                     PasswordEncoder encoder, JwtUtil jwt, EntityManager em) {
        this.users = users;
        this.preferences = preferences;
        this.encoder = encoder;
        this.jwt = jwt;
        this.em = em;
    }

    private User currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() ||
            !(authentication.getPrincipal() instanceof String email) || email.isBlank() ||
            "anonymousUser".equals(email)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in to access account settings.");
        }
        return users.findByEmail(email)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Account session not found."));
    }

    private AccountPreferences prefs(User user) {
        return preferences.findById(user.getId()).orElseGet(() -> new AccountPreferences(user.getId()));
    }

    private Map<String, Object> view(User user) {
        Map<String, Object> account = new LinkedHashMap<>();
        account.put("email", user.getEmail());
        account.put("displayName", user.getDisplayName());
        account.put("difficultyLevel", user.getDifficultyLevel());
        String uploadedAvatar = prefs(user).getProfilePictureData();
        account.put("profilePicture", uploadedAvatar != null ? uploadedAvatar : user.getProfilePicture());
        account.put("createdAt", user.getCreatedAt());
        account.put("themePreference", prefs(user).getThemePreference());
        return account;
    }

    @GetMapping("/settings")
    public Map<String, Object> getSettings() { return view(currentUser()); }

    @PostMapping(value = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Transactional
    public Map<String, String> uploadAvatar(@RequestPart("avatar") MultipartFile avatar) throws IOException {
        User user = currentUser();
        if (avatar == null || avatar.isEmpty() || avatar.getSize() > 1_000_000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Photo must be an image smaller than 1 MB.");
        }
        byte[] data = avatar.getBytes();
        boolean jpeg = data.length > 3 && (data[0] & 255) == 255 && (data[1] & 255) == 216 && (data[2] & 255) == 255;
        boolean png = data.length > 8 && (data[0] & 255) == 137 && data[1] == 80 && data[2] == 78 && data[3] == 71;
        boolean webp = data.length > 12 && data[0] == 82 && data[1] == 73 && data[2] == 70 && data[3] == 70
            && data[8] == 87 && data[9] == 69 && data[10] == 66 && data[11] == 80;
        if (!jpeg && !png && !webp) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Use a JPEG, PNG, or WebP image.");
        }
        String mime = jpeg ? "image/jpeg" : png ? "image/png" : "image/webp";
        String avatarUrl = "data:" + mime + ";base64," + Base64.getEncoder().encodeToString(data);
        AccountPreferences item = prefs(user);
        item.setProfilePictureData(avatarUrl);
        preferences.saveAndFlush(item);
        return Map.of("avatarUrl", avatarUrl);
    }

    public record ProfileUpdate(String displayName, String difficultyLevel) {}

    @PutMapping("/profile")
    @Transactional
    public Map<String, Object> updateProfile(@RequestBody ProfileUpdate body) {
        User user = currentUser();
        if (body == null || body.displayName() == null || body.displayName().trim().length() < 2 ||
            body.displayName().trim().length() > 80) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Display name must be 2–80 characters.");
        }
        String level = body.difficultyLevel() == null ? "" : body.difficultyLevel().trim().toLowerCase(Locale.ROOT);
        if (!LEVELS.contains(level)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a supported learning level.");
        }
        user.setDisplayName(body.displayName().trim());
        user.setDifficultyLevel(level);
        users.saveAndFlush(user);
        return view(user);
    }

    public record AppearanceUpdate(String themePreference) {}

    @PutMapping("/appearance")
    @Transactional
    public Map<String, Object> updateAppearance(@RequestBody AppearanceUpdate body) {
        User user = currentUser();
        String requested = body == null ? null : body.themePreference();
        if (!THEMES.contains(requested)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose Light, Dark, or System theme.");
        }
        AccountPreferences item = prefs(user);
        item.setThemePreference(requested);
        preferences.saveAndFlush(item);
        return view(user);
    }

    public record ChangeEmail(String newEmail, String currentPassword) {}

    @PutMapping("/email")
    @Transactional
    public Map<String, Object> changeEmail(@RequestBody ChangeEmail body) {
        User user = currentUser();
        if (body == null || body.currentPassword() == null ||
            !encoder.matches(body.currentPassword(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect.");
        }
        String email = body.newEmail() == null ? "" : body.newEmail().trim().toLowerCase(Locale.ROOT);
        if (email.length() > 254 || !EMAIL.matcher(email).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter a valid email address.");
        }
        if (email.equalsIgnoreCase(user.getEmail())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter a different email address.");
        }
        Long existing = em.createQuery("select count(u) from User u where lower(u.email) = :email", Long.class)
            .setParameter("email", email).getSingleResult();
        if (existing > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "That email is already registered.");
        }
        user.setEmail(email);
        user.setAuthVersion(user.getAuthVersion() + 1);
        users.saveAndFlush(user);
        Map<String, Object> result = view(user);
        result.put("token", jwt.generateToken(user.getEmail(), user.getAuthVersion()));
        return result;
    }

    public record ChangePassword(String currentPassword, String newPassword) {}

    @PutMapping("/password")
    @Transactional
    public Map<String, Object> changePassword(@RequestBody ChangePassword body) {
        User user = currentUser();
        if (body == null || body.currentPassword() == null ||
            !encoder.matches(body.currentPassword(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect.");
        }
        String next = body.newPassword() == null ? "" : body.newPassword();
        if (next.length() < 10 || next.length() > 128 || next.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Use a password between 10 and 128 characters.");
        }
        if (encoder.matches(next, user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Your new password must be different.");
        }
        user.setPasswordHash(encoder.encode(next));
        user.setAuthVersion(user.getAuthVersion() + 1);
        users.saveAndFlush(user);
        return Map.of(
            "message", "Password updated; previous sessions have been invalidated.",
            "token", jwt.generateToken(user.getEmail(), user.getAuthVersion())
        );
    }

    private static Map<String, Object> record(Object... fields) {
        Map<String, Object> result = new LinkedHashMap<>();
        for (int i = 0; i < fields.length; i += 2) result.put((String) fields[i], fields[i + 1]);
        return result;
    }

    @GetMapping(value = "/export", produces = MediaType.APPLICATION_JSON_VALUE)
    @Transactional
    public ResponseEntity<Map<String, Object>> exportData() {
        User user = currentUser();
        UUID id = user.getId();
        Map<String, Object> export = new LinkedHashMap<>();
        export.put("exportedAt", Instant.now().toString());
        export.put("account", view(user));
        List<Map<String, Object>> watchlist = new ArrayList<>();
        for (Watchlist w : em.createQuery("select w from Watchlist w where w.user.id = :id", Watchlist.class)
                .setParameter("id", id).getResultList()) {
            watchlist.add(record("ticker", w.getCompany() == null ? null : w.getCompany().getTicker(),
                "addedAt", w.getAddedAt(), "thesis", w.getThesis(), "evidence", w.getCatalyst(),
                "risk", w.getRisk(), "status", w.getStatus(), "nextReviewDate", w.getNextReviewDate()));
        }
        export.put("watchlist", watchlist);
        List<Map<String, Object>> lessons = new ArrayList<>();
        for (LearningProgress row : em.createQuery("select p from LearningProgress p where p.user.id = :id", LearningProgress.class)
                .setParameter("id", id).getResultList()) {
            lessons.add(record("lessonId", row.getLessonId(), "completedAt", row.getCompletedAt()));
        }
        export.put("completedLessons", lessons);
        List<Map<String, Object>> attempts = new ArrayList<>();
        for (Object[] row : em.createQuery("select a.questionId, a.selectedOption, a.correct, a.attemptedAt from LearningAttempt a where a.user.id = :id", Object[].class)
                .setParameter("id", id).getResultList()) {
            attempts.add(record("questionId", row[0], "selectedOption", row[1], "correct", row[2], "attemptedAt", row[3]));
        }
        export.put("learningAttempts", attempts);
        List<Map<String, Object>> notes = new ArrayList<>();
        for (Object[] row : em.createQuery("select n.resourceId, n.body, n.updatedAt from LearningNote n where n.user.id = :id", Object[].class)
                .setParameter("id", id).getResultList()) {
            notes.add(record("resourceId", row[0], "body", row[1], "updatedAt", row[2]));
        }
        export.put("learningNotes", notes);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=finlingo-account-data.json")
            .header(HttpHeaders.CACHE_CONTROL, "no-store")
            .body(export);
    }

    public record DeleteAccount(String currentPassword, String confirmation) {}

    @DeleteMapping
    @Transactional
    public Map<String, String> deleteAccount(@RequestBody DeleteAccount body) {
        User user = currentUser();
        if (body == null || !"DELETE MY ACCOUNT".equals(body.confirmation())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter DELETE MY ACCOUNT to confirm.");
        }
        if (body.currentPassword() == null || !encoder.matches(body.currentPassword(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect.");
        }
        UUID id = user.getId();
        em.createQuery("delete from LearningNote n where n.user.id = :id").setParameter("id", id).executeUpdate();
        em.createQuery("delete from LearningAttempt a where a.user.id = :id").setParameter("id", id).executeUpdate();
        em.createQuery("delete from LearningProgress p where p.user.id = :id").setParameter("id", id).executeUpdate();
        em.createQuery("delete from Watchlist w where w.user.id = :id").setParameter("id", id).executeUpdate();
        preferences.deleteById(id);
        preferences.flush();
        users.delete(user);
        users.flush();
        return Map.of("message", "Account and associated learning/watchlist records deleted.");
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> error(ResponseStatusException ex) {
        return ResponseEntity.status(ex.getStatusCode())
            .body(Map.of("message", ex.getReason() == null ? "Account request could not be completed." : ex.getReason()));
    }
}

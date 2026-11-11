package com.finlingo.backend.account;

import com.finlingo.backend.user.User;
import com.finlingo.backend.user.UserRepository;
import jakarta.transaction.Transactional;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** Signed-in user's current focus. This is a preference, not fabricated activity tracking. */
@RestController
@RequestMapping("/api/account/workspace")
public class ProfileWorkspaceController {
    private static final Set<String> STATUS_MODES = Set.of("research", "scanning", "learning", "focus", "offline");

    private final UserRepository users;
    private final AccountPreferencesRepository preferences;

    public ProfileWorkspaceController(UserRepository users, AccountPreferencesRepository preferences) {
        this.users = users;
        this.preferences = preferences;
    }

    private User currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() ||
            !(authentication.getPrincipal() instanceof String email) || email.isBlank() ||
            "anonymousUser".equals(email)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in to update your focus.");
        }
        return users.findByEmail(email).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Account session not found."));
    }

    @GetMapping("/status")
    public Map<String, String> getStatus() {
        User user = currentUser();
        String value = preferences.findById(user.getId())
            .map(AccountPreferences::getCognitiveStatus).orElse("research");
        return Map.of("status", STATUS_MODES.contains(value) ? value : "research");
    }

    public record StatusUpdate(String status) {}

    @PutMapping("/status")
    @Transactional
    public Map<String, String> setStatus(@RequestBody StatusUpdate request) {
        User user = currentUser();
        String value = request == null ? null : request.status();
        if (value == null || !STATUS_MODES.contains(value)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a valid focus mode.");
        }
        AccountPreferences preference = preferences.findById(user.getId())
            .orElseGet(() -> new AccountPreferences(user.getId()));
        preference.setCognitiveStatus(value);
        preferences.saveAndFlush(preference);
        return Map.of("status", value);
    }
}

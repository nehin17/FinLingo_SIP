package com.finlingo.backend.auth;

import com.finlingo.backend.auth.dto.LoginRequest;
import com.finlingo.backend.auth.dto.RegisterRequest;
import com.finlingo.backend.user.User;
import com.finlingo.backend.user.UserRepository;
import com.finlingo.backend.account.AccountPreferencesRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.LinkedHashMap;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AccountPreferencesRepository accountPreferences;

    public AuthController(UserRepository userRepository,
                          PasswordEncoder passwordEncoder,
                          JwtUtil jwtUtil,
                          AccountPreferencesRepository accountPreferences) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.accountPreferences = accountPreferences;
    }

    private Map<String, Object> authenticatedUser(User user, String token) {
        Map<String, Object> result = new LinkedHashMap<>();
        if (token != null) result.put("token", token);
        result.put("email", user.getEmail());
        result.put("displayName", user.getDisplayName() == null ? "" : user.getDisplayName());
        result.put("difficultyLevel", user.getDifficultyLevel() == null ? "beginner" : user.getDifficultyLevel());
        String uploaded = accountPreferences.findById(user.getId())
            .map(p -> p.getProfilePictureData()).orElse(null);
        result.put("profilePicture", uploaded != null ? uploaded : user.getProfilePicture());
        return result;
    }

    @PostMapping("/register")
    public Map<String, Object> register(@RequestBody RegisterRequest body) {
        if (userRepository.findByEmail(body.getEmail()).isPresent()) {
            throw new RuntimeException("Email already registered");
        }

        User user = new User();
        user.setDisplayName(body.getName());
        user.setEmail(body.getEmail());
        user.setPasswordHash(passwordEncoder.encode(body.getPassword()));

        String difficulty = body.getDifficulty();
        if (difficulty == null || difficulty.isBlank()) {
            difficulty = "beginner";
        }
        user.setDifficultyLevel(difficulty);
        user.setProfilePicture(body.getProfilePicture());

        userRepository.save(user);

        String token = jwtUtil.generateToken(user.getEmail(), user.getAuthVersion());

        return authenticatedUser(user, token);
    }

    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody LoginRequest body) {
        User user = userRepository.findByEmail(body.getEmail())
                .orElseThrow(() -> new RuntimeException("Invalid email or password"));

        if (!passwordEncoder.matches(body.getPassword(), user.getPasswordHash())) {
            throw new RuntimeException("Invalid email or password");
        }

        String token = jwtUtil.generateToken(user.getEmail(), user.getAuthVersion());

        return authenticatedUser(user, token);
    }

    @GetMapping("/me")
    public Map<String, Object> me(@RequestHeader("Authorization") String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new RuntimeException("Missing or invalid Authorization header");
        }

        String token = authHeader.substring(7);
        if (!jwtUtil.isTokenValid(token)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.UNAUTHORIZED, "Session expired.");
        }
        String email = jwtUtil.extractEmail(token);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.UNAUTHORIZED, "Account not found."));
        if (jwtUtil.extractAuthVersion(token) != user.getAuthVersion()) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.UNAUTHORIZED, "Please sign in again.");
        }

        return authenticatedUser(user, null);
    }
}
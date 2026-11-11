package com.finlingo.backend.auth;

import com.finlingo.backend.user.UserRepository;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secretString;

    @Value("${jwt.expiration-ms:604800000}")
    private long expirationMs;

    private SecretKey key;
    private final UserRepository users;

    public JwtUtil(UserRepository users) { this.users = users; }

    @PostConstruct
    public void init() {
        this.key = Keys.hmacShaKeyFor(secretString.getBytes(StandardCharsets.UTF_8));
    }

    public String generateToken(String email) { return generateToken(email, 0); }

    public String generateToken(String email, int authVersion) {
        return Jwts.builder()
                .subject(email)
                .claim("av", authVersion)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(key)
                .compact();
    }

    public String extractEmail(String token) {
        return Jwts.parser().verifyWith(key).build()
                .parseSignedClaims(token).getPayload().getSubject();
    }

    public int extractAuthVersion(String token) {
        Object value = Jwts.parser().verifyWith(key).build()
                .parseSignedClaims(token).getPayload().get("av");
        return value instanceof Number ? ((Number) value).intValue() : 0;
    }

    public boolean isTokenValid(String token) {
        try {
            var claims = Jwts.parser().verifyWith(key).build()
                    .parseSignedClaims(token).getPayload();
            Object rawVersion = claims.get("av");
            int version = rawVersion instanceof Number ? ((Number) rawVersion).intValue() : 0;
            return users.findByEmail(claims.getSubject())
                    .map(user -> user.getAuthVersion() == version).orElse(false);
        } catch (Exception e) {
            return false;
        }
    }
}
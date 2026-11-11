package com.finlingo.backend.Watchlist;

import com.finlingo.backend.company.Company;
import com.finlingo.backend.company.CompanyRepository;
import com.finlingo.backend.user.User;
import com.finlingo.backend.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@RestController
@RequestMapping("/api/watchlist")
public class WatchlistController {

    private static final Set<String> ALLOWED_STATES = Set.of("unassessed", "on_track", "needs_review");
    private final WatchlistRepository watchlistRepository;
    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;

    public WatchlistController(
            WatchlistRepository watchlistRepository,
            UserRepository userRepository,
            CompanyRepository companyRepository
    ) {
        this.watchlistRepository = watchlistRepository;
        this.userRepository = userRepository;
        this.companyRepository = companyRepository;
    }

    private User currentUser(Authentication auth) {
        if (auth == null || !auth.isAuthenticated() || auth.getName() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in required");
        }
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Account unavailable"));
    }

    private String normalizedTicker(String ticker) {
        if (ticker == null || !ticker.matches("(?i)[A-Z.]{1,10}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid ticker");
        }
        return ticker.toUpperCase(Locale.ROOT);
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<WatchlistDTO> getWatchlist(Authentication auth) {
        User user = currentUser(auth);
        return watchlistRepository.findByUserId(user.getId())
                .stream().map(WatchlistDTO::from).toList();
    }

    @PostMapping("/{ticker}")
    @Transactional
    public WatchlistDTO addToWatchlist(@PathVariable String ticker, Authentication auth) {
        User user = currentUser(auth);
        String symbol = normalizedTicker(ticker);
        Watchlist existing = watchlistRepository.findByUserIdAndCompanyTicker(user.getId(), symbol).orElse(null);
        if (existing != null) return WatchlistDTO.from(existing);

        Company company = companyRepository.findById(symbol)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Company is not supported"));
        Watchlist entry = new Watchlist();
        entry.setUser(user);
        entry.setCompany(company);
        return WatchlistDTO.from(watchlistRepository.save(entry));
    }

    public record ResearchUpdate(String thesis, String catalyst, String risk,
                                 String status, LocalDate nextReviewDate) {}

    private static String limit(String value, int max, String field) {
        if (value == null) return "";
        String result = value.trim();
        if (result.length() > max) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " is too long");
        }
        return result;
    }

    @PutMapping("/{ticker}/research")
    @Transactional
    public WatchlistDTO updateResearch(@PathVariable String ticker,
                                       @RequestBody ResearchUpdate request,
                                       Authentication auth) {
        User user = currentUser(auth);
        String symbol = normalizedTicker(ticker);
        Watchlist entry = watchlistRepository.findByUserIdAndCompanyTicker(user.getId(), symbol)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Company is not on your watchlist"));
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Research data is required");
        }
        String status = request.status() == null ? "unassessed" : request.status();
        if (!ALLOWED_STATES.contains(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid research assessment");
        }
        entry.setThesis(limit(request.thesis(), 4000, "Thesis"));
        entry.setCatalyst(limit(request.catalyst(), 2500, "Evidence to watch"));
        entry.setRisk(limit(request.risk(), 2500, "Risk"));
        entry.setStatus(status);
        entry.setNextReviewDate(request.nextReviewDate());
        entry.setResearchUpdatedAt(LocalDateTime.now());
        return WatchlistDTO.from(watchlistRepository.save(entry));
    }

    @DeleteMapping("/{ticker}")
    @Transactional
    public void removeFromWatchlist(@PathVariable String ticker, Authentication auth) {
        User user = currentUser(auth);
        watchlistRepository.deleteByUserIdAndCompanyTicker(user.getId(), normalizedTicker(ticker));
    }
}

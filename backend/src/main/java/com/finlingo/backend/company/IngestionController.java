package com.finlingo.backend.company;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/ingest")
public class IngestionController {

    private final FinnhubIngestionService ingestionService;
    private final String adminKey;
    // Per-process daily guard: protects quota from accidental repeated clicks.
    // A production multi-instance deployment also needs a DB-backed rate limiter.
    private final Map<String, LocalDate> lastIngestion = new ConcurrentHashMap<>();

    public IngestionController(FinnhubIngestionService ingestionService,
            @Value("${FINLINGO_INGEST_ADMIN_KEY:}") String adminKey) {
        this.ingestionService = ingestionService;
        this.adminKey = adminKey;
    }

    @PostMapping("/{ticker}")
    public synchronized Company ingestCompanyData(@PathVariable String ticker,
            @RequestHeader(value = "X-Finlingo-Admin-Key", required = false) String suppliedKey) {
        requireAdmin(suppliedKey);
        String symbol = ticker.trim().toUpperCase();
        if (!CompanyUniverse.contains(symbol)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported ticker");
        }
        LocalDate today = LocalDate.now();
        if (today.equals(lastIngestion.get(symbol))) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "This ticker has already been ingested today");
        }
        Company company = ingestionService.ingestCompany(symbol);
        lastIngestion.put(symbol, today);
        return company;
    }

    @PostMapping("/all")
    public void ingestAllDisabled() {
        throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Bulk ingestion is disabled to protect the external API quota");
    }

    private void requireAdmin(String suppliedKey) {
        if (adminKey == null || adminKey.isBlank() || suppliedKey == null ||
                !MessageDigest.isEqual(adminKey.getBytes(StandardCharsets.UTF_8),
                        suppliedKey.getBytes(StandardCharsets.UTF_8))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Ingestion requires an explicitly configured administrator key");
        }
    }
}

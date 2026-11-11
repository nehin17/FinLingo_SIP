package com.finlingo.backend.research;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/** Read-only, cached optional enrichment for peer market capitalisation and P/E. */
@Service
public class FinnhubPeerClient {
    @Value("${finnhub.api.key:}") private String apiKey;
    private final RestClient client;
    private final Map<String, Cached> cache = new ConcurrentHashMap<>();
    public record Snapshot(Double marketCapUsd, Double pe, String source) { }
    private record Cached(Snapshot snapshot, Instant expiresAt) { }
    public FinnhubPeerClient() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(3));
        factory.setReadTimeout(Duration.ofSeconds(5));
        client = RestClient.builder().requestFactory(factory).build();
    }
    public Snapshot lookup(String ticker) {
        if (ticker == null || !ticker.matches("[A-Za-z0-9.\\-]{1,12}")) return new Snapshot(null, null, "none");
        String symbol = ticker.toUpperCase(Locale.ROOT);
        Cached cached = cache.get(symbol);
        if (cached != null && cached.expiresAt().isAfter(Instant.now())) return cached.snapshot();
        if (apiKey == null || apiKey.isBlank()) return new Snapshot(null, null, "not_configured");
        Snapshot result;
        try {
            Map<?, ?> doc = client.get()
                    .uri(b -> b.scheme("https").host("finnhub.io").path("/api/v1/stock/metric")
                            .queryParam("symbol", symbol).queryParam("metric", "all").queryParam("token", apiKey).build())
                    .retrieve().body(Map.class);
            Map<?, ?> metrics = doc != null && doc.get("metric") instanceof Map<?, ?> m ? m : Map.of();
            Double cap = number(metrics.get("marketCapitalization"));
            Double pe = number(metrics.get("peBasicExclExtraTTM"));
            if (pe == null) pe = number(metrics.get("peTTM"));
            result = new Snapshot(cap == null || cap <= 0 ? null : cap * 1_000_000,
                    pe == null || pe <= 0 ? null : pe, "Finnhub company metrics");
        } catch (Exception e) {
            System.err.println("Peer metric lookup failed for " + symbol + ": " + e.getClass().getSimpleName());
            result = new Snapshot(null, null, "provider_unavailable");
        }
        cache.put(symbol, new Cached(result, Instant.now().plus(
                "Finnhub company metrics".equals(result.source()) ? Duration.ofHours(12) : Duration.ofMinutes(15))));
        return result;
    }
    private static Double number(Object n) {
        if (!(n instanceof Number v)) return null;
        double d = v.doubleValue();
        return Double.isFinite(d) ? d : null;
    }
}

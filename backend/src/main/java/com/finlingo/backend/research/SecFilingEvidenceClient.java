package com.finlingo.backend.research;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Optional, source-attributed excerpts from the latest available 10-K Item 1A.
 * No language model infers a risk from a headline. This client fails closed:
 * if the section cannot be located reliably it supplies no extracted factors.
 */
@Service
public class SecFilingEvidenceClient {
    @Value("${SEC_USER_AGENT:}") private String userAgent;

    private final RestClient http;
    private static final Duration GOOD_TTL = Duration.ofHours(24);
    private static final Duration BAD_TTL = Duration.ofMinutes(20);
    private final Map<String, Cached> cache = new ConcurrentHashMap<>();
    private volatile Map<String, String> cikMap;
    private long lastRequest = 0;

    public record Factor(String title, String description, String sourceLabel, String sourceUrl,
                         String periodEnd, String classification) { }
    public record Result(String status, String filingUrl, String periodEnd, List<Factor> factors) { }
    private record Cached(Result result, Instant validUntil) { }
    private record Category(String title, Pattern keyword) { }

    private static final List<Category> CATEGORIES = List.of(
            new Category("Competition and product execution", Pattern.compile("(?i)\\b(competitive|competition|competing products|product development|market share)\\b")),
            new Category("Export controls and geopolitics", Pattern.compile("(?i)\\b(export controls?|trade restrictions?|tariffs?|geopolitical|sanctions?)\\b")),
            new Category("Manufacturing and supply dependencies", Pattern.compile("(?i)\\b(foundr(?:y|ies)|third.party manufacturers?|supply chain|manufacturing capacity|suppliers?)\\b")),
            new Category("Customer concentration and demand", Pattern.compile("(?i)\\b(customer concentration|major customers?|customer demand|cyclical demand|demand fluctuations?)\\b")),
            new Category("Cybersecurity and intellectual property", Pattern.compile("(?i)\\b(cybersecurity|security incidents?|data breaches?|intellectual property|patent litigation)\\b")),
            new Category("Regulation and litigation", Pattern.compile("(?i)\\b(regulatory requirements?|government regulations?|litigation|legal proceedings|antitrust)\\b"))
    );
    private static final Pattern ITEM_1A = Pattern.compile("(?i)\\bitem\\s*1\\s*a\\s*[.:–—-]?\\s*risk\\s*factors\\b");
    private static final Pattern ITEM_1B = Pattern.compile("(?i)\\bitem\\s*1\\s*b\\s*[.:–—-]?\\s*(unresolved|staff|comments)\\b|\\bitem\\s*2\\s*[.:–—-]?\\s*properties\\b");
    private static final Pattern CAUTION = Pattern.compile("(?i)\\b(may|could|risk|adversely|depend|subject to|uncertain|impact|affect|exposure|cannot|unable|disrupt)\\b");
    private static final int MAX_HTML_CHARS = 15_000_000;

    public SecFilingEvidenceClient() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(4));
        factory.setReadTimeout(Duration.ofSeconds(8));
        http = RestClient.builder().requestFactory(factory).build();
    }

    public Result latestAnnualRisks(String ticker) {
        if (ticker == null || !ticker.matches("[A-Za-z0-9.\\-]{1,12}"))
            return new Result("invalid_ticker", null, null, List.of());
        String symbol = ticker.toUpperCase(Locale.ROOT);
        if (userAgent == null || userAgent.isBlank())
            return new Result("not_configured", null, null, List.of());
        Cached cached = cache.get(symbol);
        if (cached != null && cached.validUntil().isAfter(Instant.now())) return cached.result();
        synchronized (cache) {
            cached = cache.get(symbol);
            if (cached != null && cached.validUntil().isAfter(Instant.now())) return cached.result();
            Result result;
            try { result = fetch(symbol); }
            catch (Exception e) {
                System.err.println("SEC filing evidence unavailable for " + symbol + ": " + e.getClass().getSimpleName());
                result = new Result("request_failed", null, null, List.of());
            }
            cache.put(symbol, new Cached(result, Instant.now().plus(
                    "available".equals(result.status()) ? GOOD_TTL : BAD_TTL)));
            return result;
        }
    }

    private Result fetch(String symbol) {
        String cik = cikMap().get(symbol);
        if (cik == null) return new Result("cik_not_found", null, null, List.of());
        Map<?, ?> submissions = json("https://data.sec.gov/submissions/CIK" + cik + ".json");
        Map<?, ?> filings = map(submissions.get("filings"));
        Map<?, ?> recent = map(filings.get("recent"));
        List<?> forms = list(recent.get("form"));
        List<?> accession = list(recent.get("accessionNumber"));
        List<?> documents = list(recent.get("primaryDocument"));
        List<?> periods = list(recent.get("reportDate"));
        for (int i = 0; i < forms.size() && i < accession.size() && i < documents.size(); i++) {
            if (!"10-K".equals(forms.get(i))) continue;
            String accessionNumber = String.valueOf(accession.get(i));
            String primaryDocument = String.valueOf(documents.get(i));
            if (!primaryDocument.matches("[A-Za-z0-9_.-]+") || !accessionNumber.matches("[0-9-]+")) continue;
            String url = "https://www.sec.gov/Archives/edgar/data/"
                    + Long.parseLong(cik) + "/" + accessionNumber.replace("-", "") + "/" + primaryDocument;
            String periodEnd = i < periods.size() && periods.get(i) != null ? String.valueOf(periods.get(i)) : null;
            String document = html(url);
            List<Factor> factors = extract(document, url, periodEnd);
            return new Result(factors.isEmpty() ? "section_unavailable" : "available", url, periodEnd, factors);
        }
        return new Result("no_recent_10k", null, null, List.of());
    }

    private static List<Factor> extract(String html, String url, String period) {
        // Use conservative, visible-text extraction, rather than guessing the filing's meaning.
        if (html == null || html.length() > MAX_HTML_CHARS) return List.of();
        String plain = html.replaceAll("(?is)<(script|style|ix:header)\\b[^>]*>.*?</\\1\\s*>", " ")
                .replaceAll("(?is)</(?:p|div|tr|h[1-6]|li|table)\\s*>", "\\n")
                .replaceAll("(?s)<[^>]+>", " ")
                .replace("&nbsp;", " ").replace("&#160;", " ")
                .replace("&amp;", "&").replace("&quot;", "\"").replace("&rsquo;", "'");
        plain = plain.replaceAll("[\\u00a0\\t ]+", " ").replaceAll("\\s*\\n\\s*", " ")
                .replaceAll(" {2,}", " ");
        Matcher start = ITEM_1A.matcher(plain);
        String section = null;
        while (start.find()) {
            int begin = start.end();
            Matcher end = ITEM_1B.matcher(plain);
            if (!end.find(begin)) continue;
            int size = end.start() - begin;
            // Reject table-of-contents entries or abnormally broad, unreliable sections.
            if (size >= 2500 && size <= 500_000) section = plain.substring(begin, end.start());
        }
        if (section == null) return List.of();
        return extractFactors(section, url, period);
    }

    static List<Factor> extractFactors(String section, String url, String period) {
        List<Factor> result = new ArrayList<>();
        String[] sentences = section.split("(?<=[.!?])\\s+(?=[A-Z(\"'])");
        for (Category category : CATEGORIES) {
            for (String raw : sentences) {
                String sentence = raw.replaceAll("\\s+", " ").trim();
                if (sentence.length() < 65 || sentence.length() > 1050) continue;
                if (!category.keyword().matcher(sentence).find() || !CAUTION.matcher(sentence).find()) continue;
                // The snippet is labelled as a company disclosure, not an independent risk finding.
                // Keep a short visible excerpt; the linked filing is always authoritative.
                String excerpt = sentence.length() > 220 ? sentence.substring(0, 217).trim() + "…" : sentence;
                result.add(new Factor(category.title(), excerpt, "Company 10-K · Item 1A", url,
                        period, "company_disclosed_risk"));
                break;
            }
            if (result.size() >= 5) break;
        }
        return List.copyOf(result);
    }

    private Map<String, String> cikMap() {
        Map<String, String> existing = cikMap;
        if (existing != null) return existing;
        synchronized (this) {
            if (cikMap != null) return cikMap;
            Map<?, ?> data = json("https://www.sec.gov/files/company_tickers.json");
            Map<String, String> mapped = new LinkedHashMap<>();
            for (Object value : data.values()) {
                Map<?, ?> item = map(value);
                if (item.get("ticker") == null || !(item.get("cik_str") instanceof Number cik)) continue;
                mapped.put(item.get("ticker").toString().toUpperCase(Locale.ROOT), String.format("%010d", cik.longValue()));
            }
            cikMap = Map.copyOf(mapped);
            return cikMap;
        }
    }

    private synchronized void pace() {
        long delay = 250 - (System.currentTimeMillis() - lastRequest);
        if (delay > 0) {
            try { Thread.sleep(delay); }
            catch (InterruptedException e) { Thread.currentThread().interrupt(); throw new IllegalStateException(e); }
        }
        lastRequest = System.currentTimeMillis();
    }

    private Map<?, ?> json(String url) {
        pace();
        Map<?, ?> obj = http.get().uri(url).header("User-Agent", userAgent)
                .header("Accept", "application/json").retrieve().body(Map.class);
        if (obj == null) throw new IllegalStateException("Empty SEC JSON");
        return obj;
    }

    private String html(String url) {
        pace();
        String doc = http.get().uri(url).header("User-Agent", userAgent)
                .header("Accept", "text/html").retrieve().body(String.class);
        if (doc == null || doc.length() > MAX_HTML_CHARS) return null;
        return doc;
    }
    private static Map<?, ?> map(Object x) { return x instanceof Map<?, ?> m ? m : Map.of(); }
    private static List<?> list(Object x) { return x instanceof List<?> l ? l : List.of(); }
}

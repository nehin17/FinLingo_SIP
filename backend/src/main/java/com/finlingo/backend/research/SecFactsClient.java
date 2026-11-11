package com.finlingo.backend.research;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Read-only SEC EDGAR XBRL adapter. Never creates or invents financial records.
 * Requires SEC_USER_AGENT (name plus real contact), per SEC Fair Access guidance.
 * SEC /companyfacts facts are annual 10-K duration or annual year-end instant facts.
 * Results are cached to avoid repeated public API calls.
 */
@Service
public class SecFactsClient {
    @Value("${SEC_USER_AGENT:}")
    private String userAgent;

    private final RestClient client = RestClient.create();
    private volatile Map<String, String> cikLookup;
    private long lastSecRequestAt = 0L;
    private final Map<String, CachedResult> cache = new ConcurrentHashMap<>();
    private static final Duration SUCCESS_TTL = Duration.ofHours(12);
    private static final Duration FAILURE_TTL = Duration.ofMinutes(5);

    public record AnnualFacts(int fiscalYear, LocalDate periodEnd, Map<String, Double> metrics) {
        public Double get(String name) { return metrics.get(name); }
    }

    public record SecResult(String status, String url, List<AnnualFacts> years) { }
    private record CachedResult(SecResult result, Instant expiresAt) { }
    private record Fact(double value, LocalDate end, LocalDate filed) { }

    public SecResult getAnnualFacts(String ticker) {
        if (userAgent == null || userAgent.isBlank()) {
            return new SecResult("not_configured", null, List.of());
        }
        String symbol = ticker.toUpperCase(java.util.Locale.ROOT);
        CachedResult cached = cache.get(symbol);
        if (cached != null && cached.expiresAt().isAfter(Instant.now())) return cached.result();
        synchronized (cache) {
            cached = cache.get(symbol);
            if (cached != null && cached.expiresAt().isAfter(Instant.now())) return cached.result();
            SecResult result;
            try {
                Map<String, String> mapping = loadTickerCiks();
                String cik = mapping.get(symbol);
                if (cik == null) {
                    result = new SecResult("cik_not_found", null, List.of());
                } else {
                    String url = "https://data.sec.gov/api/xbrl/companyfacts/CIK" + cik + ".json";
                    Map<?, ?> doc = getJson(url);
                    Map<?, ?> facts = asMap(doc.get("facts"));
                    Map<?, ?> usGaap = asMap(facts.get("us-gaap"));
                    List<AnnualFacts> years = parseAnnual(usGaap);
                    result = new SecResult(years.isEmpty() ? "no_annual_facts" : "available", url, years);
                }
            } catch (Exception e) {
                // Do not pass internal exception text, credentials or user agent to the frontend.
                System.err.println("SEC financial facts unavailable for " + symbol + ": " + e.getClass().getSimpleName());
                result = new SecResult("sec_request_failed", null, List.of());
            }
            Duration ttl = "available".equals(result.status()) ? SUCCESS_TTL : FAILURE_TTL;
            cache.put(symbol, new CachedResult(result, Instant.now().plus(ttl)));
            return result;
        }
    }

    /** Return ONLY previously cached SEC facts: peer queries do not issue bulk SEC requests. */
    public List<AnnualFacts> cachedFacts(String ticker) {
        CachedResult item = cache.get(ticker.toUpperCase(java.util.Locale.ROOT));
        return item == null ? List.of() : item.result().years();
    }

    private Map<String, String> loadTickerCiks() {
        Map<String, String> local = cikLookup;
        if (local != null) return local;
        synchronized (this) {
            if (cikLookup != null) return cikLookup;
            Map<?, ?> payload = getJson("https://www.sec.gov/files/company_tickers.json");
            Map<String, String> result = new HashMap<>();
            for (Object val : payload.values()) {
                Map<?, ?> rec = asMap(val);
                Object ticker = rec.get("ticker");
                Object cik = rec.get("cik_str");
                if (ticker == null || cik == null) continue;
                try {
                    result.put(ticker.toString().toUpperCase(java.util.Locale.ROOT),
                            String.format("%010d", Long.parseLong(cik.toString())));
                } catch (NumberFormatException ignored) { }
            }
            cikLookup = Map.copyOf(result);
            return cikLookup;
        }
    }

    @SuppressWarnings("unchecked")
    private synchronized Map<?, ?> getJson(String url) {
        long delay = Math.max(0, 180 - (System.currentTimeMillis() - lastSecRequestAt));
        if (delay > 0) {
            try { Thread.sleep(delay); }
            catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new IllegalStateException("SEC request interrupted", e);
            }
        }
        lastSecRequestAt = System.currentTimeMillis();
        Map<?, ?> data = client.get().uri(url)
                .header("User-Agent", userAgent)
                .header("Accept", "application/json")
                .retrieve().body(Map.class);
        if (data == null) throw new IllegalStateException("SEC response empty");
        return data;
    }

    private static Map<?, ?> asMap(Object value) {
        return value instanceof Map<?, ?> map ? map : Map.of();
    }

    private static List<?> asList(Object value) {
        return value instanceof List<?> list ? list : List.of();
    }

    private static Map<Integer, Fact> readConcept(Map<?, ?> gaap, String unit, boolean duration, String... tags) {
        Map<Integer, Fact> bestByYear = new HashMap<>();
        // Prefer first supported tag for each fiscal year to avoid mixing incompatible concepts.
        for (String tag : tags) {
            Map<?, ?> concept = asMap(gaap.get(tag));
            Map<?, ?> units = asMap(concept.get("units"));
            for (Object raw : asList(units.get(unit))) {
                Map<?, ?> item = asMap(raw);
                Object form = item.get("form");
                if (!"10-K".equals(form) && !"10-K/A".equals(form)) continue;
                Object endRaw = item.get("end");
                Object valRaw = item.get("val");
                if (endRaw == null || !(valRaw instanceof Number num)) continue;
                LocalDate end;
                try { end = LocalDate.parse(endRaw.toString()); }
                catch (Exception ignored) { continue; }

                Object startRaw = item.get("start");
                if (duration) {
                    if (startRaw == null) continue;
                    try {
                        long days = java.time.temporal.ChronoUnit.DAYS.between(
                                LocalDate.parse(startRaw.toString()), end);
                        if (days < 320 || days > 380) continue;
                    } catch (Exception ignored) { continue; }
                } else if (startRaw != null) {
                    // Instantaneous balance sheet fact only.
                    continue;
                }

                LocalDate filed = LocalDate.MIN;
                try { if (item.get("filed") != null) filed = LocalDate.parse(item.get("filed").toString()); }
                catch (Exception ignored) { }
                int year = end.getYear();
                Fact next = new Fact(num.doubleValue(), end, filed);
                Fact current = bestByYear.get(year);
                if (current == null || next.end().isAfter(current.end()) ||
                    (next.end().equals(current.end()) && next.filed().isAfter(current.filed()))) {
                    bestByYear.put(year, next);
                }
            }
        }
        return bestByYear;
    }

    static List<AnnualFacts> parseAnnual(Map<?, ?> gaap) {
        Map<String, Map<Integer, Fact>> values = new LinkedHashMap<>();
        values.put("revenue", readConcept(gaap, "USD", true,
                "RevenueFromContractWithCustomerExcludingAssessedTax",
                "RevenueFromContractWithCustomerIncludingAssessedTax", "Revenues", "SalesRevenueNet"));
        values.put("grossProfit", readConcept(gaap, "USD", true, "GrossProfit"));
        values.put("operatingIncome", readConcept(gaap, "USD", true, "OperatingIncomeLoss"));
        values.put("netIncome", readConcept(gaap, "USD", true, "NetIncomeLoss"));
        values.put("eps", readConcept(gaap, "USD/shares", true, "EarningsPerShareDiluted"));
        values.put("operatingCashFlow", readConcept(gaap, "USD", true,
                "NetCashProvidedByUsedInOperatingActivities"));
        values.put("capex", readConcept(gaap, "USD", true, "PaymentsToAcquirePropertyPlantAndEquipment"));
        values.put("interestExpense", readConcept(gaap, "USD", true, "InterestExpense"));
        values.put("incomeTaxExpense", readConcept(gaap, "USD", true, "IncomeTaxExpenseBenefit"));
        values.put("preTaxIncome", readConcept(gaap, "USD", true, "IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest", "IncomeLossFromContinuingOperationsBeforeIncomeTaxesMinorityInterestAndIncomeLossFromEquityMethodInvestments"));
        values.put("assets", readConcept(gaap, "USD", false, "Assets"));
        values.put("equity", readConcept(gaap, "USD", false, "StockholdersEquity"));
        values.put("cash", readConcept(gaap, "USD", false,
                "CashAndCashEquivalentsAtCarryingValue", "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents"));
        values.put("currentAssets", readConcept(gaap, "USD", false, "AssetsCurrent"));
        values.put("currentLiabilities", readConcept(gaap, "USD", false, "LiabilitiesCurrent"));
        values.put("inventory", readConcept(gaap, "USD", false, "InventoryNet"));
        values.put("debtCombined", readConcept(gaap, "USD", false,
                "LongTermDebtAndFinanceLeaseObligationsIncludingCurrentMaturities", "LongTermDebtAndCapitalLeaseObligationsIncludingCurrentMaturities"));
        values.put("debtLong", readConcept(gaap, "USD", false, "LongTermDebtNoncurrent"));
        values.put("debtCurrent", readConcept(gaap, "USD", false, "LongTermDebtCurrent", "LongTermDebtAndCapitalLeaseObligationsCurrent"));

        Set<Integer> years = new TreeSet<>(Comparator.reverseOrder());
        for (var entry : values.values()) years.addAll(entry.keySet());
        List<AnnualFacts> out = new ArrayList<>();
        for (int year : years) {
            if (out.size() == 6) break;
            Map<String, Double> facts = new LinkedHashMap<>();
            LocalDate end = null;
            for (var entry : values.entrySet()) {
                Fact fact = entry.getValue().get(year);
                if (fact != null) {
                    facts.put(entry.getKey(), fact.value());
                    if (end == null || fact.end().isAfter(end)) end = fact.end();
                }
            }
            if (!facts.isEmpty() && end != null) out.add(new AnnualFacts(year, end, Map.copyOf(facts)));
        }
        return List.copyOf(out);
    }
}

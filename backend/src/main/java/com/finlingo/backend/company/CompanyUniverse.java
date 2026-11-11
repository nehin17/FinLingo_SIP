package com.finlingo.backend.company;

import java.util.Set;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

/** Curated research universe and company-specific news matching. */
public final class CompanyUniverse {
    private CompanyUniverse() { }

    public static final Set<String> TICKERS = Set.of(
        "AAPL", "AMD", "AMZN", "BA", "COST", "CVX", "GOOGL", "INTC", "JNJ", "JPM",
        "MA", "META", "MSFT", "NVDA", "TSLA", "UNH", "V", "WMT", "XOM",
        "ADBE", "CRM", "CSCO", "DIS", "HD", "KO", "MCD", "NFLX", "NKE", "ORCL", "PG"
    );

    // Require an explicit name or distinctive product in the headline. Finnhub's
    // `related` field can include companies merely mentioned in the article.
    // Short ambiguous tickers (V, MA, KO, HD, PG) are intentionally not matched.
    private static final Map<String, Pattern> NEWS_HEADLINE_PATTERNS = Map.ofEntries(
        newsPattern("AAPL", "apple|iphone|ipad|macbook|app store"),
        newsPattern("ADBE", "adobe"),
        newsPattern("AMD", "amd|advanced micro devices"),
        newsPattern("AMZN", "amazon|amazon web services|aws|prime video"),
        newsPattern("BA", "boeing"),
        newsPattern("COST", "costco"),
        newsPattern("CRM", "salesforce"),
        newsPattern("CSCO", "cisco"),
        newsPattern("CVX", "chevron"),
        newsPattern("DIS", "disney|disney\\+"),
        newsPattern("GOOGL", "alphabet|google|youtube"),
        newsPattern("HD", "home depot"),
        newsPattern("INTC", "intel"),
        newsPattern("JNJ", "johnson\\s*(?:&|and)\\s*johnson|j&j"),
        newsPattern("JPM", "jpmorgan|j\\.?p\\.?\\s*morgan"),
        newsPattern("KO", "coca[ -]?cola"),
        newsPattern("MA", "mastercard"),
        newsPattern("MCD", "mcdonald['’]?s"),
        newsPattern("META", "meta platforms|meta|facebook|instagram|whatsapp"),
        newsPattern("MSFT", "microsoft|azure|xbox"),
        newsPattern("NFLX", "netflix"),
        newsPattern("NKE", "nike"),
        newsPattern("NVDA", "nvidia"),
        newsPattern("ORCL", "oracle"),
        newsPattern("PG", "procter\\s*(?:&|and)\\s*gamble|p&g"),
        newsPattern("TSLA", "tesla"),
        newsPattern("UNH", "unitedhealth(?:care)?|optum"),
        newsPattern("V", "visa"),
        newsPattern("WMT", "walmart|wal-mart"),
        newsPattern("XOM", "exxonmobil|exxon|mobil oil")
    );

    private static Map.Entry<String, Pattern> newsPattern(String ticker, String expressions) {
        return Map.entry(ticker, Pattern.compile(
            "(?<![\\p{L}\\p{N}])(?:" + expressions + ")(?![\\p{L}\\p{N}])",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE));
    }

    public static boolean matchesNewsHeadline(String ticker, String headline) {
        if (headline == null || headline.isBlank() || ticker == null) return false;
        Pattern pattern = NEWS_HEADLINE_PATTERNS.get(ticker.trim().toUpperCase(Locale.ROOT));
        if (pattern == null || !pattern.matcher(headline).find()) return false;
        // 'Visa' immigration stories are not about the Visa payments business.
        return !ticker.trim().equalsIgnoreCase("V") ||
            !Pattern.compile("\\b(?:immigration|tourist|student|work|travel)\\s+visa\\b|\\bvisa\\s+(?:ban|application|rules|requirements)\\b",
                Pattern.CASE_INSENSITIVE).matcher(headline).find();
    }

    public static boolean contains(String ticker) {
        return ticker != null && TICKERS.contains(ticker.trim().toUpperCase(Locale.ROOT));
    }
}

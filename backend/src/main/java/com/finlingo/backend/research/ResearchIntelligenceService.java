package com.finlingo.backend.research;

import com.finlingo.backend.company.Company;
import com.finlingo.backend.company.CompanyRepository;
import com.finlingo.backend.company.NewsItem;
import com.finlingo.backend.company.NewsItemRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

@Service
public class ResearchIntelligenceService {
    private final CompanyRepository companies;
    private final SecFactsClient sec;
    private final NewsItemRepository newsItems;
    private final SecFilingEvidenceClient filingEvidence;
    private final FinnhubPeerClient finnhub;

    public ResearchIntelligenceService(CompanyRepository companies, SecFactsClient sec, NewsItemRepository newsItems,
                                       SecFilingEvidenceClient filingEvidence, FinnhubPeerClient finnhub) {
        this.companies = companies;
        this.sec = sec;
        this.newsItems = newsItems;
        this.filingEvidence = filingEvidence;
        this.finnhub = finnhub;
    }

    private record Profile(Company company, SecFactsClient.AnnualFacts now,
                           SecFactsClient.AnnualFacts previous, String sourceUrl,
                           FinnhubPeerClient.Snapshot live) {
        Double fact(String key) { return now == null ? null : safe(now.get(key)); }
        Double prior(String key) { return previous == null ? null : safe(previous.get(key)); }
        Double capitalisation() { return marketCapUsd(company) != null ? marketCapUsd(company) : live.marketCapUsd(); }
        Double pe() { return num(company.getPeRatio()) != null ? num(company.getPeRatio()) : live.pe(); }
        Double revenue() { return fact("revenue"); }
        Double operatingMargin() { return percent(fact("operatingIncome"), revenue()); }
        Double grossMargin() { return percent(fact("grossProfit"), revenue()); }
        Double netMargin() { return percent(fact("netIncome"), revenue()); }
        Double freeCashFlow() { return minus(fact("operatingCashFlow"), fact("capex")); }
        Double cashFlowMargin() { return percent(freeCashFlow(), revenue()); }
        Double returnOnEquity() { return percent(fact("netIncome"), average(fact("equity"), prior("equity"))); }
        Double returnOnAssets() { return percent(fact("netIncome"), average(fact("assets"), prior("assets"))); }
        Double priceSales() { return div(capitalisation(), revenue()); }
        Double priceBook() { return div(capitalisation(), fact("equity")); }
        Double fcfYield() { return percent(freeCashFlow(), capitalisation()); }
        Double revenueGrowth() { return change(revenue(), prior("revenue")); }
        Double epsGrowth() { return change(fact("eps"), prior("eps")); }
        Double debt() {
            Double combined = fact("debtCombined");
            if (combined != null) return combined;
            return sumRequired(fact("debtLong"), fact("debtCurrent"));
        }
        Double netDebt() { return minus(debt(), fact("cash")); }
        Double currentRatio() { return div(fact("currentAssets"), fact("currentLiabilities")); }
        Double quickRatio() {
            return div(minus(fact("currentAssets"), fact("inventory")), fact("currentLiabilities"));
        }
        Double debtToEquity() { return div(debt(), fact("equity")); }
        Double interestCoverage() { return div(fact("operatingIncome"), fact("interestExpense")); }
        Double enterpriseSales() {
            Double enterpriseValue = sumRequired(capitalisation(), netDebt());
            return div(enterpriseValue, revenue());
        }
        String period() { return now == null ? null : now.periodEnd().toString(); }
        String source() { return sourceUrl == null ? "" : sourceUrl; }
    }

    public Map<String, Object> getResearch(String ticker) {
        if (ticker == null || !ticker.trim().toUpperCase(Locale.ROOT).matches("[A-Z0-9.\\-]{1,12}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid ticker");
        }
        String symbol = ticker.trim().toUpperCase(Locale.ROOT);
        Company company = companies.findByTickerIgnoreCase(symbol).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Company not found: " + symbol));

        SecFactsClient.SecResult report = sec.getAnnualFacts(symbol);
        Profile selected = profile(company, report);
        List<Company> candidates = peerCandidates(company);
        List<Profile> profiles = new ArrayList<>();
        profiles.add(selected);
        for (Company peer : candidates) {
            SecFactsClient.SecResult peerReport = sec.getAnnualFacts(peer.getTicker());
            profiles.add(profile(peer, peerReport));
        }
        List<Profile> peers = profiles.subList(1, profiles.size());

        Map<String, Double> medians = new LinkedHashMap<>();
        medians.put("pe", median(peers.stream().map(Profile::pe).toList()));
        medians.put("ps", median(peers.stream().map(Profile::priceSales).toList()));
        medians.put("pb", median(peers.stream().map(Profile::priceBook).toList()));
        medians.put("evSales", median(peers.stream().map(Profile::enterpriseSales).toList()));
        medians.put("fcfYield", median(peers.stream().map(Profile::fcfYield).toList()));
        medians.put("grossMargin", median(peers.stream().map(Profile::grossMargin).toList()));
        medians.put("operatingMargin", median(peers.stream().map(Profile::operatingMargin).toList()));
        medians.put("netMargin", median(peers.stream().map(Profile::netMargin).toList()));
        medians.put("roe", median(peers.stream().map(Profile::returnOnEquity).toList()));
        medians.put("roa", median(peers.stream().map(Profile::returnOnAssets).toList()));

        List<Map<String, Object>> valuation = new ArrayList<>();
        valuation.add(valuation("Trailing P/E", selected.pe(), medians.get("pe"), "x", 1, true,
                "Stored Finnhub P/E; comparison uses available sector peers."));
        valuation.add(valuation("Price / Sales", selected.priceSales(), medians.get("ps"), "x", 1, true,
                "Stored market cap divided by SEC annual revenue."));
        valuation.add(valuation("Price / Book", selected.priceBook(), medians.get("pb"), "x", 1, true,
                "Stored market cap divided by SEC fiscal-year-end equity."));
        valuation.add(valuation("EV / Sales", selected.enterpriseSales(), medians.get("evSales"), "x", 1, true,
                "Market cap plus reported debt minus cash, divided by annual revenue."));
        valuation.add(valuation("FCF Yield", selected.fcfYield(), medians.get("fcfYield"), "%", 1, false,
                "Annual operating cash flow minus capex, divided by market cap."));

        List<Map<String, Object>> profitability = List.of(
                profit("Gross Margin", selected.grossMargin(), medians.get("grossMargin")),
                profit("Operating Margin", selected.operatingMargin(), medians.get("operatingMargin")),
                profit("Net Margin", selected.netMargin(), medians.get("netMargin")),
                profit("Return on Equity", selected.returnOnEquity(), medians.get("roe")),
                profit("Return on Assets", selected.returnOnAssets(), medians.get("roa")));

        List<Map<String, Object>> balance = List.of(
                balance("Cash & Equivalents", cash(selected.fact("cash")), "reported", "Fiscal year-end"),
                balance("Total Debt", cash(selected.debt()), "reported", "Reported borrowings"),
                balance("Net Debt", cash(selected.netDebt()), "reported", "Debt less cash"),
                balance("Current Ratio", fmt(selected.currentRatio(), 2), range(selected.currentRatio(), 1.0, 1.5), "Current assets / current liabilities"),
                balance("Quick Ratio", fmt(selected.quickRatio(), 2), range(selected.quickRatio(), 1.0, 1.3), "Excludes inventory"),
                balance("Debt / Equity", fmt(selected.debtToEquity(), 2), selected.debtToEquity() == null ? "missing" : selected.debtToEquity() > 1 ? "watch" : "reported", "Borrowings / shareholders' equity"),
                balance("Interest Coverage", fmt(selected.interestCoverage(), 1, "x"), selected.interestCoverage() == null ? "missing" : selected.interestCoverage() < 2 ? "watch" : "reported", "Operating income / interest expense"));

        List<Map<String, Object>> growth = List.of(
                growthSeries("Revenue Growth", report.years(), "revenue"),
                growthSeries("EPS Growth", report.years(), "eps"),
                cashFlowSeries(report.years()));

        List<Map<String, Object>> strengths = strengths(selected, medians);
        List<Map<String, Object>> risks = risks(selected, medians);
        SecFilingEvidenceClient.Result filing = filingEvidence.latestAnnualRisks(symbol);
        List<Map<String, Object>> filingRisks = new ArrayList<>();
        for (SecFilingEvidenceClient.Factor factor : filing.factors()) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("title", factor.title());
            item.put("description", factor.description());
            item.put("sourceLabel", factor.sourceLabel());
            item.put("sourceUrl", factor.sourceUrl());
            item.put("periodEnd", factor.periodEnd());
            item.put("classification", factor.classification());
            filingRisks.add(item);
        }
        List<Map<String, Object>> news = latestNews(symbol);
        List<Map<String, Object>> peerTable = new ArrayList<>();
        for (Profile p : profiles) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("ticker", p.company().getTicker());
            item.put("name", p.company().getName());
            item.put("marketCap", p.capitalisation());
            item.put("pe", p.pe());
            item.put("revenueGrowth", p.revenueGrowth() != null ? p.revenueGrowth() : num(p.company().getRevenueGrowth()));
            item.put("revenueGrowthSource", p.revenueGrowth() != null ? "SEC annual" : "Stored Finnhub");
            item.put("operatingMargin", p.operatingMargin());
            item.put("periodEnd", p.period());
            item.put("sourceUrl", p.source());
            item.put("isSelected", p.company().getTicker().equalsIgnoreCase(symbol));
            peerTable.add(item);
        }

        Map<String, Object> source = new LinkedHashMap<>();
        source.put("status", report.status());
        source.put("url", report.url() == null ? "" : report.url());
        source.put("label", "SEC EDGAR annual XBRL + FINLINGO stored Finnhub snapshots");
        source.put("filingsUrl", "https://www.sec.gov/edgar/browse/?CIK=" + symbol);
        source.put("latestPeriod", selected.period());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("ticker", symbol);
        result.put("companyName", company.getName());
        result.put("sector", company.getSector());
        result.put("periodEnd", selected.period());
        result.put("source", source);
        result.put("valuation", valuation);
        result.put("profitability", profitability);
        result.put("balanceSheet", balance);
        result.put("growth", growth);
        Map<String, Object> competitive = new LinkedHashMap<>();
        competitive.put("strengths", strengths);
        competitive.put("risks", risks);
        competitive.put("filingRisks", filingRisks);
        competitive.put("filingStatus", filing.status());
        competitive.put("filingUrl", filing.filingUrl());
        competitive.put("filingPeriod", filing.periodEnd());
        competitive.put("news", news);
        result.put("competitivePosition", competitive);
        result.put("peers", peerTable);
        result.put("peerCoverage", Map.of("companies", peerTable.size(),
                "withSECAnnuals", profiles.stream().filter(p -> p.now() != null).count(),
                "peValidPeers", peers.stream().filter(p -> p.pe() != null).count(),
                "psValidPeers", peers.stream().filter(p -> p.priceSales() != null).count()));
        return result;
    }

    /** Use stored records first; retrieve missing peer valuation metrics from Finnhub if configured. */
    private Profile profile(Company c, SecFactsClient.SecResult report) {
        List<SecFactsClient.AnnualFacts> years = report.years();
        boolean lookup = marketCapUsd(c) == null || num(c.getPeRatio()) == null;
        FinnhubPeerClient.Snapshot quote = lookup ? finnhub.lookup(c.getTicker())
                : new FinnhubPeerClient.Snapshot(null, null, "stored");
        return new Profile(c, years.isEmpty() ? null : years.get(0),
                years.size() < 2 ? null : years.get(1), report.url(), quote);
    }

    /** SEC-traceable, curated semiconductor comparison set when the database is sparse. */
    private List<Company> peerCandidates(Company selected) {
        List<Company> universe = companies.findAll();
        Map<String, Company> byTicker = new LinkedHashMap<>();
        for (Company company : universe) {
            if (company.getTicker() != null) byTicker.put(company.getTicker().toUpperCase(Locale.ROOT), company);
        }
        List<Company> result = new ArrayList<>();
        String sector = selected.getSector() == null ? "" : selected.getSector().toLowerCase(Locale.ROOT);
        if (sector.contains("semiconductor")) {
            Map<String, String> disclosedIssuers = Map.of(
                    "NVDA", "NVIDIA Corporation", "AMD", "Advanced Micro Devices",
                    "INTC", "Intel Corporation", "AVGO", "Broadcom Inc.",
                    "QCOM", "QUALCOMM Incorporated", "MU", "Micron Technology",
                    "TXN", "Texas Instruments", "ADI", "Analog Devices",
                    "MRVL", "Marvell Technology");
            for (String ticker : List.of("NVDA", "AMD", "INTC", "AVGO", "QCOM", "MU", "TXN", "ADI", "MRVL")) {
                if (ticker.equalsIgnoreCase(selected.getTicker())) continue;
                Company candidate = byTicker.get(ticker);
                if (candidate == null) {
                    candidate = new Company();
                    candidate.setTicker(ticker);
                    candidate.setName(disclosedIssuers.getOrDefault(ticker, ticker));
                    candidate.setSector("Semiconductors");
                }
                result.add(candidate);
                if (result.size() >= 5) return List.copyOf(result);
            }
        }
        universe.stream()
                .filter(c -> c.getTicker() != null && !c.getTicker().equalsIgnoreCase(selected.getTicker()))
                .filter(c -> c.getSector() != null && !sector.isBlank()
                        && c.getSector().equalsIgnoreCase(selected.getSector()))
                .sorted(Comparator.comparing((Company c) ->
                        marketCapUsd(c) == null ? -1.0 : marketCapUsd(c)).reversed())
                .limit(5).forEach(result::add);
        return List.copyOf(result);
    }

    private List<Map<String, Object>> latestNews(String ticker) {
        List<Map<String, Object>> items = new ArrayList<>();
        try {
            for (NewsItem item : newsItems.findByCompanyTickerOrderByPublishedAtDesc(ticker)) {
                if (items.size() >= 3) break;
                String url = item.getUrl();
                if (url == null || !url.startsWith("https://")) continue;
                if (item.getHeadline() == null || item.getHeadline().isBlank()) continue;
                Map<String, Object> record = new LinkedHashMap<>();
                record.put("headline", item.getHeadline().trim());
                record.put("source", item.getSource());
                record.put("url", url);
                record.put("date", item.getPublishedAt() == null ? null : item.getPublishedAt().toLocalDate().toString());
                items.add(record);
            }
        } catch (RuntimeException ignored) {
            // News is supplementary; financial evidence must remain available if it fails.
        }
        return items;
    }

    private List<Map<String, Object>> strengths(Profile p, Map<String, Double> peerMedian) {
        List<Map<String, Object>> out = new ArrayList<>();
        Double margin = p.operatingMargin(), fcf = p.freeCashFlow(), cashMargin = p.cashFlowMargin();
        if (margin != null && margin >= 15) out.add(evidence("Profitability advantage", "Operating margin of " + fmt(margin, 1, "%") + " in the latest filing.",
                "Operating income / revenue", p));
        if (fcf != null && fcf > 0 && cashMargin != null && cashMargin >= 10) out.add(evidence("Cash conversion", fmt(cashMargin, 1, "%") + " of revenue converted to estimated free cash flow (" + cash(fcf) + ").",
                "Operating cash flow − capital expenditure", p));
        if (p.revenueGrowth() != null && p.revenueGrowth() >= 5) out.add(evidence("Revenue momentum", "Annual revenue increased " + fmt(p.revenueGrowth(), 1, "%") + " year on year.",
                "Current vs previous SEC annual revenue", p));
        if (p.epsGrowth() != null && p.epsGrowth() >= 5) out.add(evidence("Earnings expansion", "Diluted EPS grew " + fmt(p.epsGrowth(), 1, "%") + " year on year.",
                "Current vs previous diluted EPS", p));
        if (p.currentRatio() != null && p.currentRatio() >= 1.5) out.add(evidence("Liquidity coverage", "Current assets cover current liabilities " + fmt(p.currentRatio(), 2, "x") + ".",
                "Current assets / current liabilities", p));
        Double peerMargin = peerMedian.get("operatingMargin");
        if (margin != null && peerMargin != null && margin >= peerMargin + 5) out.add(evidence("Margin vs peer set", "Operating margin exceeds the comparable peer median by " + fmt(margin - peerMargin, 1, " percentage points") + ".",
                "Company and same-sector peer SEC filings", p));
        return out;
    }

    private List<Map<String, Object>> risks(Profile p, Map<String, Double> peerMedian) {
        List<Map<String, Object>> out = new ArrayList<>();
        Double ratio = p.currentRatio(), de = p.debtToEquity(), netDebt = p.netDebt();
        if (ratio != null && ratio < 1.15) out.add(evidence("Limited current-asset headroom", "Current ratio is " + fmt(ratio, 2, "x") + "; near-term asset coverage is relatively narrow.",
                "SEC current assets / current liabilities", p));
        if (netDebt != null && netDebt > 0) out.add(evidence("Net borrowing position", "Total reported borrowings exceed cash by " + cash(netDebt) + ".",
                "SEC debt and cash balances", p));
        if (de != null && de > 1) out.add(evidence("Elevated book leverage", "Debt / equity is " + fmt(de, 2, "x") + "; review financing and capital allocation.",
                "SEC debt / shareholders' equity", p));
        Double peerMargin = peerMedian.get("operatingMargin");
        if (p.operatingMargin() != null && peerMargin != null && p.operatingMargin() + 5 < peerMargin)
            out.add(evidence("Operating margin trails peers", "Reported operating margin "
                    + fmt(p.operatingMargin(), 1, "%") + " vs peer median " + fmt(peerMargin, 1, "%")
                    + "; examine product mix and cost structure.", "Company and same-sector peer SEC operating income / revenue", p));
        Double peerGross = peerMedian.get("grossMargin");
        if (p.grossMargin() != null && peerGross != null && p.grossMargin() + 8 < peerGross)
            out.add(evidence("Gross margin gap", "Gross margin " + fmt(p.grossMargin(), 1, "%")
                    + " vs peer median " + fmt(peerGross, 1, "%") + ".", "Company and same-sector peer SEC gross profit / revenue", p));
        Double peerPs = peerMedian.get("ps");
        if (p.priceSales() != null && peerPs != null && peerPs > 0 && p.priceSales() >= peerPs * 1.2)
            out.add(evidence("Price / sales premium", "P/S " + fmt(p.priceSales(), 1, "x")
                    + " vs peer median " + fmt(peerPs, 1, "x")
                    + "; growth expectations may already be reflected in pricing.",
                    "Stored Finnhub market cap / annual SEC revenue vs comparable peers", p));
        Double peerPe = peerMedian.get("pe");
        if (p.pe() != null && peerPe != null && peerPe > 0 && p.pe() >= peerPe * 1.2) out.add(evidence("Valuation premium", "P/E of " + fmt(p.pe(), 1, "x") + " vs " + fmt(peerPe, 1, "x") + " peer median; expectations may be demanding.",
                "Stored Finnhub P/E and same-sector peer median", p));
        if (p.epsGrowth() != null && p.epsGrowth() < 0) out.add(evidence("Earnings pressure", "Diluted EPS declined " + fmt(-p.epsGrowth(), 1, "%") + " year on year.",
                "SEC annual diluted EPS", p));
        if (p.revenueGrowth() != null && p.revenueGrowth() < 0) out.add(evidence("Revenue contraction", "Revenue decreased " + fmt(-p.revenueGrowth(), 1, "%") + " year on year.",
                "SEC annual revenue", p));
        if (p.freeCashFlow() != null && p.freeCashFlow() < 0) out.add(evidence("Negative free cash flow", "Annual estimated free cash flow was " + cash(p.freeCashFlow()) + ".",
                "SEC cash from operations less capex", p));
        Double equityRatio = percent(p.fact("equity"), p.fact("assets"));
        if (p.returnOnEquity() != null && p.returnOnEquity() > 80 && equityRatio != null && equityRatio < 20)
            out.add(evidence("ROE denominator sensitivity", "Return on equity is " + fmt(p.returnOnEquity(), 1, "%") + " with book equity only " + fmt(equityRatio, 1, "%") + " of assets.",
                    "SEC net income, assets and shareholders' equity", p));
        return out;
    }

    private Map<String, Object> evidence(String title, String description, String calculation, Profile p) {
        Map<String, Object> obj = new LinkedHashMap<>();
        obj.put("title", title);
        obj.put("description", description);
        obj.put("calculation", calculation);
        boolean includesStore = calculation.contains("Finnhub");
        obj.put("sourceLabel", includesStore ? "SEC annual + stored Finnhub pricing" : "SEC annual XBRL");
        obj.put("sourceUrl", p.source());
        obj.put("periodEnd", p.period());
        return obj;
    }

    private static Map<String, Object> valuation(String metric, Double value, Double peer, String suffix,
                                                  int precision, boolean lowerBetter, String formula) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("metric", metric);
        out.put("company", fmt(value, precision, suffix));
        out.put("industry", fmt(peer, precision, suffix));
        out.put("tone", value == null || peer == null ? "neutral" :
                lowerBetter ? (value <= peer ? "better" : "worse") : (value >= peer ? "better" : "worse"));
        out.put("formula", formula);
        out.put("peerCovered", peer != null);
        return out;
    }

    private static Map<String, Object> profit(String label, Double value, Double benchmark) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("label", label); out.put("value", safe(value)); out.put("benchmark", safe(benchmark));
        return out;
    }

    private static Map<String, Object> balance(String label, String value, String status, String note) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("label", label); out.put("value", value); out.put("status", status); out.put("note", note);
        return out;
    }

    private static Map<String, Object> growthSeries(String label, List<SecFactsClient.AnnualFacts> years, String key) {
        List<Map<String, Object>> points = new ArrayList<>();
        List<Map<String, Object>> levels = new ArrayList<>();
        double divisor = "eps".equals(key) ? 1.0 : 1_000_000_000.0;
        for (int i = years.size() - 1; i >= 0; i--) {
            Double cur = safe(years.get(i).get(key));
            if (cur != null) levels.add(Map.of("period", "FY" + years.get(i).fiscalYear(), "value", cur / divisor));
            if (i < years.size() - 1) {
                Double prior = safe(years.get(i + 1).get(key));
                Double diff = change(cur, prior);
                if (diff != null) points.add(Map.of("period", "FY" + years.get(i).fiscalYear(), "value", diff));
            }
        }
        return Map.of("label", label, "data", points, "levels", levels, "unit", "eps".equals(key) ? "USD/share" : "USD billions");
    }

    private static Map<String, Object> cashFlowSeries(List<SecFactsClient.AnnualFacts> years) {
        List<Map<String, Object>> points = new ArrayList<>();
        List<Map<String, Object>> levels = new ArrayList<>();
        for (int i = years.size() - 1; i >= 0; i--) {
            SecFactsClient.AnnualFacts now = years.get(i);
            Double nowFcf = minus(safe(now.get("operatingCashFlow")), safe(now.get("capex")));
            if (nowFcf != null) levels.add(Map.of("period", "FY" + now.fiscalYear(), "value", nowFcf / 1_000_000_000.0));
            if (i < years.size() - 1) {
                SecFactsClient.AnnualFacts prior = years.get(i + 1);
                Double priorFcf = minus(safe(prior.get("operatingCashFlow")), safe(prior.get("capex")));
                Double delta = change(nowFcf, priorFcf);
                if (delta != null) points.add(Map.of("period", "FY" + now.fiscalYear(), "value", delta));
            }
        }
        return Map.of("label", "FCF Growth", "data", points, "levels", levels, "unit", "USD billions");
    }

    private static Double median(List<Double> values) {
        List<Double> sorted = values.stream().filter(Objects::nonNull).filter(Double::isFinite).sorted().toList();
        if (sorted.size() < 2) return null;
        int n = sorted.size();
        return n % 2 == 1 ? sorted.get(n / 2) : (sorted.get(n / 2 - 1) + sorted.get(n / 2)) / 2.0;
    }

    private static Double marketCapUsd(Company c) {
        Double n = num(c.getMarketCapitalization());
        return n == null ? null : safe(n * 1_000_000);
    }
    private static Double num(BigDecimal n) { return n == null ? null : safe(n.doubleValue()); }
    private static Double safe(Double value) { return value != null && Double.isFinite(value) ? value : null; }
    private static Double sumRequired(Double a, Double b) { return a == null || b == null ? null : safe(a + b); }
    private static Double minus(Double a, Double b) { return a == null || b == null ? null : safe(a - b); }
    private static Double average(Double a, Double b) { return a == null || b == null ? null : safe((a + b) / 2); }
    private static Double div(Double a, Double b) { return a == null || b == null || b == 0 ? null : safe(a / b); }
    private static Double percent(Double a, Double b) { Double d = div(a, b); return d == null ? null : d * 100; }
    private static Double change(Double a, Double b) { return a == null || b == null || b <= 0 ? null : safe(100 * (a / b - 1)); }
    private static String range(Double value, double warn, double good) { return value == null ? "missing" : value < warn ? "watch" : value >= good ? "positive" : "reported"; }
    private static String fmt(Double n, int p) { return fmt(n, p, ""); }
    private static String fmt(Double n, int p, String suffix) {
        return n == null ? null : String.format(Locale.US, "%." + p + "f", n) + suffix;
    }
    private static String cash(Double n) {
        if (n == null) return null;
        double a = Math.abs(n);
        String v = a >= 1e12 ? String.format(Locale.US, "$%.2fT", a / 1e12)
                : a >= 1e9 ? String.format(Locale.US, "$%.2fB", a / 1e9)
                : a >= 1e6 ? String.format(Locale.US, "$%.1fM", a / 1e6)
                : String.format(Locale.US, "$%,.0f", a);
        return n < 0 ? "-" + v : v;
    }
}

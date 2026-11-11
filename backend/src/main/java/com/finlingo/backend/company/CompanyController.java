package com.finlingo.backend.company;

import java.util.HashSet;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/companies")
public class CompanyController {

    private final CompanyRepository companyRepository;
    private final CompanyResearchService companyResearchService;
    private final NewsItemRepository newsItemRepository;

    public CompanyController(CompanyRepository companyRepository,
                             CompanyResearchService companyResearchService,
                             NewsItemRepository newsItemRepository) {
        this.companyRepository = companyRepository;
        this.companyResearchService = companyResearchService;
        this.newsItemRepository = newsItemRepository;
    }

    // There can never be more than the 30 approved tickers in the public catalog.
    // This endpoint serves PostgreSQL, not an external market-data provider.
    @GetMapping
    public List<Company> getAll() {
        return companyRepository.findAll().stream()
                .filter(c -> CompanyUniverse.contains(c.getTicker()))
                .sorted(Comparator.comparing(Company::getTicker))
                .limit(CompanyUniverse.TICKERS.size())
                .toList();
    }

    @GetMapping("/search")
    public List<Company> search(@RequestParam(defaultValue = "") String q) {
        String term = q.trim().toLowerCase(Locale.ROOT);
        if (term.isEmpty()) return getAll();
        return getAll().stream().filter(c ->
                c.getTicker().toLowerCase(Locale.ROOT).contains(term)
                || c.getName().toLowerCase(Locale.ROOT).contains(term)
                || (c.getSector() != null && c.getSector().toLowerCase(Locale.ROOT).contains(term))
        ).toList();
    }

    @GetMapping("/{ticker}")
    public CompanyResearchDTO getOne(@PathVariable String ticker) {
        ensureCovered(ticker);
        return companyResearchService.getCompanyResearch(ticker);
    }

    // News already saved in news_items. No new requests to Finnhub when users open this page.
@GetMapping("/{ticker}/news")
public List<CompanyNewsDTO> getNews(@PathVariable String ticker) {
    ensureCovered(ticker);

    Set<String> seenUrls = new HashSet<>();
    Set<String> seenHeadlines = new HashSet<>();

    return newsItemRepository
            .findByCompanyTickerOrderByPublishedAtDesc(
                    ticker.toUpperCase(Locale.ROOT))
            .stream()
            .filter(n -> n.getUrl() != null
                    && (n.getUrl().startsWith("https://")
                    || n.getUrl().startsWith("http://")))
            .filter(n -> n.getHeadline() != null
                    && !n.getHeadline().isBlank())
            .filter(n -> seenUrls.add(n.getUrl().trim()))
            .filter(n -> seenHeadlines.add(
                    n.getHeadline().trim().toLowerCase(Locale.ROOT)))
            .filter(n -> CompanyUniverse.matchesNewsHeadline(ticker, n.getHeadline()))
            .filter(n -> n.getPublishedAt() != null
                    && !n.getPublishedAt().isBefore(java.time.LocalDateTime.now().minusDays(8))
                    && !n.getPublishedAt().isAfter(java.time.LocalDateTime.now().plusMinutes(10)))
            .limit(8)
            .map(n -> new CompanyNewsDTO(
                    n.getId(),
                    n.getHeadline(),
                    n.getSource(),
                    n.getUrl(),
                    n.getPublishedAt()))
            .toList();
}

    public record CompanyNewsDTO(Integer id, String headline, String source,
                                 String url, LocalDateTime publishedAt) { }

    private static void ensureCovered(String ticker) {
        if (!CompanyUniverse.contains(ticker)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "Company is not in the supported research universe");
        }
    }
}

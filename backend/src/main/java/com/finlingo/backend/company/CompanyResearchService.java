package com.finlingo.backend.company;

import org.springframework.stereotype.Service;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
public class CompanyResearchService {

    private final CompanyRepository companyRepository;
    private final PriceHistoryRepository priceHistoryRepository;
    private final JdbcTemplate jdbc;

    public CompanyResearchService(
            CompanyRepository companyRepository,
            PriceHistoryRepository priceHistoryRepository,
            JdbcTemplate jdbc
    ) {
        this.companyRepository = companyRepository;
        this.priceHistoryRepository = priceHistoryRepository;
        this.jdbc = jdbc;
    }

    public CompanyResearchDTO getCompanyResearch(String ticker) {

        String symbol = ticker.toUpperCase();

        Company company = companyRepository
                .findByTickerIgnoreCase(symbol)
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND,
                                "Company not found with ticker: " + symbol)
                );

        List<PriceHistory> history =
                priceHistoryRepository
                        .findByCompanyTickerOrderByDateAsc(symbol);

        BigDecimal price = null;
        BigDecimal change = BigDecimal.ZERO;
        boolean positive = true;

        BigDecimal open = null;
        BigDecimal high = null;
        BigDecimal low = null;
        Long volume = null;

        List<CompanyResearchDTO.PricePointDTO> chartData =
                history.stream()
                        .map(item ->
                                new CompanyResearchDTO.PricePointDTO(
                                        item.getDate().toString(),
                                        item.getClose()
                                )
                        )
                        .toList();

        // ---------------------------------------------
        // Latest price
        // ---------------------------------------------

        if (!history.isEmpty()) {

            PriceHistory latest =
                    history.get(history.size() - 1);

            price = latest.getClose();
            open = latest.getOpen();
            high = latest.getHigh();
            low = latest.getLow();
            volume = latest.getVolume();

            // -----------------------------------------
            // Calculate % change from previous close
            // -----------------------------------------

            BigDecimal previousClose = latest.getPreviousClose();
            if (previousClose == null && history.size() >= 2) {
                previousClose = history.get(history.size() - 2).getClose();
            }

            if (price != null
                    && previousClose != null
                    && previousClose.compareTo(BigDecimal.ZERO) != 0) {

                    change = price
                            .subtract(previousClose)
                            .divide(
                                    previousClose,
                                    6,
                                    RoundingMode.HALF_UP
                            )
                            .multiply(
                                    BigDecimal.valueOf(100)
                            )
                            .setScale(
                                    2,
                                    RoundingMode.HALF_UP
                            );

                    positive =
                            change.compareTo(
                                    BigDecimal.ZERO
                            ) >= 0;
            }
        }

        // ---------------------------------------------
        // Build frontend-ready DTO
        // ---------------------------------------------

        CompanyResearchDTO dto = new CompanyResearchDTO(
                company.getTicker(),
                company.getName(),
                company.getSector(),
                company.getDescription(),
                company.getExchange(),
                company.getCountry(),

                // market
                company.getExchange(),

                price,
                change,
                positive,

                company.getMarketCapitalization(),
                company.getPeRatio(),
                company.getRevenueGrowth(),

                open,
                high,
                low,
                volume,

                chartData
        );
        dto.setFoundedYear(company.getFoundedYear());
        dto.setHeadquarters(company.getHeadquarters());
        dto.setDescriptionSourceUrl(company.getDescriptionSourceUrl());
        dto.setDescriptionSourceName(company.getDescriptionSourceName());
        if (company.getDescriptionUpdatedAt() != null) {
            dto.setDescriptionUpdatedAt(company.getDescriptionUpdatedAt().toString());
        }
        if (!history.isEmpty()) {
            dto.setLatestPriceDate(history.get(history.size() - 1).getDate().toString());
        }
        attachReportedFinancials(symbol, dto);
        return dto;
    }

    // Read only from local PostgreSQL. SEC ingestion happens only via explicit CLI commands.
    private void attachReportedFinancials(String symbol, CompanyResearchDTO dto) {
        try {
            // Return both annual and stand-alone quarterly facts. Do not combine period kinds.
            var facts = jdbc.query("""
                SELECT metric, period_kind, period_end, value_usd, source_url, filed_at
                FROM financial_fact
                WHERE ticker = ? AND period_kind IN ('FY', 'Q')
                  AND period_end >= CURRENT_DATE - INTERVAL '6 years'
                ORDER BY period_kind, period_end DESC, metric
                """, (rs, i) -> new CompanyResearchDTO.FinancialFactDTO(
                    rs.getString("metric"), rs.getString("period_kind"),
                    rs.getDate("period_end").toString(), rs.getBigDecimal("value_usd"),
                    rs.getString("source_url"), rs.getDate("filed_at").toString()), symbol);

            // Four reporting periods for each frequency, not just four overall.
            Set<String> lastAnnual = new java.util.LinkedHashSet<>();
            Set<String> lastQuarterly = new java.util.LinkedHashSet<>();
            for (var fact : facts) {
                Set<String> periods = "FY".equals(fact.periodKind()) ? lastAnnual : lastQuarterly;
                if (periods.size() < 4) periods.add(fact.periodEnd());
            }
            dto.setFinancialFacts(facts.stream().filter(f ->
                ("FY".equals(f.periodKind()) ? lastAnnual : lastQuarterly)
                    .contains(f.periodEnd())).toList());

            var segments = jdbc.query("""
                SELECT period_end, category, segment_basis, value_usd, source_url
                FROM revenue_segment WHERE ticker = ?
                ORDER BY period_end DESC, segment_basis, category
                """, (rs, i) -> new RawSegment(rs.getDate("period_end").toString(),
                        rs.getString("category"), rs.getString("segment_basis"),
                        rs.getBigDecimal("value_usd"), rs.getString("source_url")), symbol);
            if (!segments.isEmpty()) {
                RawSegment newest = segments.get(0);
                // Never combine product, geography or other incompatible segmentation bases.
                var coherent = segments.stream().filter(s -> s.date.equals(newest.date)
                        && s.basis.equals(newest.basis)).toList();
                if (coherent.size() >= 2) {
                    BigDecimal total = coherent.stream().map(s -> s.amount)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    if (total.signum() > 0) {
                        dto.setRevenueSegments(coherent.stream().map(s ->
                            new CompanyResearchDTO.RevenueSegmentDTO(s.category, s.amount,
                                s.amount.multiply(BigDecimal.valueOf(100))
                                    .divide(total, 2, RoundingMode.HALF_UP))).toList());
                        dto.setSegmentPeriod(newest.date);
                        dto.setSegmentSourceUrl(newest.sourceUrl);
                        dto.setSegmentBasis(newest.basis);
                    }
                }
            }
        } catch (org.springframework.jdbc.BadSqlGrammarException ex) {
            // Migration not yet installed: keep existing Research endpoints available.
            System.err.println("FINLINGO financial tables unavailable: run scripts/finlingo_financial_schema.sql");
        }
    }

    private record RawSegment(String date, String category, String basis,
                              BigDecimal amount, String sourceUrl) { }
}
package com.finlingo.backend.company;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class MarketOverviewService {

    private static final BigDecimal ZERO = BigDecimal.ZERO;
    private static final BigDecimal UNCHANGED_THRESHOLD = new BigDecimal("0.0001");

    private final CompanyRepository companyRepository;
    private final PriceHistoryRepository priceHistoryRepository;

    public MarketOverviewService(
            CompanyRepository companyRepository,
            PriceHistoryRepository priceHistoryRepository) {
        this.companyRepository = companyRepository;
        this.priceHistoryRepository = priceHistoryRepository;
    }

    public MarketOverviewDTO getOverview() {
        List<Company> companies = companyRepository.findAll().stream()
                .filter(company -> CompanyUniverse.contains(company.getTicker()))
                .toList();

        Map<String, List<PriceHistory>> historyByTicker =
                priceHistoryRepository.findAllByOrderByDateAsc().stream()
                        .filter(row -> row.getCompany() != null)
                        .filter(row -> CompanyUniverse.contains(row.getCompany().getTicker()))
                        .collect(Collectors.groupingBy(
                                row -> row.getCompany().getTicker()));

        LocalDateTime asOf = historyByTicker.values().stream()
                .flatMap(List::stream)
                .map(PriceHistory::getFetchedAt)
                .filter(value -> value != null)
                .max(LocalDateTime::compareTo)
                .orElse(null);

        List<CompanyMove> moves = new ArrayList<>();
        int pricedCompanies = 0;

        for (Company company : companies) {
            List<PriceHistory> rows = new ArrayList<>(
                    historyByTicker.getOrDefault(company.getTicker(), List.of()));
            rows.sort(Comparator.comparing(
                    PriceHistory::getDate,
                    Comparator.nullsLast(Comparator.reverseOrder())));

            if (rows.isEmpty()) continue;

            PriceHistory latest = rows.get(0);
            if (latest.getClose() == null) continue;
            pricedCompanies++;

            BigDecimal baseline = latest.getPreviousClose();
            if (baseline == null && rows.size() >= 2) {
                baseline = rows.get(1).getClose();
            }
            if (baseline == null || baseline.compareTo(ZERO) <= 0) {
                continue;
            }

            BigDecimal changePercent = latest.getClose()
                    .subtract(baseline)
                    .multiply(new BigDecimal("100"))
                    .divide(baseline, 4, RoundingMode.HALF_UP);

            moves.add(new CompanyMove(
                    company.getTicker(),
                    company.getName(),
                    company.getSector() == null || company.getSector().isBlank()
                            ? "Unclassified" : company.getSector(),
                    changePercent,
                    latest.getClose()));
        }

        int advancers = (int) moves.stream()
                .filter(move -> move.changePercent().compareTo(UNCHANGED_THRESHOLD) > 0)
                .count();
        int decliners = (int) moves.stream()
                .filter(move -> move.changePercent().compareTo(UNCHANGED_THRESHOLD.negate()) < 0)
                .count();
        int unchanged = moves.size() - advancers - decliners;

        Map<String, List<CompanyMove>> bySector = new TreeMap<>();
        for (CompanyMove move : moves) {
            bySector.computeIfAbsent(move.sector(), ignored -> new ArrayList<>()).add(move);
        }

        List<SectorPerformanceDTO> sectors = bySector.entrySet().stream()
                .map(entry -> {
                    BigDecimal average = entry.getValue().stream()
                            .map(CompanyMove::changePercent)
                            .reduce(ZERO, BigDecimal::add)
                            .divide(BigDecimal.valueOf(entry.getValue().size()), 2, RoundingMode.HALF_UP);
                    return new SectorPerformanceDTO(
                            entry.getKey(), average, entry.getValue().size());
                })
                .sorted(Comparator.comparing(
                        SectorPerformanceDTO::changePercent,
                        Comparator.reverseOrder()))
                .toList();

        Comparator<CompanyMove> byChange =
                Comparator.comparing(CompanyMove::changePercent);

        List<MarketMoverDTO> gainers = moves.stream()
                .filter(move -> move.changePercent().compareTo(ZERO) > 0)
                .sorted(byChange.reversed())
                .limit(5)
                .map(MarketMoverDTO::from)
                .toList();

        List<MarketMoverDTO> losers = moves.stream()
                .filter(move -> move.changePercent().compareTo(ZERO) < 0)
                .sorted(byChange)
                .limit(5)
                .map(MarketMoverDTO::from)
                .toList();

        return new MarketOverviewDTO(
                "FinLingo tracked companies",
                companies.size(),
                pricedCompanies,
                advancers,
                decliners,
                unchanged,
                asOf,
                sectors,
                gainers,
                losers);
    }

    private record CompanyMove(
            String ticker,
            String name,
            String sector,
            BigDecimal changePercent,
            BigDecimal price) { }

    public record SectorPerformanceDTO(
            String name,
            BigDecimal changePercent,
            int companies) { }

    public record MarketMoverDTO(
            String ticker,
            String name,
            BigDecimal changePercent,
            BigDecimal price) {
        private static MarketMoverDTO from(CompanyMove move) {
            return new MarketMoverDTO(
                    move.ticker(), move.name(), move.changePercent(), move.price());
        }
    }

    public record MarketOverviewDTO(
            String scope,
            int trackedCompanies,
            int pricedCompanies,
            int advancers,
            int decliners,
            int unchanged,
            LocalDateTime asOf,
            List<SectorPerformanceDTO> sectors,
            List<MarketMoverDTO> gainers,
            List<MarketMoverDTO> losers) { }
}
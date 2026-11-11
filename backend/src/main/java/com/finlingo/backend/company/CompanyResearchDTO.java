package com.finlingo.backend.company;

import java.math.BigDecimal;
import java.util.List;


public class CompanyResearchDTO {


    private java.util.List<FinancialFactDTO> financialFacts = java.util.List.of();
    private java.util.List<RevenueSegmentDTO> revenueSegments = java.util.List.of();
    private String segmentPeriod;
    private String segmentSourceUrl;
    private String segmentBasis;
    public record FinancialFactDTO(String metric, String periodKind, String periodEnd,
                                   java.math.BigDecimal valueUsd, String sourceUrl, String filedAt) { }
    public record RevenueSegmentDTO(String label, java.math.BigDecimal valueUsd,
                                   java.math.BigDecimal share) { }
    public java.util.List<FinancialFactDTO> getFinancialFacts() { return financialFacts; }
    public void setFinancialFacts(java.util.List<FinancialFactDTO> facts) { this.financialFacts = facts; }
    public java.util.List<RevenueSegmentDTO> getRevenueSegments() { return revenueSegments; }
    public void setRevenueSegments(java.util.List<RevenueSegmentDTO> segments) { this.revenueSegments = segments; }
    public String getSegmentPeriod() { return segmentPeriod; }
    public void setSegmentPeriod(String period) { this.segmentPeriod = period; }
    public String getSegmentSourceUrl() { return segmentSourceUrl; }
    public void setSegmentSourceUrl(String url) { this.segmentSourceUrl = url; }
    public String getSegmentBasis() { return segmentBasis; }
    public void setSegmentBasis(String basis) { this.segmentBasis = basis; }

    private String ticker;
    private String name;
    private String sector;
    private String description;
    private String descriptionSourceUrl;
    private String descriptionSourceName;
    private String descriptionUpdatedAt;
    private Integer foundedYear;
    private String headquarters;
    private String exchange;
    private String country;
    private BigDecimal marketCapitalization;
    private BigDecimal pe;
    private BigDecimal revenueGrowth;
    private String market;

    private BigDecimal price;
    private BigDecimal change;
    private boolean positive;

    private BigDecimal open;
    private BigDecimal high;
    private BigDecimal low;
    private Long volume;

    private List<PricePointDTO> chartData;
    private String latestPriceDate;

    public CompanyResearchDTO() {
    }

    public CompanyResearchDTO(
        String ticker,
        String name,
        String sector,
        String description,
        String exchange,
        String country,
        String market,
        BigDecimal price,
        BigDecimal change,
        boolean positive,
        BigDecimal marketCapitalization,
        BigDecimal pe,
        BigDecimal revenueGrowth,
        BigDecimal open,
        BigDecimal high,
        BigDecimal low,
        Long volume,
        List<PricePointDTO> chartData
    ) {
        this.ticker = ticker;
        this.name = name;
        this.sector = sector;
        this.description = description;
        this.exchange = exchange;
        this.country = country;
        this.market = market;
        this.price = price;
        this.change = change;
        this.positive = positive;
        this.marketCapitalization = marketCapitalization;
        this.pe = pe;
        this.revenueGrowth = revenueGrowth;
        this.open = open;
        this.high = high;
        this.low = low;
        this.volume = volume;
        this.chartData = chartData;
    }

    public String getTicker() {
        return ticker;
    }

    public String getName() {
        return name;
    }

    public String getSector() {
        return sector;
    }

    public String getDescriptionSourceUrl() { return descriptionSourceUrl; }
    public void setDescriptionSourceUrl(String url) { this.descriptionSourceUrl = url; }
    public String getDescriptionSourceName() { return descriptionSourceName; }
    public void setDescriptionSourceName(String source) { this.descriptionSourceName = source; }
    public Integer getFoundedYear() { return foundedYear; }
    public void setFoundedYear(Integer foundedYear) { this.foundedYear = foundedYear; }
    public String getHeadquarters() { return headquarters; }
    public void setHeadquarters(String headquarters) { this.headquarters = headquarters; }
    public String getDescriptionUpdatedAt() { return descriptionUpdatedAt; }
    public void setDescriptionUpdatedAt(String date) { this.descriptionUpdatedAt = date; }

    public String getDescription() {
        return description;
    }

    public String getExchange() {
        return exchange;
    }

    public String getCountry() {
        return country;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public BigDecimal getChange() {
        return change;
    }

    public boolean isPositive() {
        return positive;
    }

    public BigDecimal getOpen() {
        return open;
    }

    public BigDecimal getHigh() {
        return high;
    }

    public BigDecimal getLow() {
        return low;
    }

    public Long getVolume() {
        return volume;
    }

    public List<PricePointDTO> getChartData() {
        return chartData;
    }
    public String getLatestPriceDate() { return latestPriceDate; }
    public void setLatestPriceDate(String latestPriceDate) { this.latestPriceDate = latestPriceDate; }

    public String getMarket() {
        return market;
    }

    public BigDecimal getMarketCapitalization() {
        return marketCapitalization;
    }

    public BigDecimal getPe() {
        return pe;
    }

    public BigDecimal getRevenueGrowth() {
        return revenueGrowth;
    }

    public static class PricePointDTO {

        private String date;
        private BigDecimal value;

        public PricePointDTO(String date, BigDecimal value) {
            this.date = date;
            this.value = value;
        }

        public String getDate() {
            return date;
        }

        public BigDecimal getValue() {
            return value;
        }
    }
}
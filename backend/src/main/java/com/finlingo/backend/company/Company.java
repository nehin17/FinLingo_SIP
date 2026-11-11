package com.finlingo.backend.company;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "company")
public class Company {

    @Id
    @Column(length = 10)
    private String ticker;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(length = 50)
    private String sector;

    @Column(columnDefinition = "TEXT")
    private String description;

    // Curated company facts are nullable until a reviewed source is available.
    @Column(name = "founded_year")
    private Integer foundedYear;

    @Column(name = "headquarters", length = 180)
    private String headquarters;

    @Column(length = 500, name = "description_source_url")
    private String descriptionSourceUrl;

    @Column(length = 100, name = "description_source_name")
    private String descriptionSourceName;

    @Column(name = "description_updated_at")
    private LocalDateTime descriptionUpdatedAt;

    @Column(length = 100)
    private String exchange;

    @Column(length = 50)
    private String country = "US";

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();
    @Column(precision = 19, scale = 4)
    private BigDecimal marketCapitalization;

    @Column(precision = 19, scale = 4)
    private BigDecimal peRatio;

    @Column(precision = 19, scale = 4)
    private BigDecimal revenueGrowth;

    @PreUpdate
    public void setLastUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public String getTicker() { return ticker; }
    public void setTicker(String ticker) { this.ticker = ticker != null ? ticker.toUpperCase() : null; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getSector() { return sector; }
    public void setSector(String sector) { this.sector = sector; }
    public Integer getFoundedYear() { return foundedYear; }
    public void setFoundedYear(Integer foundedYear) { this.foundedYear = foundedYear; }
    public String getHeadquarters() { return headquarters; }
    public void setHeadquarters(String headquarters) { this.headquarters = headquarters; }
    public String getDescription() { return description; }
    public String getDescriptionSourceUrl() { return descriptionSourceUrl; }
    public void setDescriptionSourceUrl(String url) { this.descriptionSourceUrl = url; }
    public String getDescriptionSourceName() { return descriptionSourceName; }
    public void setDescriptionSourceName(String source) { this.descriptionSourceName = source; }
    public LocalDateTime getDescriptionUpdatedAt() { return descriptionUpdatedAt; }
    public void setDescriptionUpdatedAt(LocalDateTime date) { this.descriptionUpdatedAt = date; }
    public void setDescription(String description) { this.description = description; }
    public String getExchange() { return exchange; }
    public void setExchange(String exchange) { this.exchange = exchange; }
    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public BigDecimal getMarketCapitalization() {
        return marketCapitalization;
    }

    public BigDecimal getPeRatio() {
        return peRatio;
    }

    public BigDecimal getRevenueGrowth() {
        return revenueGrowth;
    }
    public void setMarketCapitalization(BigDecimal marketCapitalization) {
        this.marketCapitalization = marketCapitalization;
    }

    public void setPeRatio(BigDecimal peRatio) {
        this.peRatio = peRatio;
    }

    public void setRevenueGrowth(BigDecimal revenueGrowth) {
        this.revenueGrowth = revenueGrowth;
    }
}
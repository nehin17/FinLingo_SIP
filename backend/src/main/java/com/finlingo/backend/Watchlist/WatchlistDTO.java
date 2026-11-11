package com.finlingo.backend.Watchlist;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class WatchlistDTO {
    private String ticker;
    private String name;
    private LocalDateTime addedAt;
    private String thesis;
    private String catalyst;
    private String risk;
    private String status;
    private LocalDate nextReviewDate;
    private LocalDateTime researchUpdatedAt;

    public WatchlistDTO(String ticker, String name, LocalDateTime addedAt) {
        this.ticker = ticker;
        this.name = name;
        this.addedAt = addedAt;
    }

    public static WatchlistDTO from(Watchlist item) {
        WatchlistDTO dto = new WatchlistDTO(
                item.getCompany().getTicker(),
                item.getCompany().getName(),
                item.getAddedAt()
        );
        dto.thesis = item.getThesis();
        dto.catalyst = item.getCatalyst();
        dto.risk = item.getRisk();
        dto.status = item.getStatus() == null ? "unassessed" : item.getStatus();
        dto.nextReviewDate = item.getNextReviewDate();
        dto.researchUpdatedAt = item.getResearchUpdatedAt();
        return dto;
    }

    public String getTicker() { return ticker; }
    public String getName() { return name; }
    public LocalDateTime getAddedAt() { return addedAt; }
    public String getThesis() { return thesis; }
    public String getCatalyst() { return catalyst; }
    public String getRisk() { return risk; }
    public String getStatus() { return status; }
    public LocalDate getNextReviewDate() { return nextReviewDate; }
    public LocalDateTime getResearchUpdatedAt() { return researchUpdatedAt; }
}

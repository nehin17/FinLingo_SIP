package com.finlingo.backend.company;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/market")
public class MarketOverviewController {

    private final MarketOverviewService marketOverviewService;

    public MarketOverviewController(MarketOverviewService marketOverviewService) {
        this.marketOverviewService = marketOverviewService;
    }

    @GetMapping("/overview")
    public MarketOverviewService.MarketOverviewDTO getOverview() {
        return marketOverviewService.getOverview();
    }
}
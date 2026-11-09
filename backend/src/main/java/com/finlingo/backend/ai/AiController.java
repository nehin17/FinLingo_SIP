package com.finlingo.backend.ai;

import com.finlingo.backend.ai.dto.ChatRequest;
import com.finlingo.backend.company.Company;
import com.finlingo.backend.company.CompanyRepository;
import com.finlingo.backend.company.PriceHistory;
import com.finlingo.backend.company.PriceHistoryRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Comparator;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    private final AiService aiService;
    private final CompanyRepository companyRepository;
    private final PriceHistoryRepository priceHistoryRepository;

    public AiController(
            AiService aiService,
            CompanyRepository companyRepository,
            PriceHistoryRepository priceHistoryRepository
    ) {
        this.aiService = aiService;
        this.companyRepository = companyRepository;
        this.priceHistoryRepository = priceHistoryRepository;
    }

    @PostMapping("/chat")
    public ResponseEntity<Map<String, String>> chat(
            @RequestBody ChatRequest request
    ) {
        if (request.getMessage() == null || request.getMessage().isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("response", "Please enter a question."));
        }

        String ticker = findTicker(request);

        String context = ticker == null
                ? "No specific company was identified. Answer general financial education questions, "
                  + "but do not invent current market data."
                : buildCompanyContext(ticker);

        String answer = aiService.generateAnswer(
                ticker,
                request.getMessage(),
                context
        );

        return ResponseEntity.ok(Map.of("response", answer));
    }

    private String findTicker(ChatRequest request) {
        if (request.getTicker() != null && !request.getTicker().isBlank()) {
            String requested = request.getTicker().trim().toUpperCase();

            return companyRepository.findByTickerIgnoreCase(requested)
                    .map(Company::getTicker)
                    .orElse(null);
        }

        String message = request.getMessage().toLowerCase();

        for (Company company : companyRepository.findAll()) {
            String ticker = company.getTicker();

            if (ticker != null && message.matches(
                    "(?s).*\\b" + java.util.regex.Pattern.quote(ticker.toLowerCase()) + "\\b.*")) {
                return ticker;
            }

            String name = company.getName();

            if (name != null && message.contains(name.toLowerCase())) {
                return ticker;
            }
        }

        return null;
    }

    private String buildCompanyContext(String ticker) {
        Company company = companyRepository
                .findByTickerIgnoreCase(ticker)
                .orElse(null);

        if (company == null) {
            return "No company data is available for " + ticker + ".";
        }

        StringBuilder context = new StringBuilder();

        context.append("Company: ").append(company.getName()).append("\n");
        context.append("Ticker: ").append(company.getTicker()).append("\n");
        context.append("Sector: ").append(company.getSector()).append("\n");
        context.append("Exchange: ").append(company.getExchange()).append("\n");
        context.append("Description: ").append(company.getDescription()).append("\n");
        context.append("Market capitalization: ")
                .append(company.getMarketCapitalization()).append("\n");
        context.append("P/E ratio: ").append(company.getPeRatio()).append("\n");
        context.append("Revenue growth: ").append(company.getRevenueGrowth()).append("\n");

        List<PriceHistory> prices =
                priceHistoryRepository.findByCompanyTickerOrderByDateAsc(ticker);

        prices.sort(Comparator.comparing(PriceHistory::getDate).reversed());

        if (!prices.isEmpty()) {
            PriceHistory latest = prices.get(0);

            context.append("\nLatest stored market data:\n");
            context.append("Date: ").append(latest.getDate()).append("\n");
            context.append("Close: ").append(latest.getClose()).append("\n");
            context.append("Open: ").append(latest.getOpen()).append("\n");
            context.append("High: ").append(latest.getHigh()).append("\n");
            context.append("Low: ").append(latest.getLow()).append("\n");
            context.append("Volume: ").append(latest.getVolume()).append("\n");
            context.append("Source: ").append(latest.getSource()).append("\n");

            context.append("\nRecent stored price history:\n");

            prices.stream()
                    .limit(10)
                    .forEach(price -> context
                            .append(price.getDate())
                            .append(": ")
                            .append(price.getClose())
                            .append("\n"));
        } else {
            context.append("\nNo stored price history is available.\n");
        }

        return context.toString();
    }
}
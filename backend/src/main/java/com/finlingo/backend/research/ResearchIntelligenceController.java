package com.finlingo.backend.research;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/companies")
public class ResearchIntelligenceController {
    private final ResearchIntelligenceService service;

    public ResearchIntelligenceController(ResearchIntelligenceService service) {
        this.service = service;
    }

    @GetMapping("/{ticker}/intelligence")
    public Map<String, Object> get(@PathVariable String ticker) {
        return service.getResearch(ticker);
    }
}

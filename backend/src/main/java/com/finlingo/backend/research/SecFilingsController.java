package com.finlingo.backend.research;
import com.finlingo.backend.company.CompanyUniverse;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
@RestController
@RequestMapping("/api/companies")
public class SecFilingsController {
    private final SecFilingsClient client;
    public SecFilingsController(SecFilingsClient client){this.client=client;}
    @GetMapping("/{ticker}/filings")
    public SecFilingsClient.FilingResponse get(@PathVariable String ticker){
        String symbol=ticker==null?"":ticker.trim().toUpperCase();
        if(!CompanyUniverse.contains(symbol)) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Company is outside the FinLingo Markets universe");
        return client.getFilings(symbol);
    }
}
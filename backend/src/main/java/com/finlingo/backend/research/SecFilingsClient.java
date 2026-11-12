package com.finlingo.backend.research;

import com.finlingo.backend.company.CompanyUniverse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/** Read-only SEC EDGAR filings for the exact curated Markets universe. */
@Service
public class SecFilingsClient {
    @Value("${SEC_USER_AGENT:}") private String userAgent;
    private final RestClient http;
    private volatile Map<String,String> ciks;
    private volatile long lastSecRequestAt = 0L;
    private final Map<String,Cached> cache = new ConcurrentHashMap<>();
    private record Cached(FilingResponse response, Instant until) {}
    public record Filing(String accessionNumber, String form, String filedAt, String reportDate,
                         String description, String primaryDocument, String documentUrl, String filingUrl) {}
    public record FilingResponse(String ticker, String status, String source, List<Filing> filings) {}
    public SecFilingsClient() {
        var f = new SimpleClientHttpRequestFactory(); f.setConnectTimeout(Duration.ofSeconds(5)); f.setReadTimeout(Duration.ofSeconds(10));
        http = RestClient.builder().requestFactory(f).build();
    }
    public FilingResponse getFilings(String input) {
        String t = input == null ? "" : input.trim().toUpperCase(Locale.ROOT);
        if (!t.matches("[A-Z0-9.\\-]{1,12}")) return empty(t,"invalid_ticker");
        if (!CompanyUniverse.contains(t)) return empty(t,"outside_supported_universe");
        if (userAgent == null || userAgent.isBlank()) return empty(t,"not_configured");
        Cached c = cache.get(t); if (c != null && c.until().isAfter(Instant.now())) return c.response();
        synchronized (cache) {
            c = cache.get(t); if (c != null && c.until().isAfter(Instant.now())) return c.response();
            FilingResponse result;
            try {
                String cik = tickerCiks().get(t);
                if (cik == null) result = empty(t,"cik_not_found");
                else {
                    Map<?,?> root = json("https://data.sec.gov/submissions/CIK"+cik+".json");
                    Map<?,?> recent = map(map(root.get("filings")).get("recent"));
                    List<?> forms=list(recent.get("form")), acc=list(recent.get("accessionNumber")), filed=list(recent.get("filingDate")),
                        periods=list(recent.get("reportDate")), docs=list(recent.get("primaryDocument")), desc=list(recent.get("primaryDocDescription"));
                    int n=Math.min(forms.size(),Math.min(acc.size(),Math.min(filed.size(),docs.size())));
                    List<Filing> rows=new ArrayList<>();
                    for(int i=0;i<n && rows.size()<30;i++) {
                        String form=String.valueOf(forms.get(i));
                        if(!List.of("10-K","10-K/A","10-Q","10-Q/A").contains(form)) continue;
                        String accession=String.valueOf(acc.get(i)), doc=String.valueOf(docs.get(i));
                        if(!accession.matches("[0-9]{10}-[0-9]{2}-[0-9]{6}") || !doc.matches("[A-Za-z0-9_.-]+")) continue;
                        String compact=accession.replace("-", ""), numericCik=Long.toString(Long.parseLong(cik));
                        String base="https://www.sec.gov/Archives/edgar/data/"+numericCik+"/"+compact+"/";
                        String period=i<periods.size()&&periods.get(i)!=null?String.valueOf(periods.get(i)):null;
                        String description=i<desc.size()&&desc.get(i)!=null?String.valueOf(desc.get(i)):"";
                        rows.add(new Filing(accession,form,String.valueOf(filed.get(i)),period,description,doc,base+doc,
                            base+compact+"-index.html"));
                    }
                    result=new FilingResponse(t,rows.isEmpty()?"no_recent_filings":"available","SEC EDGAR submissions",List.copyOf(rows));
                }
            } catch(Exception ex) {
                System.err.println("SEC filing catalogue unavailable for "+t+": "+ex.getClass().getSimpleName());
                result=empty(t,"request_failed");
            }
            cache.put(t,new Cached(result,Instant.now().plus(Duration.ofHours(6)))); return result;
        }
    }
    private FilingResponse empty(String t,String status){return new FilingResponse(t,status,"SEC EDGAR",List.of());}
    private Map<String,String> tickerCiks() {
        if(ciks!=null)return ciks;
        synchronized(this){ if(ciks!=null)return ciks;
            Map<?,?> payload=json("https://www.sec.gov/files/company_tickers.json"); Map<String,String> out=new HashMap<>();
            for(Object value:payload.values()){Map<?,?> item=map(value); Object ticker=item.get("ticker"), id=item.get("cik_str");
                if(ticker!=null && id instanceof Number number) out.put(ticker.toString().toUpperCase(Locale.ROOT),String.format("%010d",number.longValue()));}
            ciks=Map.copyOf(out); return ciks;
        }
    }
    private Map<?,?> json(String url) {
        synchronized (this) {
            long wait = Math.max(0L, 180L - (System.currentTimeMillis() - lastSecRequestAt));
            if (wait > 0L) {
                try { Thread.sleep(wait); }
                catch (InterruptedException ex) { Thread.currentThread().interrupt(); throw new IllegalStateException("SEC request interrupted", ex); }
            }
            lastSecRequestAt = System.currentTimeMillis();
        }
        Map<?,?> m = http.get().uri(url).header("User-Agent", userAgent).header("Accept", "application/json").retrieve().body(Map.class);
        if (m == null) throw new IllegalStateException("Empty SEC response");
        return m;
    }
    private static Map<?,?> map(Object x){return x instanceof Map<?,?> m?m:Map.of();}
    private static List<?> list(Object x){return x instanceof List<?> l?l:List.of();}
}

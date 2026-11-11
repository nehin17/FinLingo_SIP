package com.finlingo.backend.company;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface NewsItemRepository extends JpaRepository<NewsItem, Integer> {
    List<NewsItem> findByCompanyTickerOrderByPublishedAtDesc(String ticker);
    boolean existsByCompanyTickerAndUrl(String ticker, String url);
}
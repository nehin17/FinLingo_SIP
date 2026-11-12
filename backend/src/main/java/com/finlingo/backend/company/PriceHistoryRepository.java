package com.finlingo.backend.company;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface PriceHistoryRepository
        extends JpaRepository<PriceHistory, Long> {

    List<PriceHistory> findByCompanyTickerOrderByDateAsc(String ticker);

    Optional<PriceHistory> findByCompanyTickerAndDate(
            String ticker,
            LocalDate date
    );

    List<PriceHistory> findAllByOrderByDateAsc();
}
package com.finlingo.backend.account;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccountPreferencesRepository extends JpaRepository<AccountPreferences, UUID> {}

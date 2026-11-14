package com.example.demo.repo;

import com.example.demo.model.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    void deleteByFamilyId(String familyId);

    void deleteByExpiresAtBefore(Instant cutoff);

    /** Ends every session of a user (all devices). NEW: used after a password change. */
    void deleteByUserId(Long userId);

    /** Atomic "claim": returns 1 only for the first caller, so two parallel refreshes can't both win. */
    @Modifying
    @Query("update RefreshToken t set t.used = true where t.id = :id and t.used = false")
    int markUsed(@Param("id") Long id);
}

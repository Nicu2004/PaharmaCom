package com.example.demo.service;

import com.example.demo.exception.ApiException;
import com.example.demo.model.RefreshToken;
import com.example.demo.repo.RefreshTokenRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;

@Service
public class RefreshTokenService {

    /** raw is the value that goes into the cookie; it is never stored. */
    public record Issued(String raw, Instant expiresAt, Long userId) {}

    private final SecureRandom random = new SecureRandom();
    private final RefreshTokenRepository repo;
    private final Duration idle;
    private final Duration absolute;

    public RefreshTokenService(RefreshTokenRepository repo,
                               @Value("${app.jwt.refresh-idle-minutes:10}") long idleMinutes,
                               @Value("${app.jwt.refresh-absolute-hours:12}") long absoluteHours) {
        this.repo = repo;
        this.idle = Duration.ofMinutes(idleMinutes);
        this.absolute = Duration.ofHours(absoluteHours);
    }

    /** Starts a new session (new family). */
    @Transactional
    public Issued start(Long userId) {
        repo.deleteByExpiresAtBefore(Instant.now()); // housekeeping
        return issue(userId, UUID.randomUUID().toString(), Instant.now().plus(absolute));
    }

    /**
     * Exchanges a valid refresh token for a new one. The old token becomes unusable.
     * If an already-used token shows up again, someone copied it, so the whole session is revoked.
     * noRollbackFor makes sure that revocation is actually committed.
     */
    @Transactional(noRollbackFor = ApiException.class)
    public Issued rotate(String raw) {
        RefreshToken t = find(raw);
        Instant now = Instant.now();

        if (t.isUsed() || now.isAfter(t.getExpiresAt()) || now.isAfter(t.getAbsoluteExpiresAt())) {
            repo.deleteByFamilyId(t.getFamilyId());
            throw invalid();
        }
        if (repo.markUsed(t.getId()) == 0) { // lost a race with a parallel refresh using the same token
            repo.deleteByFamilyId(t.getFamilyId());
            throw invalid();
        }
        return issue(t.getUserId(), t.getFamilyId(), t.getAbsoluteExpiresAt());
    }

    /** Logout: ends the whole session. Silent if the token is unknown. */
    @Transactional
    public void revoke(String raw) {
        if (raw == null || raw.isBlank()) return;
        repo.findByTokenHash(hash(raw)).ifPresent(t -> repo.deleteByFamilyId(t.getFamilyId()));
    }

    private RefreshToken find(String raw) {
        if (raw == null || raw.isBlank()) throw invalid();
        return repo.findByTokenHash(hash(raw)).orElseThrow(RefreshTokenService::invalid);
    }

    private Issued issue(Long userId, String familyId, Instant absoluteExpiry) {
        Instant now = Instant.now();
        Instant idleExpiry = now.plus(idle);
        Instant expires = idleExpiry.isBefore(absoluteExpiry) ? idleExpiry : absoluteExpiry;

        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        RefreshToken t = new RefreshToken();
        t.setTokenHash(hash(raw));
        t.setUserId(userId);
        t.setFamilyId(familyId);
        t.setExpiresAt(expires);
        t.setAbsoluteExpiresAt(absoluteExpiry);
        repo.save(t);
        return new Issued(raw, expires, userId);
    }

    private static String hash(String raw) {
        try {
            byte[] d = MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(d);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static ApiException invalid() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "Session expired. Please sign in again.");
    }
}

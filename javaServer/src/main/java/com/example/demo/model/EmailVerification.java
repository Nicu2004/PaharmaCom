package com.example.demo.model;

import jakarta.persistence.*;
import lombok.Getter;

import java.time.Instant;

/** One row per email: holds the hashed 4-digit code and its state. */
@Getter
@Entity
@Table(name = "email_verifications")
public class EmailVerification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "code_hash", nullable = false)
    private String codeHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "last_sent_at", nullable = false)
    private Instant lastSentAt;

    @Column(nullable = false)
    private int attempts;

    @Column(nullable = false)
    private boolean verified;

    @Column(name = "verified_at")
    private Instant verifiedAt;

    public void setEmail(String email) { this.email = email; }

    public void setCodeHash(String codeHash) { this.codeHash = codeHash; }

    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }

    public void setLastSentAt(Instant lastSentAt) { this.lastSentAt = lastSentAt; }

    public void setAttempts(int attempts) { this.attempts = attempts; }

    public void setVerified(boolean verified) { this.verified = verified; }

    public void setVerifiedAt(Instant verifiedAt) { this.verifiedAt = verifiedAt; }
}

package com.example.demo.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

/**
 * A pending code for a sensitive account change (password or email) of a logged-in user.
 * One row per user and purpose; a new request overwrites the old one.
 */
@Getter
@Setter
@Entity
@Table(name = "account_change_codes",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "purpose"}))
public class AccountChangeCode {

    public enum Purpose { PASSWORD, EMAIL }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Purpose purpose;

    /** Where the code was sent. For an email change this is the NEW address, so the code proves ownership of it. */
    @Column(name = "target_email", nullable = false)
    private String targetEmail;

    @Column(name = "code_hash", nullable = false)
    private String codeHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "last_sent_at", nullable = false)
    private Instant lastSentAt;

    @Column(nullable = false)
    private int attempts;
}

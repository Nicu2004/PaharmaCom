package com.example.demo.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

/** One row per issued refresh token. Only a SHA-256 hash is stored, never the token itself. */
@Getter
@Setter
@Entity
@Table(name = "refresh_tokens")
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 64)
    private String tokenHash;

    @Column(nullable = false)
    private Long userId;

    /** All tokens that descend from one login share a family, so a whole session can be revoked at once. */
    @Column(nullable = false, length = 36)
    private String familyId;

    /** Idle expiry: pushed forward on every rotation. */
    @Column(nullable = false)
    private Instant expiresAt;

    /** Hard limit for the whole session. */
    @Column(nullable = false)
    private Instant absoluteExpiresAt;

    @Column(nullable = false)
    private boolean used = false;
}

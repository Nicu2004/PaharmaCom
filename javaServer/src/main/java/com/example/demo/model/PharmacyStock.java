package com.example.demo.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

/**
 * How much of one product one pharmacy has. A missing row means "not carried here",
 * which is the whole point: not every pharmacy stocks everything.
 */
@Getter
@Setter
@Entity
@Table(name = "pharmacy_stock",
        uniqueConstraints = @UniqueConstraint(name = "uk_stock_pharmacy_medicine",
                columnNames = {"pharmacy_id", "medicine_id"}),
        indexes = @Index(name = "idx_stock_medicine", columnList = "medicine_id"))
public class PharmacyStock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "pharmacy_id", nullable = false)
    private Pharmacy pharmacy;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "medicine_id", nullable = false)
    private Medicine medicine;

    @Column(nullable = false)
    private int quantity;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();
}

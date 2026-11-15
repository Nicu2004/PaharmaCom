package com.example.demo.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * An over-the-counter product. "category" matches the otc_category values used by
 * symptom_triage.json, which is what links a symptom to the products that help with it.
 */
@Getter
@Setter
@Entity
@JsonIgnoreProperties(ignoreUnknown = true)
@Table(name = "medicine", indexes = @Index(name = "idx_medicine_category", columnList = "category"))
public class Medicine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @JsonIgnore // the JSON "id" is the slug below, not this surrogate key
    private Long id;

    /** Stable slug from medicines.json, e.g. "nurofen-forte-400". Used by the API instead of the row id. */
    @JsonProperty("id")
    @Column(nullable = false, unique = true, length = 80)
    private String code;

    @Column(nullable = false)
    private String name;

    @Column(name = "active_ingredient")
    private String activeIngredient;

    /** e.g. "analgesic_antipyretic" */
    @Column(nullable = false, length = 60)
    private String category;

    private String form;

    @Column(name = "requires_prescription", nullable = false)
    private boolean requiresPrescription = false;

    @Column(name = "approx_price_ron")
    private Double approxPriceRon;

    /** Products with a minimum age are never offered for a younger patient. */
    @Column(name = "min_age_years")
    private Integer minAgeYears;

    /** 0..1, how widely this product is stocked. Only used when seeding stock. */
    @Column(name = "commonality")
    private Double commonality;

    @Column(columnDefinition = "TEXT")
    private String warning;
}

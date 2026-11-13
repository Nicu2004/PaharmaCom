package com.example.demo.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Setter
@Getter
@Entity
@Table(name = "symptom_triage_config")
public class SymptomTriageConfig {

    // Getters and Setters
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonProperty("version")
    private String version;

    @Column(columnDefinition = "TEXT")
    @JsonProperty("disclaimer")
    private String disclaimer;

    @JsonProperty("emergency_number")
    private String emergencyNumber;

    @ElementCollection
    @CollectionTable(name = "global_escalation_rules", joinColumns = @JoinColumn(name = "config_id"))
    @Column(name = "rule", columnDefinition = "TEXT")
    @JsonProperty("global_escalation_rules")
    private List<String> globalEscalationRules;

    @OneToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "levels_id")
    @JsonProperty("levels")
    private Levels levels;

}
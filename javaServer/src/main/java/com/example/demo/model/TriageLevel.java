package com.example.demo.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Setter
@Getter
@Entity
@Table(name = "triage_level_details")
public class TriageLevel {

    // Getters and Setters
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonProperty("color")
    private String color;

    @JsonProperty("action")
    private String action;

    @JsonProperty("pharmacy_suggestion")
    private Boolean pharmacySuggestion;

    @JsonProperty("show_doctor_booking")
    private Boolean showDoctorBooking;

    @JsonProperty("ui_message_en")
    @Column(columnDefinition = "TEXT")
    private String uiMessageEn;

    @JsonProperty("ui_message_ro")
    @Column(columnDefinition = "TEXT")
    private String uiMessageRo;

    @JsonProperty("otc_rule")
    @Column(columnDefinition = "TEXT")
    private String otcRule;

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "triage_level_id")
    @JsonProperty("symptoms")
    private List<Symptom> symptoms;

}
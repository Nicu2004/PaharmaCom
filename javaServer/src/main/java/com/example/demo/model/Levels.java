package com.example.demo.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
@Entity
@Table(name = "triage_levels")
public class Levels {

    // Getters and Setters
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "red_level_id")
    @JsonProperty("red")
    private TriageLevel red;

    @OneToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "yellow_level_id")
    @JsonProperty("yellow")
    private TriageLevel yellow;

    @OneToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "green_level_id")
    @JsonProperty("green")
    private TriageLevel green;

}
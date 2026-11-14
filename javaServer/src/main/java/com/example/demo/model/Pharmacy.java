package com.example.demo.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
@Entity
@JsonIgnoreProperties(ignoreUnknown = true)
@Table(name = "pharmacy")
public class Pharmacy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // This field is not in the JSON, so we set a default value
    @Column(name = "city")
    private String city = "Timișoara";

    @JsonProperty("lat")
    @Column(name = "latitude")
    private Double latitude;

    @JsonProperty("lng")
    @Column(name = "longitude")
    private Double longitude;

    @JsonProperty("name")
    @Column(name = "pharmacy_name")
    private String pharmacyName;

    @JsonProperty("street")
    @Column(name = "street_name")
    private String streetName;

    @JsonProperty("status")
    @Column(name = "hour_interval")
    private String hourInterval;

    @Transient
    @JsonProperty("isOpen")
    private Boolean isOpen;

}

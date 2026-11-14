package com.example.demo.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.jspecify.annotations.Nullable;

@Setter
@Getter
@Entity
@Table(name = "users")
public class User {

    // Standard Getters and Setters
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String lastName; // Name

    @Column(nullable = false)
    private String firstName; // Forename

    @Column(nullable = false, unique = true)
    private String email;

    // Nullable because Google Auth users won't have a local password
    @Column(nullable = true)
    private String password;

    @Column(nullable = false)
    private boolean isGoogleConnected = false;

    // Note: Storing date of birth (LocalDate) is generally safer than storing 
    // a static 'age' integer so it updates automatically, but here is the age field.
    @Column(nullable = false)
    private Integer age;

    @Column(nullable = false)
    private String city;
}
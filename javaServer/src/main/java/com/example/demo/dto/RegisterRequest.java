package com.example.demo.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Mirrors the frontend's UserRegistrationPayload. */
public record RegisterRequest(
        @NotBlank @Size(max = 100) String lastName,
        @NotBlank @Size(max = 100) String firstName,
        @NotBlank @Email String email,
        @Size(min = 6, max = 72) String password, // BCrypt only uses the first 72 bytes
        @JsonProperty("isGoogleConnected") boolean isGoogleConnected,
        @Min(value = 18, message = "you must be 18 or older") int age,
        @NotBlank @Size(max = 100) String city) {}
package com.example.demo.dto;

/** The refresh token is NOT in here: it only travels in the HttpOnly cookie. */
public record LoginResponse(String accessToken, long expiresInSeconds, UserResponse user) {}

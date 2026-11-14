package com.example.demo.dto;

import com.example.demo.model.User;

/** What the API returns about a user. Never includes the password hash. */
public record UserResponse(Long id, String firstName, String lastName, String email, Integer age, String city) {

    public static UserResponse from(User u) {
        return new UserResponse(u.getId(), u.getFirstName(), u.getLastName(), u.getEmail(), u.getAge(), u.getCity());
    }
}
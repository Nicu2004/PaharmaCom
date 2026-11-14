package com.example.demo.controller;

import com.example.demo.dto.LoginRequest;
import com.example.demo.dto.RegisterRequest;
import com.example.demo.dto.UserResponse;
import com.example.demo.model.User;
import com.example.demo.service.AuthService;
import com.example.demo.service.VerificationService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    public record SendCodeRequest(@NotBlank @Email String email) {}

    public record VerifyCodeRequest(
            @NotBlank @Email String email,
            @NotBlank @Pattern(regexp = "\\d{4}", message = "must be 4 digits") String code) {}

    private final VerificationService verification;
    private final AuthService auth;

    public AuthController(VerificationService verification, AuthService auth) {
        this.verification = verification;
        this.auth = auth;
    }

    @PostMapping("/send-code")
    public Map<String, String> sendCode(@Valid @RequestBody SendCodeRequest req) {
        verification.sendCode(req.email());
        return Map.of("message", "Verification code sent.");
    }

    @PostMapping("/code-verify")
    public Map<String, String> verifyCode(@Valid @RequestBody VerifyCodeRequest req) {
        verification.verifyCode(req.email(), req.code());
        return Map.of("message", "Email verified.");
    }

    @PostMapping("/register")
    public ResponseEntity<UserResponse> registerUser(@Valid @RequestBody RegisterRequest req) {
        User user = auth.register(req);
        return ResponseEntity.status(HttpStatus.CREATED).body(UserResponse.from(user));
    }

    @PostMapping("/login")
    public UserResponse login(@Valid @RequestBody LoginRequest req) {
        return UserResponse.from(auth.login(req.email(), req.password()));
    }
}
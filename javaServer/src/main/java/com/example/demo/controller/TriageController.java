package com.example.demo.controller;

import com.example.demo.model.SymptomTriageConfig;
import com.example.demo.repo.SymptomTriageConfigRepository;
import com.example.demo.service.TokenService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController

@RequestMapping("/api")
public class TriageController {

    private final TokenService tokenService;
    private final SymptomTriageConfigRepository triageRepository;

    @Autowired // Added to explicitly tell Spring to inject dependencies
    public TriageController(TokenService tokenService, SymptomTriageConfigRepository triageRepository) {
        this.tokenService = tokenService;
        this.triageRepository = triageRepository;
    }

    /**
     * Generate a Token
     * Example: GET http://localhost:8080/api/auth/token?user=nicu
     */
    @GetMapping("/auth/token")
    public ResponseEntity<?> generateToken(@RequestParam(defaultValue = "default_user") String user) {
        String token = tokenService.generateToken(user);
        return ResponseEntity.ok(Map.of(
                "user", user,
                "token", token
        ));
    }

    /**
     * 2. Verify a Token directly
     * Example: GET http://localhost:8080/api/auth/verify?token=YOUR_TOKEN
     */
    @GetMapping("/auth/verify")
    public ResponseEntity<?> verifyToken(@RequestParam String token) {
        boolean isValid = tokenService.verifyToken(token);
        return ResponseEntity.status(isValid ? HttpStatus.OK : HttpStatus.UNAUTHORIZED)
                .body(Map.of("valid", isValid));
    }

    /**
     * 3. Protected GET Request (Accepts token via Header OR Query Parameter)
     * Example 1 (Header): curl -H "Authorization: Bearer <TOKEN>" http://localhost:8080/api/triage
     * Example 2 (Query Param): http://localhost:8080/api/triage?token=<TOKEN>
     */
    @GetMapping("/triage")
    public ResponseEntity<?> getTriageData(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(value = "token") String queryToken) {



            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Missing or invalid authorization header."));
            }

        String tokenToVerify = !authHeader.isBlank() ? authHeader : queryToken;

        // Strip "Bearer " if it's passed in the header
        if (tokenToVerify != null && tokenToVerify.startsWith("Bearer ")) {
            tokenToVerify = tokenToVerify.substring(7);
        }

        if (tokenToVerify == null || !tokenService.verifyToken(tokenToVerify)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid or missing verification token."));
        }

        List<SymptomTriageConfig> configs = triageRepository.findAll();
        return ResponseEntity.ok(configs);
    }
}

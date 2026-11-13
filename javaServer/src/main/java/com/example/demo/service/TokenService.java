package com.example.demo.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;

@Service
public class TokenService {

    // You can override this in application.properties using app.secret.key=...
    @Value("${app.secret.key:hackaton-secret-key-2026}")
    private String secretKey;

    private static final long EXPIRATION_TIME_MS = 3600_000; // 1 hour

    /**
     * Generates a signed token in the format: base64(username:expiresAt).base64(signature)
     */
    public String generateToken(String username) {
        long expiresAt = System.currentTimeMillis() + EXPIRATION_TIME_MS;
        String payload = username + ":" + expiresAt;
        String encodedPayload = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(payload.getBytes(StandardCharsets.UTF_8));

        String signature = sign(encodedPayload);
        return encodedPayload + "." + signature;
    }

    /**
     * Verifies the token's signature and checks if it is expired.
     */
    public boolean verifyToken(String token) {
        if (token == null || !token.contains(".")) {
            return false;
        }

        // Strip "Bearer " prefix if passed from an Authorization header
        if (token.startsWith("Bearer ")) {
            token = token.substring(7).trim();
        }

        String[] parts = token.split("\\.");
        if (parts.length != 2) {
            return false;
        }

        String encodedPayload = parts[0];
        String providedSignature = parts[1];

        // 1. Verify cryptographic signature in constant time
        String expectedSignature = sign(encodedPayload);
        if (!MessageDigest.isEqual(
                expectedSignature.getBytes(StandardCharsets.UTF_8),
                providedSignature.getBytes(StandardCharsets.UTF_8))) {
            return false;
        }

        // 2. Verify expiration timestamp
        try {
            String payload = new String(Base64.getUrlDecoder().decode(encodedPayload), StandardCharsets.UTF_8);
            String[] payloadParts = payload.split(":");
            long expiresAt = Long.parseLong(payloadParts[1]);
            return System.currentTimeMillis() < expiresAt;
        } catch (Exception e) {
            return false;
        }
    }

    private String sign(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec keySpec = new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(keySpec);
            byte[] rawHmac = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(rawHmac);
        } catch (Exception e) {
            throw new RuntimeException("Failed to sign token", e);
        }
    }
}
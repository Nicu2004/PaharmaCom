package com.example.demo.service;

import com.example.demo.exception.ApiException;
import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.text.ParseException;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;

/** Creates and verifies the short-lived access token (HS256). Carries only the user id and timestamps. */
@Service
public class JwtService {

    private static final String ISSUER = "pharmacom";

    private final byte[] secret;
    private final Duration accessTtl;

    public JwtService(@Value("${app.jwt.secret}") String secret,
                      @Value("${app.jwt.access-minutes:10}") long accessMinutes) {
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            throw new IllegalStateException("app.jwt.secret (JWT_SECRET) must be at least 32 characters long.");
        }
        this.secret = bytes;
        this.accessTtl = Duration.ofMinutes(accessMinutes);
    }

    public long accessTtlSeconds() {
        return accessTtl.toSeconds();
    }

    public String createAccessToken(Long userId) {
        Instant now = Instant.now();
        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .issuer(ISSUER)
                .subject(String.valueOf(userId))
                .issueTime(Date.from(now))
                .expirationTime(Date.from(now.plus(accessTtl)))
                .build();
        try {
            SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
            jwt.sign(new MACSigner(secret));
            return jwt.serialize();
        } catch (JOSEException e) {
            throw new IllegalStateException("Could not sign the access token.", e);
        }
    }

    /** Returns the user id, or throws 401 if the token is malformed, tampered with, expired or foreign. */
    public Long verifyAndGetUserId(String token) {
        try {
            SignedJWT jwt = SignedJWT.parse(token);
            if (!JWSAlgorithm.HS256.equals(jwt.getHeader().getAlgorithm()) || !jwt.verify(new MACVerifier(secret))) {
                throw unauthorized();
            }
            JWTClaimsSet claims = jwt.getJWTClaimsSet();
            Date exp = claims.getExpirationTime();
            if (exp == null || exp.before(new Date()) || !ISSUER.equals(claims.getIssuer())) {
                throw unauthorized();
            }
            return Long.valueOf(claims.getSubject());
        } catch (ParseException | JOSEException | NumberFormatException e) {
            throw unauthorized();
        }
    }

    private static ApiException unauthorized() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "Invalid or expired token.");
    }
}

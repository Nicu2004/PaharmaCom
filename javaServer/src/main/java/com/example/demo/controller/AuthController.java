package com.example.demo.controller;

import com.example.demo.dto.LoginRequest;
import com.example.demo.dto.LoginResponse;
import com.example.demo.dto.RegisterRequest;
import com.example.demo.dto.UserResponse;
import com.example.demo.exception.ApiException;
import com.example.demo.model.User;
import com.example.demo.service.AuthService;
import com.example.demo.service.RefreshTokenService;
import com.example.demo.service.SessionService;
import com.example.demo.service.VerificationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final String REFRESH_COOKIE = "refresh_token";

    public record SendCodeRequest(@NotBlank @Email String email) {}

    public record VerifyCodeRequest(
            @NotBlank @Email String email,
            @NotBlank @Pattern(regexp = "\\d{4}", message = "must be 4 digits") String code) {}

    private final VerificationService verification;
    private final AuthService auth;
    private final SessionService sessions;
    private final boolean cookieSecure;
    private final String cookieSameSite;

    public AuthController(VerificationService verification, AuthService auth, SessionService sessions,
                          @Value("${app.cookie.secure:false}") boolean cookieSecure,
                          @Value("${app.cookie.same-site:Strict}") String cookieSameSite) {
        this.verification = verification;
        this.auth = auth;
        this.sessions = sessions;
        this.cookieSecure = cookieSecure;
        this.cookieSameSite = cookieSameSite;
    }

    // ---------- registration helpers ----------

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

    // ---------- session ----------

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest req) {
        User user = auth.login(req.email(), req.password());
        return respond(sessions.start(user));
    }

    /** Reads the refresh cookie, rotates it, and returns a fresh access token. */
    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(HttpServletRequest request,
                                     @CookieValue(name = REFRESH_COOKIE, required = false) String raw) {
        requireAjaxHeader(request);
        try {
            return respond(sessions.refresh(raw));
        } catch (ApiException ex) {
            // a dead cookie is useless, so remove it from the browser too
            return ResponseEntity.status(ex.getStatus())
                    .header(HttpHeaders.SET_COOKIE, clearedCookie().toString())
                    .body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request,
                                       @CookieValue(name = REFRESH_COOKIE, required = false) String raw) {
        requireAjaxHeader(request);
        sessions.end(raw);
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, clearedCookie().toString())
                .build();
    }

    // ---------- helpers ----------

    private ResponseEntity<LoginResponse> respond(SessionService.Session s) {
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookie(s.refresh()).toString())
                .body(new LoginResponse(s.accessToken(), s.expiresInSeconds(), UserResponse.from(s.user())));
    }

    private ResponseCookie refreshCookie(RefreshTokenService.Issued refresh) {
        Duration maxAge = Duration.between(Instant.now(), refresh.expiresAt());
        return ResponseCookie.from(REFRESH_COOKIE, refresh.raw())
                .httpOnly(true)              // JavaScript can't read it, so XSS can't steal it
                .secure(cookieSecure)        // HTTPS only in production
                .sameSite(cookieSameSite)    // not sent on cross-site requests (CSRF defence)
                .path("/api/auth")           // only sent to the auth endpoints
                .maxAge(maxAge)
                .build();
    }

    private ResponseCookie clearedCookie() {
        return ResponseCookie.from(REFRESH_COOKIE, "")
                .httpOnly(true).secure(cookieSecure).sameSite(cookieSameSite)
                .path("/api/auth").maxAge(0).build();
    }

    /** A custom header can't be sent cross-origin without CORS approval: extra CSRF defence. */
    private static void requireAjaxHeader(HttpServletRequest request) {
        if (!"XMLHttpRequest".equals(request.getHeader("X-Requested-With"))) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Missing required header.");
        }
    }
}

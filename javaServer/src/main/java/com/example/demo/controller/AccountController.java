package com.example.demo.controller;

import com.example.demo.dto.LoginResponse;
import com.example.demo.dto.UserResponse;
import com.example.demo.service.AccountService;
import com.example.demo.service.RefreshTokenService;
import com.example.demo.service.SessionService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;

/**
 * Account settings of the logged-in user. Everything under /api/** except /api/auth/** goes through
 * AuthInterceptor, which puts the user id from the access token in the "userId" request attribute.
 */
@RestController
@RequestMapping("/api/account")
public class AccountController {

    private static final String REFRESH_COOKIE = "refresh_token"; // same cookie as AuthController

    public record PasswordCodeRequest(@NotBlank String currentPassword) {}

    public record ChangePasswordRequest(
            @NotBlank String currentPassword,
            @NotBlank @Size(max = 72) String newPassword,
            @NotBlank @Pattern(regexp = "\\d{6}", message = "must be 6 digits") String code) {}

    public record EmailCodeRequest(
            @NotBlank @Email @Size(max = 200) String newEmail,
            @NotBlank String currentPassword) {}

    public record ChangeEmailRequest(
            @NotBlank @Email @Size(max = 200) String newEmail,
            @NotBlank String currentPassword,
            @NotBlank @Pattern(regexp = "\\d{6}", message = "must be 6 digits") String code) {}

    private final AccountService account;
    private final boolean cookieSecure;
    private final String cookieSameSite;

    public AccountController(AccountService account,
                             @Value("${app.cookie.secure:false}") boolean cookieSecure,
                             @Value("${app.cookie.same-site:Strict}") String cookieSameSite) {
        this.account = account;
        this.cookieSecure = cookieSecure;
        this.cookieSameSite = cookieSameSite;
    }

    @GetMapping("/me")
    public UserResponse me(@RequestAttribute("userId") Long userId) {
        return UserResponse.from(account.me(userId));
    }

    // ---------- password ----------

    @PostMapping("/password/send-code")
    public Map<String, String> sendPasswordCode(@RequestAttribute("userId") Long userId,
                                                @Valid @RequestBody PasswordCodeRequest req) {
        System.out.println("Code is requested to change password");
        String sentTo = account.startPasswordChange(userId, req.currentPassword());
        return Map.of("message", "Cod trimis.", "sentTo", sentTo);
    }

    /** Returns a fresh session: all other sessions of this user were ended. */
    @PostMapping("/password")
    public ResponseEntity<LoginResponse> changePassword(@RequestAttribute("userId") Long userId,
                                                        @Valid @RequestBody ChangePasswordRequest req) {
        SessionService.Session s = account.changePassword(userId, req.currentPassword(), req.newPassword(), req.code());
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookie(s.refresh()).toString())
                .body(new LoginResponse(s.accessToken(), s.expiresInSeconds(), UserResponse.from(s.user())));
    }

    // ---------- email ----------

    @PostMapping("/email/send-code")
    public Map<String, String> sendEmailCode(@RequestAttribute("userId") Long userId,
                                             @Valid @RequestBody EmailCodeRequest req) {
        String sentTo = account.startEmailChange(userId, req.newEmail(), req.currentPassword());
        return Map.of("message", "Cod trimis.", "sentTo", sentTo);
    }

    @PostMapping("/email")
    public UserResponse changeEmail(@RequestAttribute("userId") Long userId,
                                    @Valid @RequestBody ChangeEmailRequest req) {
        return UserResponse.from(account.changeEmail(userId, req.newEmail(), req.currentPassword(), req.code()));
    }

    // ---------- helpers ----------

    private ResponseCookie refreshCookie(RefreshTokenService.Issued refresh) {
        Duration maxAge = Duration.between(Instant.now(), refresh.expiresAt());
        return ResponseCookie.from(REFRESH_COOKIE, refresh.raw())
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite(cookieSameSite)
                .path("/api/auth") // same scope as the cookie AuthController sets, so this replaces it
                .maxAge(maxAge)
                .build();
    }
}

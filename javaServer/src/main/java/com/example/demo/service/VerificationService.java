package com.example.demo.service;

import com.example.demo.exception.ApiException;
import com.example.demo.model.EmailVerification;
import com.example.demo.repo.EmailVerificationRepository;
import com.example.demo.repo.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;

@Slf4j
@Service
public class VerificationService {

    private static final Duration CODE_TTL = Duration.ofMinutes(10);
    private static final Duration RESEND_COOLDOWN = Duration.ofSeconds(60);
    private static final Duration VERIFIED_TTL = Duration.ofMinutes(30);
    private static final int MAX_ATTEMPTS = 5;

    private final SecureRandom random = new SecureRandom();
    private final EmailVerificationRepository verifications;
    private final UserRepository users;
    private final EmailService emailService;
    private final PasswordEncoder encoder;

    public VerificationService(EmailVerificationRepository verifications, UserRepository users,
                               EmailService emailService, PasswordEncoder encoder) {
        this.verifications = verifications;
        this.users = users;
        this.emailService = emailService;
        this.encoder = encoder;
    }

    public static String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    public void sendCode(String rawEmail) {
        String email = normalize(rawEmail);

        if (users.existsByEmail(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "An account with this email already exists.");
        }

        Instant now = Instant.now();
        EmailVerification v = verifications.findByEmail(email).orElseGet(EmailVerification::new);

        if (v.getLastSentAt() != null && now.isBefore(v.getLastSentAt().plus(RESEND_COOLDOWN))) {
            long wait = Duration.between(now, v.getLastSentAt().plus(RESEND_COOLDOWN)).toSeconds() + 1;
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,
                    "Please wait " + wait + " seconds before requesting a new code.");
        }

        String code = String.format("%04d", random.nextInt(10_000));

        v.setEmail(email);
        v.setCodeHash(encoder.encode(code));
        v.setExpiresAt(now.plus(CODE_TTL));
        v.setLastSentAt(now);
        v.setAttempts(0);
        v.setVerified(false);
        v.setVerifiedAt(null);
        verifications.save(v);

        try {
            emailService.sendVerificationCode(email, code);
        } catch (MailException ex) {
            log.error("Failed to send verification email to {}", email, ex);
            verifications.delete(v); // so the user isn't stuck in the resend cooldown
            throw new ApiException(HttpStatus.BAD_GATEWAY, "We couldn't send the email. Try again later.");
        }
    }

    public void verifyCode(String rawEmail, String code) {
        String email = normalize(rawEmail);

        EmailVerification v = verifications.findByEmail(email)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "No code was requested for this email."));

        if (v.isVerified()) return; // idempotent

        if (Instant.now().isAfter(v.getExpiresAt())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "The code has expired. Request a new one.");
        }
        if (v.getAttempts() >= MAX_ATTEMPTS) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Too many attempts. Request a new code.");
        }

        v.setAttempts(v.getAttempts() + 1);

        if (!encoder.matches(code, v.getCodeHash())) {
            verifications.save(v);
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid verification code.");
        }

        v.setVerified(true);
        v.setVerifiedAt(Instant.now());
        verifications.save(v);
    }

    /** Called by registration: the email must have been verified recently. The row is deleted afterwards. */
    public void consumeVerifiedEmail(String rawEmail) {
        String email = normalize(rawEmail);

        EmailVerification v = verifications.findByEmail(email)
                .filter(EmailVerification::isVerified)
                .filter(x -> x.getVerifiedAt() != null
                        && Instant.now().isBefore(x.getVerifiedAt().plus(VERIFIED_TTL)))
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST,
                        "Email not verified. Please verify your email first."));

        verifications.delete(v);
    }
}

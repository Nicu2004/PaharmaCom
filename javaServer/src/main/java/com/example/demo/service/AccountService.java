package com.example.demo.service;

import com.example.demo.exception.ApiException;
import com.example.demo.model.AccountChangeCode;
import com.example.demo.model.AccountChangeCode.Purpose;
import com.example.demo.model.User;
import com.example.demo.repo.AccountChangeCodeRepository;
import com.example.demo.repo.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Changing the password or the email of a logged-in user. Both need:
 *   1. the current password, and
 *   2. a 6-digit code sent by email (to the account's address for a password change,
 *      to the NEW address for an email change).
 *
 * Wrong current password answers 400, never 401: the frontend treats 401 as "access token expired".
 * The methods that check a code use noRollbackFor so the wrong-attempt counter is really saved.
 */
@Service
public class AccountService {

    private static final Logger log = LoggerFactory.getLogger(AccountService.class);

    private static final Duration CODE_TTL = Duration.ofMinutes(10);
    private static final Duration RESEND_COOLDOWN = Duration.ofSeconds(60);
    private static final int MAX_CODE_ATTEMPTS = 5;

    private static final int MIN_PASSWORD_LENGTH = 6; // same rule as registration
    private static final int MAX_PASSWORD_BYTES = 72; // BCrypt only reads the first 72 bytes

    private static final int MAX_PASSWORD_FAILURES = 5;
    private static final Duration PASSWORD_FAILURE_WINDOW = Duration.ofMinutes(15);

    private final SecureRandom random = new SecureRandom();
    private final Map<Long, Deque<Instant>> passwordFailures = new ConcurrentHashMap<>();

    private final UserRepository users;
    private final AccountChangeCodeRepository codes;
    private final PasswordEncoder encoder;
    private final EmailService emailService;
    private final RefreshTokenService refreshTokens;
    private final SessionService sessions;

    public AccountService(UserRepository users, AccountChangeCodeRepository codes, PasswordEncoder encoder,
                          EmailService emailService, RefreshTokenService refreshTokens, SessionService sessions) {
        this.users = users;
        this.codes = codes;
        this.encoder = encoder;
        this.emailService = emailService;
        this.refreshTokens = refreshTokens;
        this.sessions = sessions;
    }

    public User me(Long userId) {
        return load(userId);
    }

    // ------------------------------------------------------------------ password

    /** Step 1: the current password is checked, then a code is emailed to the account's address. */
    @Transactional
    public String startPasswordChange(Long userId, String currentPassword) {
        User user = load(userId);
        checkCurrentPassword(user, currentPassword);
        issueCode(user, Purpose.PASSWORD, user.getEmail(), "schimbarea parolei");
        return mask(user.getEmail());
    }

    /**
     * Step 2: current password + code + new password. Every other session of the user is ended
     * (another device may be the reason for the change), and a fresh session is started for this one.
     */
    @Transactional(noRollbackFor = ApiException.class)
    public SessionService.Session changePassword(Long userId, String currentPassword, String newPassword, String code) {
        User user = load(userId);
        checkCurrentPassword(user, currentPassword);
        validateNewPassword(newPassword, currentPassword);
        consumeCode(user, Purpose.PASSWORD, user.getEmail(), code);

        user.setPassword(encoder.encode(newPassword));
        users.save(user);

        refreshTokens.revokeAllForUser(userId);
        return sessions.start(user);
    }

    // ------------------------------------------------------------------ email

    /** Step 1: the current password is checked, then a code is emailed to the NEW address. */
    @Transactional
    public String startEmailChange(Long userId, String rawNewEmail, String currentPassword) {
        User user = load(userId);
        checkCurrentPassword(user, currentPassword);
        String newEmail = checkNewEmail(user, rawNewEmail);
        issueCode(user, Purpose.EMAIL, newEmail, "schimbarea adresei de email");
        return mask(newEmail);
    }

    /** Step 2: current password + code received on the new address. */
    @Transactional(noRollbackFor = ApiException.class)
    public User changeEmail(Long userId, String rawNewEmail, String currentPassword, String code) {
        User user = load(userId);
        checkCurrentPassword(user, currentPassword);
        String newEmail = checkNewEmail(user, rawNewEmail);
        consumeCode(user, Purpose.EMAIL, newEmail, code);

        String oldEmail = user.getEmail();
        user.setEmail(newEmail);
        try {
            users.saveAndFlush(user);
        } catch (DataIntegrityViolationException ex) {
            throw new ApiException(HttpStatus.CONFLICT, "Există deja un cont cu această adresă de email.");
        }

        try {
            emailService.sendEmailChangedNotice(oldEmail, newEmail);
        } catch (MailException ex) {
            log.warn("Could not notify the old address about the email change", ex); // the change itself succeeded
        }
        return user;
    }

    // ------------------------------------------------------------------ helpers

    private User load(Long userId) {
        return users.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Sesiune expirată. Autentifică-te din nou."));
    }

    private String checkNewEmail(User user, String rawNewEmail) {
        String newEmail = VerificationService.normalize(rawNewEmail);
        if (newEmail.equals(user.getEmail())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Aceasta este deja adresa ta de email.");
        }
        if (users.existsByEmail(newEmail)) {
            throw new ApiException(HttpStatus.CONFLICT, "Există deja un cont cu această adresă de email.");
        }
        return newEmail;
    }

    private void validateNewPassword(String newPassword, String currentPassword) {
        if (newPassword == null || newPassword.length() < MIN_PASSWORD_LENGTH) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Parola nouă trebuie să aibă cel puțin " + MIN_PASSWORD_LENGTH + " caractere.");
        }
        if (newPassword.getBytes(StandardCharsets.UTF_8).length > MAX_PASSWORD_BYTES) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Parola nouă este prea lungă.");
        }
        if (newPassword.equals(currentPassword)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Parola nouă trebuie să fie diferită de cea curentă.");
        }
    }

    /** Verifies the current password, with a limit on wrong guesses per user. */
    private void checkCurrentPassword(User user, String rawPassword) {
        if (user.getPassword() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Contul tău folosește autentificarea cu Google și nu are o parolă locală.");
        }

        Deque<Instant> failures = passwordFailures.computeIfAbsent(user.getId(), k -> new ArrayDeque<>());
        synchronized (failures) {
            Instant cutoff = Instant.now().minus(PASSWORD_FAILURE_WINDOW);
            while (!failures.isEmpty() && failures.peekFirst().isBefore(cutoff)) failures.pollFirst();

            if (failures.size() >= MAX_PASSWORD_FAILURES) {
                throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,
                        "Prea multe încercări cu parola greșită. Încearcă din nou peste câteva minute.");
            }
            if (rawPassword == null || !encoder.matches(rawPassword, user.getPassword())) {
                failures.addLast(Instant.now());
                throw new ApiException(HttpStatus.BAD_REQUEST, "Parola curentă este greșită.");
            }
            failures.clear();
        }
    }

    private void issueCode(User user, Purpose purpose, String targetEmail, String purposeText) {
        Instant now = Instant.now();
        AccountChangeCode c = codes.findByUserIdAndPurpose(user.getId(), purpose).orElseGet(AccountChangeCode::new);

        if (c.getLastSentAt() != null && now.isBefore(c.getLastSentAt().plus(RESEND_COOLDOWN))) {
            long wait = Duration.between(now, c.getLastSentAt().plus(RESEND_COOLDOWN)).toSeconds() + 1;
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,
                    "Așteaptă " + wait + " secunde înainte să ceri un cod nou.");
        }

        String code = String.format("%06d", random.nextInt(1_000_000));

        c.setUserId(user.getId());
        c.setPurpose(purpose);
        c.setTargetEmail(targetEmail);
        c.setCodeHash(encoder.encode(code));
        c.setExpiresAt(now.plus(CODE_TTL));
        c.setLastSentAt(now);
        c.setAttempts(0);
        codes.save(c);

        try {
            emailService.sendAccountCode(targetEmail, code, purposeText);
        } catch (MailException ex) {
            log.error("Failed to send account code to {}", targetEmail, ex);
            // thrown from a normal @Transactional method, so the saved code is rolled back and no cooldown applies
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Nu am putut trimite emailul. Încearcă din nou mai târziu.");
        }
    }

    private void consumeCode(User user, Purpose purpose, String targetEmail, String code) {
        AccountChangeCode c = codes.findByUserIdAndPurpose(user.getId(), purpose)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Nu ai cerut niciun cod. Cere unul nou."));

        if (!c.getTargetEmail().equals(targetEmail)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Codul a fost cerut pentru altă adresă. Cere un cod nou.");
        }
        if (Instant.now().isAfter(c.getExpiresAt())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Codul a expirat. Cere unul nou.");
        }
        if (c.getAttempts() >= MAX_CODE_ATTEMPTS) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Prea multe încercări. Cere un cod nou.");
        }

        c.setAttempts(c.getAttempts() + 1);
        if (code == null || !encoder.matches(code, c.getCodeHash())) {
            codes.save(c);
            throw new ApiException(HttpStatus.BAD_REQUEST, "Cod invalid.");
        }
        codes.delete(c); // single use
    }

    /** "nicu@gmail.com" -> "n***@gmail.com" */
    static String mask(String email) {
        int at = email.indexOf('@');
        if (at <= 1) return "***" + email.substring(Math.max(at, 0));
        return email.charAt(0) + "***" + email.substring(at);
    }
}

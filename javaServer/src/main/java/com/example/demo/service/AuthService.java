package com.example.demo.service;

import com.example.demo.dto.RegisterRequest;
import com.example.demo.exception.ApiException;
import com.example.demo.model.User;
import com.example.demo.repo.UserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final VerificationService verification;
    private final String dummyHash; // used when the email is unknown, so timing doesn't reveal it

    public AuthService(UserRepository users, PasswordEncoder encoder, VerificationService verification) {
        this.users = users;
        this.encoder = encoder;
        this.verification = verification;
        this.dummyHash = encoder.encode("not-a-real-password");
    }

    @Transactional
    public User register(RegisterRequest req) {
        // A client-supplied flag can't prove a Google identity; that needs server-side OAuth.
        if (req.isGoogleConnected()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Google sign-up must go through /api/auth/google.");
        }
        if (req.password() == null || req.password().length() < 6) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Password must be at least 6 characters.");
        }

        String email = VerificationService.normalize(req.email());
        if (users.existsByEmail(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "An account with this email already exists.");
        }

        verification.consumeVerifiedEmail(email); // the email must have passed the code check

        User user = new User();
        user.setEmail(email);
        user.setFirstName(req.firstName().trim());
        user.setLastName(req.lastName().trim());
        user.setAge(req.age());
        user.setCity(req.city().trim());
        user.setGoogleConnected(false);
        user.setPassword(encoder.encode(req.password())); // BCrypt hash, salt included

        try {
            return users.save(user);
        } catch (DataIntegrityViolationException ex) {
            throw new ApiException(HttpStatus.CONFLICT, "An account with this email already exists.");
        }
    }

    public User login(String rawEmail, String password) {
        String email = VerificationService.normalize(rawEmail);
        User user = users.findByEmail(email).orElse(null);

        String hash = (user != null && user.getPassword() != null) ? user.getPassword() : dummyHash;
        boolean ok = encoder.matches(password, hash);

        if (user == null || user.getPassword() == null || !ok) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password.");
        }
        return user;
    }
}
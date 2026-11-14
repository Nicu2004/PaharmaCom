package com.example.demo.service;

import com.example.demo.exception.ApiException;
import com.example.demo.model.User;
import com.example.demo.repo.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class SessionService {

    public record Session(String accessToken, long expiresInSeconds, RefreshTokenService.Issued refresh, User user) {}

    private final JwtService jwt;
    private final RefreshTokenService refreshTokens;
    private final UserRepository users;

    public SessionService(JwtService jwt, RefreshTokenService refreshTokens, UserRepository users) {
        this.jwt = jwt;
        this.refreshTokens = refreshTokens;
        this.users = users;
    }

    public Session start(User user) {
        return build(user, refreshTokens.start(user.getId()));
    }

    public Session refresh(String rawRefreshToken) {
        RefreshTokenService.Issued next = refreshTokens.rotate(rawRefreshToken);
        User user = users.findById(next.userId())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Session expired. Please sign in again."));
        return build(user, next);
    }

    public void end(String rawRefreshToken) {
        refreshTokens.revoke(rawRefreshToken);
    }

    private Session build(User user, RefreshTokenService.Issued refresh) {
        return new Session(jwt.createAccessToken(user.getId()), jwt.accessTtlSeconds(), refresh, user);
    }
}

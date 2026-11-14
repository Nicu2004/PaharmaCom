package com.example.demo.controller;

import com.example.demo.dto.PharmacyResponse;
import com.example.demo.exception.ApiException;
import com.example.demo.repo.PharmacyRepository;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Needs a valid access token: AuthInterceptor protects every /api/** route except /api/auth/**. */
@RestController
@RequestMapping("/api/pharmacies")
public class PharmacyController {

    private final PharmacyRepository pharmacies;

    public PharmacyController(PharmacyRepository pharmacies) {
        this.pharmacies = pharmacies;
    }

    /** All pharmacies of a city. The distance/radius filtering happens in the browser. */
    @GetMapping
    public List<PharmacyResponse> byCity(@RequestParam String city) {
        if (city.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "City is required.");
        }
        return pharmacies.findByCityIgnoreCaseOrderByPharmacyNameAsc(city.trim())
                .stream()
                .map(PharmacyResponse::from)
                .toList();
    }
}

package com.example.demo.dto;

import com.example.demo.model.Pharmacy;

public record PharmacyResponse(Long id, String name, String address, String city, double latitude, double longitude) {

    public static PharmacyResponse from(Pharmacy p) {
        return new PharmacyResponse(p.getId(), p.getPharmacyName(), p.getStreetName(), p.getCity(),
                p.getLatitude(), p.getLongitude());
    }
}

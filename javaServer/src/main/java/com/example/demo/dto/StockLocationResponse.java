package com.example.demo.dto;

/** One pharmacy that has the product, with how far away it is and how many units are left. */
public record StockLocationResponse(
        Long pharmacyId, String pharmacyName, String street, String hourInterval,
        double latitude, double longitude, Double distanceKm, int quantity, boolean lowStock) {
}

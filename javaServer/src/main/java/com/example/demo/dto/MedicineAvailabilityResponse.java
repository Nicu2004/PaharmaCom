package com.example.demo.dto;

import java.util.List;

/** A product plus the nearby pharmacies that actually carry it. */
public record MedicineAvailabilityResponse(
        MedicineResponse medicine,
        int pharmacyCount,
        List<StockLocationResponse> pharmacies) {
}

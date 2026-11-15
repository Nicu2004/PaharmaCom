package com.example.demo.dto;

import com.example.demo.model.Medicine;

public record MedicineResponse(
        String code, String name, String activeIngredient, String category, String form,
        Double approxPriceRon, Integer minAgeYears, boolean requiresPrescription, String warning) {

    public static MedicineResponse from(Medicine m) {
        return new MedicineResponse(m.getCode(), m.getName(), m.getActiveIngredient(), m.getCategory(),
                m.getForm(), m.getApproxPriceRon(), m.getMinAgeYears(), m.isRequiresPrescription(), m.getWarning());
    }
}

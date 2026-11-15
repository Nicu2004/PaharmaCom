package com.example.demo.service;

import com.example.demo.dto.MedicineAvailabilityResponse;
import com.example.demo.dto.MedicineResponse;
import com.example.demo.dto.StockLocationResponse;
import com.example.demo.model.Medicine;
import com.example.demo.model.Pharmacy;
import com.example.demo.model.PharmacyStock;
import com.example.demo.repo.MedicineRepository;
import com.example.demo.repo.PharmacyStockRepository;
import com.example.demo.repo.SymptomRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/** Finds which nearby pharmacies actually carry the products that match a symptom. */
@Service
public class MedicineService {

    private static final int LOW_STOCK = 3;
    private static final double EARTH_RADIUS_KM = 6371.0;

    private final MedicineRepository medicines;
    private final PharmacyStockRepository stock;
    private final SymptomRepository symptoms;

    public MedicineService(MedicineRepository medicines, PharmacyStockRepository stock, SymptomRepository symptoms) {
        this.medicines = medicines;
        this.stock = stock;
        this.symptoms = symptoms;
    }

    // ------------------------------------------------------------------ lookups

    public List<Medicine> byCategory(String category) {
        return medicines.findByCategoryIgnoreCaseOrderByNameAsc(category);
    }

    public List<Medicine> byIngredient(String ingredient) {
        return medicines.findByActiveIngredientContainingIgnoreCaseOrderByNameAsc(ingredient);
    }

    /** "G01" -> that symptom's otc_category -> the products in it. Empty for yellow/red symptoms. */
    public List<Medicine> bySymptom(String symptomId) {
        return symptoms.findBySymptomIdIgnoreCase(symptomId)
                .map(com.example.demo.model.Symptom::getOtcCategory)
                .filter(c -> c != null && !c.isBlank())
                .map(this::byCategory)
                .orElse(List.of());
    }

    /** Products a patient of this age may use. A null age filters nothing. */
    public List<Medicine> forAge(List<Medicine> list, Integer age) {
        if (age == null) return list;
        return list.stream()
                .filter(m -> m.getMinAgeYears() == null || m.getMinAgeYears() <= age)
                .toList();
    }

    // ------------------------------------------------------------------ availability

    /**
     * For each product, the nearby pharmacies that have it, nearest first.
     * With no position, falls back to the city and returns no distances.
     */
    @Transactional(readOnly = true)
    public List<MedicineAvailabilityResponse> availability(List<Medicine> wanted, Double lat, Double lng,
                                                           double radiusKm, String city, int limitPerMedicine) {
        if (wanted.isEmpty()) return List.of();

        List<Long> ids = wanted.stream().map(Medicine::getId).toList();
        List<PharmacyStock> rows = (lat != null && lng != null)
                ? stock.findInBox(ids, lat - latDelta(radiusKm), lat + latDelta(radiusKm),
                                  lng - lngDelta(radiusKm, lat), lng + lngDelta(radiusKm, lat))
                : stock.findByCity(ids, city == null || city.isBlank() ? "Timișoara" : city);

        Map<Long, List<PharmacyStock>> byMedicine = rows.stream()
                .collect(Collectors.groupingBy(r -> r.getMedicine().getId()));

        return wanted.stream().map(medicine -> {
            List<StockLocationResponse> places = byMedicine.getOrDefault(medicine.getId(), List.of()).stream()
                    .map(row -> toLocation(row, lat, lng))
                    // the box is a square: drop the corners that are outside the real circle
                    .filter(loc -> loc.distanceKm() == null || loc.distanceKm() <= radiusKm)
                    .sorted(Comparator.comparing(loc -> loc.distanceKm() == null ? Double.MAX_VALUE : loc.distanceKm()))
                    .toList();

            List<StockLocationResponse> shown = places.size() > limitPerMedicine
                    ? places.subList(0, limitPerMedicine) : places;
            return new MedicineAvailabilityResponse(MedicineResponse.from(medicine), places.size(), shown);
        })
        // products nobody nearby carries go last, not away: the user still sees the name
        .sorted(Comparator.comparingInt((MedicineAvailabilityResponse a) -> a.pharmacyCount() == 0 ? 1 : 0))
        .toList();
    }

    private StockLocationResponse toLocation(PharmacyStock row, Double lat, Double lng) {
        Pharmacy p = row.getPharmacy();
        Double distance = (lat != null && lng != null && p.getLatitude() != null && p.getLongitude() != null)
                ? round(distanceKm(lat, lng, p.getLatitude(), p.getLongitude()))
                : null;
        return new StockLocationResponse(p.getId(), p.getPharmacyName(), p.getStreetName(), p.getHourInterval(),
                p.getLatitude() == null ? 0 : p.getLatitude(), p.getLongitude() == null ? 0 : p.getLongitude(),
                distance, row.getQuantity(), row.getQuantity() <= LOW_STOCK);
    }

    // ------------------------------------------------------------------ geometry

    private static double latDelta(double radiusKm) {
        return radiusKm / 111.0;
    }

    private static double lngDelta(double radiusKm, double lat) {
        double shrink = Math.max(Math.cos(Math.toRadians(lat)), 0.01);
        return radiusKm / (111.0 * shrink);
    }

    static double distanceKm(double lat1, double lng1, double lat2, double lng2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    private static double round(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}

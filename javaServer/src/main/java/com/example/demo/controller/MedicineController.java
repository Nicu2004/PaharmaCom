package com.example.demo.controller;

import com.example.demo.dto.MedicineAvailabilityResponse;
import com.example.demo.dto.MedicineResponse;
import com.example.demo.exception.ApiException;
import com.example.demo.model.Medicine;
import com.example.demo.repo.MedicineRepository;
import com.example.demo.service.MedicineService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Needs a valid access token: AuthInterceptor protects every /api/** route except /api/auth/**. */
@RestController
@RequestMapping("/api/medicines")
public class MedicineController {

    private static final double MAX_RADIUS_KM = 25.0;
    private static final int MAX_PHARMACIES = 20;

    private final MedicineRepository medicines;
    private final MedicineService service;

    public MedicineController(MedicineRepository medicines, MedicineService service) {
        this.medicines = medicines;
        this.service = service;
    }

    /** Browse the catalogue: /api/medicines?category=antacid or ?q=nurofen */
    @GetMapping
    public List<MedicineResponse> list(@RequestParam(required = false) String category,
                                       @RequestParam(required = false) String ingredient,
                                       @RequestParam(required = false) String q) {
        List<Medicine> found;
        if (category != null && !category.isBlank()) {
            found = service.byCategory(category.trim());
        } else if (ingredient != null && !ingredient.isBlank()) {
            found = service.byIngredient(ingredient.trim());
        } else if (q != null && !q.isBlank()) {
            found = medicines.search(q.trim());
        } else {
            found = medicines.findAll(org.springframework.data.domain.Sort.by("name"));
        }
        return found.stream().map(MedicineResponse::from).toList();
    }

    @GetMapping("/categories")
    public List<String> categories() {
        return medicines.findAllCategories();
    }

    /**
     * The endpoint the app actually uses after a green triage.
     * Give it one of: symptomId (e.g. G01), category, or ingredient (what the AI suggested).
     * Plus the user's position, and it answers with the nearest pharmacies that really have it.
     */
    @GetMapping("/availability")
    public List<MedicineAvailabilityResponse> availability(
            @RequestParam(required = false) String symptomId,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String ingredient,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) Integer age,
            @RequestParam(defaultValue = "3") double radiusKm,
            @RequestParam(defaultValue = "5") int limit) {

        List<Medicine> wanted;
        if (symptomId != null && !symptomId.isBlank()) {
            wanted = service.bySymptom(symptomId.trim());
        } else if (category != null && !category.isBlank()) {
            wanted = service.byCategory(category.trim());
        } else if (ingredient != null && !ingredient.isBlank()) {
            wanted = service.byIngredient(ingredient.trim());
        } else {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Give one of: symptomId, category or ingredient.");
        }

        wanted = service.forAge(wanted, age);
        double radius = Math.min(Math.max(radiusKm, 0.2), MAX_RADIUS_KM);
        int perMedicine = Math.min(Math.max(limit, 1), MAX_PHARMACIES);
        return service.availability(wanted, lat, lng, radius, city, perMedicine);
    }

    /** Where can I find exactly this product? /api/medicines/nurofen-forte-400/pharmacies */
    @GetMapping("/{code}/pharmacies")
    public MedicineAvailabilityResponse pharmaciesFor(@PathVariable String code,
                                                      @RequestParam(required = false) Double lat,
                                                      @RequestParam(required = false) Double lng,
                                                      @RequestParam(required = false) String city,
                                                      @RequestParam(defaultValue = "5") double radiusKm,
                                                      @RequestParam(defaultValue = "20") int limit) {
        Medicine medicine = medicines.findByCode(code)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Medicine not found."));
        double radius = Math.min(Math.max(radiusKm, 0.2), MAX_RADIUS_KM);
        List<MedicineAvailabilityResponse> result =
                service.availability(List.of(medicine), lat, lng, radius, city, Math.min(limit, MAX_PHARMACIES));
        return result.isEmpty()
                ? new MedicineAvailabilityResponse(MedicineResponse.from(medicine), 0, List.of())
                : result.get(0);
    }

    /** Small helper so the UI can show "pentru simptomul X recomandăm categoria Y". */
    @GetMapping("/for-symptom/{symptomId}")
    public Map<String, Object> forSymptom(@PathVariable String symptomId) {
        List<Medicine> found = service.bySymptom(symptomId);
        return Map.of(
                "symptomId", symptomId,
                "category", found.isEmpty() ? "" : found.get(0).getCategory(),
                "medicines", found.stream().map(MedicineResponse::from).toList());
    }
}

package com.example.demo.service;

import com.example.demo.model.Pharmacy;
import com.example.demo.repo.PharmacyRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.List;

@Service
public class PharmacyDataSeeder {

    private final PharmacyRepository pharmacyRepository;
    private final ObjectMapper objectMapper;

    // Constructor Injection
    public PharmacyDataSeeder(PharmacyRepository pharmacyRepository, ObjectMapper objectMapper) {
        this.pharmacyRepository = pharmacyRepository;
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    public void seedDatabase() {
        // Only run the seeder if the table is currently empty
        if (pharmacyRepository.count() == 0) {
            try {
                // Read the JSON file from the resources folder
                InputStream inputStream = getClass().getResourceAsStream("/timisoara_pharmacies_live.json");

                // Parse the JSON array into a List of Pharmacy objects using Jackson
                List<Pharmacy> pharmacies = objectMapper.readValue(inputStream, new TypeReference<List<Pharmacy>>() {});

                // Ensure the city is explicitly set for every entry before saving
                pharmacies.forEach(pharmacy -> {
                    pharmacy.setId(null); // Tells Hibernate this is a brand-new row
                    pharmacy.setCity("Timișoara");
                });

                // Bulk save all pharmacies to the database
                pharmacyRepository.saveAll(pharmacies);

                System.out.println("Successfully seeded " + pharmacies.size() + " pharmacies into the database!");
            } catch (Exception e) {
                System.err.println("Failed to seed pharmacy database: " + e.getMessage());
            }
        } else {
            System.out.println("Pharmacy database is already populated. Skipping seeder.");
        }
    }
}
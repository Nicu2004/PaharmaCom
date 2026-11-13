package com.example.demo.controller;

import com.example.demo.model.SymptomTriageConfig;
import com.example.demo.repo.SymptomTriageConfigRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

@Service
public class SymptomTriageLoader implements CommandLineRunner {

    private final SymptomTriageConfigRepository repository;
    private final ObjectMapper objectMapper;

    public SymptomTriageLoader(SymptomTriageConfigRepository repository, ObjectMapper objectMapper) {
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    @Override
    public void run(String... args) throws Exception {
        // Check if data is already loaded to avoid duplicate inserts on every restart
        if (repository.count() > 0) {
            System.out.println("Triage configuration already exists in the database. Skipping import.");
            return;
        }

        try {
            // Assumes 'symptom_triage.json' is placed inside src/main/resources/
            ClassPathResource resource = new ClassPathResource("symptom_triage.json");

            // Parse JSON into your root Java class
            SymptomTriageConfig config = objectMapper.readValue(resource.getInputStream(), SymptomTriageConfig.class);

            // Save to MySQL database (Cascades will automatically save Levels, TriageLevels, and Symptoms)
            repository.save(config);

            System.out.println("Successfully parsed and saved symptom triage data into MySQL!");

        } catch (Exception e) {
            System.err.println("Failed to parse and load symptom triage JSON: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
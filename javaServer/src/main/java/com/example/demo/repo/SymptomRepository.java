package com.example.demo.repo;

import com.example.demo.model.Symptom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SymptomRepository extends JpaRepository<Symptom, Long> {
    /** symptomId is the string code from symptom_triage.json, e.g. "G01". */
    Optional<Symptom> findBySymptomIdIgnoreCase(String symptomId);
}

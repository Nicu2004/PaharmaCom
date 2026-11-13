package com.example.demo.repo;

import com.example.demo.model.SymptomTriageConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SymptomTriageConfigRepository extends JpaRepository<SymptomTriageConfig, Long> {
}
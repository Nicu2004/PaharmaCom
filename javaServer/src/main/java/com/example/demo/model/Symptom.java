package com.example.demo.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import java.util.List;

@Entity
@Table(name = "symptoms")
public class Symptom {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @JsonIgnore // Tells Jackson to ignore the database surrogate ID when parsing JSON
    private Long id;

    @JsonProperty("id")
    private String symptomId; // Maps the string ID like "R01", "Y01", "G01" from JSON

    @JsonProperty("name")
    private String name;

    @ElementCollection
    @CollectionTable(name = "symptom_keywords_en", joinColumns = @JoinColumn(name = "symptom_id"))
    @Column(name = "keyword", columnDefinition = "TEXT")
    @JsonProperty("keywords_en")
    private List<String> keywordsEn;

    @ElementCollection
    @CollectionTable(name = "symptom_keywords_ro", joinColumns = @JoinColumn(name = "symptom_id"))
    @Column(name = "keyword", columnDefinition = "TEXT")
    @JsonProperty("keywords_ro")
    private List<String> keywordsRo;

    @JsonProperty("note")
    @Column(columnDefinition = "TEXT")
    private String note;

    @JsonProperty("suggested_specialty")
    private String suggestedSpecialty;

    @JsonProperty("max_days")
    private Integer maxDays;

    @JsonProperty("otc_category")
    private String otcCategory;

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getSymptomId() { return symptomId; }
    public void setSymptomId(String symptomId) { this.symptomId = symptomId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public List<String> getKeywordsEn() { return keywordsEn; }
    public void setKeywordsEn(List<String> keywordsEn) { this.keywordsEn = keywordsEn; }

    public List<String> getKeywordsRo() { return keywordsRo; }
    public void setKeywordsRo(List<String> keywordsRo) { this.keywordsRo = keywordsRo; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public String getSuggestedSpecialty() { return suggestedSpecialty; }
    public void setSuggestedSpecialty(String suggestedSpecialty) { this.suggestedSpecialty = suggestedSpecialty; }

    public Integer getMaxDays() { return maxDays; }
    public void setMaxDays(Integer maxDays) { this.maxDays = maxDays; }

    public String getOtcCategory() { return otcCategory; }
    public void setOtcCategory(String otcCategory) { this.otcCategory = otcCategory; }
}
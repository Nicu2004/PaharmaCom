package com.example.demo.service;

import com.example.demo.model.Medicine;
import com.example.demo.model.Pharmacy;
import com.example.demo.model.PharmacyStock;
import com.example.demo.repo.MedicineRepository;
import com.example.demo.repo.PharmacyRepository;
import com.example.demo.repo.PharmacyStockRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * Loads medicines.json and gives every pharmacy a believable, STABLE stock list.
 *
 * The stock is pseudo-random but derived from (pharmacy id, medicine code), so it is
 * identical on every restart. A demo where the nearest pharmacy changes each time you
 * press F5 is worse than no demo at all.
 *
 * Runs as an ApplicationRunner so it is guaranteed to start after PharmacyDataSeeder's
 * @PostConstruct has filled the pharmacy table.
 */
@Service
@Order(100)
public class MedicineDataSeeder implements ApplicationRunner {

    private static final int BATCH = 500;

    private final MedicineRepository medicines;
    private final PharmacyRepository pharmacies;
    private final PharmacyStockRepository stock;
    private final ObjectMapper objectMapper;

    public MedicineDataSeeder(MedicineRepository medicines, PharmacyRepository pharmacies,
                              PharmacyStockRepository stock, ObjectMapper objectMapper) {
        this.medicines = medicines;
        this.pharmacies = pharmacies;
        this.stock = stock;
        this.objectMapper = objectMapper;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            seedMedicines();
            seedStock();
        } catch (Exception e) {
            System.err.println("Failed to seed medicines/stock: " + e.getMessage());
        }
    }

    private void seedMedicines() throws Exception {
        if (medicines.count() > 0) {
            System.out.println("Medicine catalogue already populated. Skipping.");
            return;
        }
        try (InputStream in = getClass().getResourceAsStream("/medicines.json")) {
            if (in == null) {
                System.err.println("medicines.json not found on the classpath.");
                return;
            }
            List<Medicine> list = objectMapper.readValue(in, new TypeReference<List<Medicine>>() {});
            list.forEach(m -> m.setId(null));
            medicines.saveAll(list);
            System.out.println("Seeded " + list.size() + " medicines.");
        }
    }

    private void seedStock() {
        if (stock.count() > 0) {
            System.out.println("Pharmacy stock already populated. Skipping.");
            return;
        }
        List<Pharmacy> allPharmacies = pharmacies.findAll();
        List<Medicine> allMedicines = medicines.findAll();
        if (allPharmacies.isEmpty() || allMedicines.isEmpty()) {
            System.err.println("No pharmacies or medicines to build stock from.");
            return;
        }

        List<PharmacyStock> buffer = new ArrayList<>(BATCH);
        int rows = 0;

        for (Pharmacy pharmacy : allPharmacies) {
            for (Medicine medicine : allMedicines) {
                // same inputs -> same result, on every machine and every restart
                long seed = pharmacy.getId() * 1_000_003L + medicine.getCode().hashCode();
                Random random = new Random(seed);

                double commonality = medicine.getCommonality() == null ? 0.7 : medicine.getCommonality();
                if (random.nextDouble() >= commonality) {
                    continue; // this pharmacy simply does not carry it
                }

                // one in six carries only a few units, so "ultimele bucăți" shows up in the UI
                int quantity = random.nextInt(6) == 0 ? 1 + random.nextInt(3) : 4 + random.nextInt(37);

                PharmacyStock row = new PharmacyStock();
                row.setPharmacy(pharmacy);
                row.setMedicine(medicine);
                row.setQuantity(quantity);
                row.setUpdatedAt(Instant.now());
                buffer.add(row);

                if (buffer.size() >= BATCH) {
                    stock.saveAll(buffer);
                    rows += buffer.size();
                    buffer.clear();
                }
            }
        }
        if (!buffer.isEmpty()) {
            stock.saveAll(buffer);
            rows += buffer.size();
        }
        int possible = allPharmacies.size() * allMedicines.size();
        System.out.printf("Seeded %d stock rows (%d pharmacies x %d medicines, %.0f%% carried).%n",
                rows, allPharmacies.size(), allMedicines.size(), 100.0 * rows / possible);
    }
}

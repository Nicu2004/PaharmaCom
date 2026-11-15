package com.example.demo.repo;

import com.example.demo.model.PharmacyStock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface PharmacyStockRepository extends JpaRepository<PharmacyStock, Long> {

    /**
     * Stock rows for the given products, pre-filtered by a latitude/longitude box.
     * The box is cheap in SQL; the exact haversine distance is then computed in Java.
     */
    @Query("""
           select s from PharmacyStock s
           join fetch s.pharmacy p
           join fetch s.medicine m
           where m.id in :medicineIds
             and s.quantity > 0
             and p.latitude between :minLat and :maxLat
             and p.longitude between :minLng and :maxLng
           """)
    List<PharmacyStock> findInBox(@Param("medicineIds") Collection<Long> medicineIds,
                                  @Param("minLat") double minLat, @Param("maxLat") double maxLat,
                                  @Param("minLng") double minLng, @Param("maxLng") double maxLng);

    /** Fallback when the browser gave us no position: everything in the user's city. */
    @Query("""
           select s from PharmacyStock s
           join fetch s.pharmacy p
           join fetch s.medicine m
           where m.id in :medicineIds
             and s.quantity > 0
             and lower(p.city) = lower(:city)
           """)
    List<PharmacyStock> findByCity(@Param("medicineIds") Collection<Long> medicineIds,
                                   @Param("city") String city);

    long countByMedicineId(Long medicineId);
}

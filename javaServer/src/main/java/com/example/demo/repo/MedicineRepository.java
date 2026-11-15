package com.example.demo.repo;

import com.example.demo.model.Medicine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface MedicineRepository extends JpaRepository<Medicine, Long> {

    Optional<Medicine> findByCode(String code);

    List<Medicine> findByCategoryIgnoreCaseOrderByNameAsc(String category);

    List<Medicine> findByCategoryInOrderByNameAsc(Collection<String> categories);

    /** Matches the active ingredient the AI suggested, e.g. "Ibuprofen" -> Nurofen, Ibuprofen Terapia. */
    List<Medicine> findByActiveIngredientContainingIgnoreCaseOrderByNameAsc(String ingredient);

    @Query("select m from Medicine m where lower(m.name) like lower(concat('%', :q, '%')) "
            + "or lower(m.activeIngredient) like lower(concat('%', :q, '%')) order by m.name")
    List<Medicine> search(String q);

    @Query("select distinct m.category from Medicine m order by m.category")
    List<String> findAllCategories();
}

package com.example.demo.repo;

import com.example.demo.model.AccountChangeCode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AccountChangeCodeRepository extends JpaRepository<AccountChangeCode, Long> {
    Optional<AccountChangeCode> findByUserIdAndPurpose(Long userId, AccountChangeCode.Purpose purpose);
}

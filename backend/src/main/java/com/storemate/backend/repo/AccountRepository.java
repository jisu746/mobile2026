// 계정 테이블 조회·저장 창구
package com.storemate.backend.repo;

import com.storemate.backend.domain.Account;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AccountRepository extends JpaRepository<Account, Long> {
    Optional<Account> findByUsername(String username);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select a from Account a where a.username=:username")
    Optional<Account> findLockedByUsername(@org.springframework.data.repository.query.Param("username") String username);

    boolean existsByUsername(String username);
}

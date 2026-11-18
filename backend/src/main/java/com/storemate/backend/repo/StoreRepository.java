// 매장 테이블 조회·저장 창구
package com.storemate.backend.repo;

import com.storemate.backend.domain.Store;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface StoreRepository extends JpaRepository<Store, Long> {
    Optional<Store> findByInviteCode(String inviteCode);

    boolean existsByInviteCode(String inviteCode);

    Optional<Store> findFirstByOrderByIdDesc();
}

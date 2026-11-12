package com.storemate.backend.repo;

import com.storemate.backend.domain.Store;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface StoreRepository extends JpaRepository<Store, Long> {
    Optional<Store> findByInviteCode(String inviteCode);

    boolean existsByInviteCode(String inviteCode);
}

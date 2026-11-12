package com.storemate.backend.repo;

import com.storemate.backend.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StoreMemberRepository extends JpaRepository<StoreMember, Long> {
    List<StoreMember> findByAccountOrderByIdAsc(Account account);

    Optional<StoreMember> findByAccountAndStore(Account account, Store store);

    List<StoreMember> findByStoreAndStatusOrderByIdAsc(Store store, MemberStatus status);
}

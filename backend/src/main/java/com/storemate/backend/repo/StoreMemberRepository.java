// 매장 소속 테이블 조회·저장 창구
package com.storemate.backend.repo;

import com.storemate.backend.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StoreMemberRepository extends JpaRepository<StoreMember, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select m from StoreMember m where m.id = :id")
    Optional<StoreMember> findLockedById(@org.springframework.data.repository.query.Param("id") Long id);
    List<StoreMember> findByAccountOrderByIdAsc(Account account);

    Optional<StoreMember> findByAccountAndStore(Account account, Store store);

    List<StoreMember> findByStoreAndStatusOrderByIdAsc(Store store, MemberStatus status);
}

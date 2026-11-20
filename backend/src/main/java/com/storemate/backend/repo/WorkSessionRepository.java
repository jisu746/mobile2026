// 근무 기록 테이블 조회·저장 창구
package com.storemate.backend.repo;

import com.storemate.backend.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface WorkSessionRepository extends JpaRepository<WorkSession, Long> {
    Optional<WorkSession> findFirstByAccountAndStoreAndClockOutIsNull(Account account, Store store);

    // 어느 매장이든 지금 근무 중인 기록 (다른 매장에 동시에 출근하지 못하게 막을 때)
    Optional<WorkSession> findFirstByAccountAndClockOutIsNull(Account account);

    List<WorkSession> findByStoreAndClockOutIsNullOrderByClockInAsc(Store store);

    List<WorkSession> findByAccountAndStoreAndClockInGreaterThanEqualAndClockInLessThanOrderByClockInAsc(
            Account account, Store store, LocalDateTime from, LocalDateTime to);
}

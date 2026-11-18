// 근무 기록 테이블 조회·저장 창구
package com.storemate.backend.repo;

import com.storemate.backend.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface WorkSessionRepository extends JpaRepository<WorkSession, Long> {
    Optional<WorkSession> findFirstByAccountAndStoreAndClockOutIsNull(Account account, Store store);

    List<WorkSession> findByStoreAndClockOutIsNullOrderByClockInAsc(Store store);

    List<WorkSession> findByAccountAndStoreAndClockInGreaterThanEqualAndClockInLessThanOrderByClockInAsc(
            Account account, Store store, LocalDateTime from, LocalDateTime to);
}

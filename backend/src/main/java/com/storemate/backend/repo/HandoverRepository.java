// 인수인계 메모 테이블 조회·저장 창구
package com.storemate.backend.repo;

import com.storemate.backend.domain.*;
import com.storemate.backend.domain.Store;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface HandoverRepository extends JpaRepository<Handover, Long> {
    List<Handover> findByStoreAndArchivedFalseAndUrgentTrueOrderByIdDesc(Store store);
    List<Handover> findByWorkSessionAndArchivedFalseOrderByIdDesc(WorkSession session);
    List<Handover> findByStoreAndAuthorAndWorkSessionIsNullAndArchivedFalseAndCreatedAtBetweenOrderByIdDesc(Store store,Account author,java.time.LocalDateTime from,java.time.LocalDateTime to);
    List<Handover> findTop20ByStoreOrderByIdDesc(Store store);
    List<Handover> findTop20ByStoreAndArchivedFalseOrderByIdDesc(Store store);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select h from Handover h where h.id=:id")
    java.util.Optional<Handover> findLockedById(@org.springframework.data.repository.query.Param("id") Long id);
}

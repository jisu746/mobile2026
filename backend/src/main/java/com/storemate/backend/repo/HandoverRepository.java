// 인수인계 메모 테이블 조회·저장 창구
package com.storemate.backend.repo;

import com.storemate.backend.domain.Handover;
import com.storemate.backend.domain.Store;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface HandoverRepository extends JpaRepository<Handover, Long> {
    List<Handover> findTop20ByStoreOrderByIdDesc(Store store);
}

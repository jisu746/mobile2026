// 재고 변동 이력 테이블 저장 창구
package com.storemate.backend.repo;

import com.storemate.backend.domain.StockMovement;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {
}

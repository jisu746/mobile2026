// 재고 변동 이력 테이블 저장 창구
package com.storemate.backend.repo;

import com.storemate.backend.domain.StockMovement;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {
 @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
 java.util.Optional<StockMovement> findByProductAndClientKey(com.storemate.backend.domain.Product product,String clientKey);
 @org.springframework.data.jpa.repository.Query("select m from StockMovement m join fetch m.product p join fetch m.account where p.store.id=:storeId and (:barcode is null or p.barcode=:barcode) and m.createdAt>=:from and m.createdAt<:to order by m.id desc")
 java.util.List<StockMovement> history(Long storeId,String barcode,java.time.LocalDateTime from,java.time.LocalDateTime to,org.springframework.data.domain.Pageable page);
}

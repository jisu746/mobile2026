// 알림 테이블 조회·저장 창구
package com.storemate.backend.repo;

import com.storemate.backend.domain.Notification;
import com.storemate.backend.domain.Role;
import com.storemate.backend.domain.Store;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByStoreAndAudienceAndCreatedAtAfterOrderByIdDesc(Store store, Role audience, LocalDateTime since);
    boolean existsByStoreAndKindAndTargetBarcodeAndCreatedAtGreaterThanEqual(Store store, String kind, String targetBarcode, LocalDateTime since);
}

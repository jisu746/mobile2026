// 알림 읽음 기록 테이블 조회·저장 창구
package com.storemate.backend.repo;

import com.storemate.backend.domain.NotificationRead;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface NotificationReadRepository extends JpaRepository<NotificationRead, Long> {
    List<NotificationRead> findByAccountIdAndNotificationIdIn(Long accountId, Collection<Long> notificationIds);
}

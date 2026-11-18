// 알림 읽음 기록 테이블 (어느 계정이 어느 알림을 읽었는지)
package com.storemate.backend.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "notification_reads", uniqueConstraints = @UniqueConstraint(columnNames = {"account_id", "notification_id"}))
public class NotificationRead {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "account_id", nullable = false)
    private Long accountId;

    @Column(name = "notification_id", nullable = false)
    private Long notificationId;

    protected NotificationRead() {
    }

    public NotificationRead(Long accountId, Long notificationId) {
        this.accountId = accountId;
        this.notificationId = notificationId;
    }

    public Long getNotificationId() { return notificationId; }
}

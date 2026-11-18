// 오늘 완료한 업무 표시 테이블 (업무 목록은 앱이 재고로 만들고, 서버는 완료 여부만 기억한다)
package com.storemate.backend.domain;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "task_done", uniqueConstraints = @UniqueConstraint(columnNames = {"store_id", "task_key", "day"}))
public class TaskDone {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Store store;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Account account;

    @Column(name = "task_key", nullable = false, length = 60)
    private String taskKey;

    @Column(nullable = false)
    private LocalDate day;

    protected TaskDone() {
    }

    public TaskDone(Store store, Account account, String taskKey, LocalDate day) {
        this.store = store;
        this.account = account;
        this.taskKey = taskKey;
        this.day = day;
    }

    public String getTaskKey() { return taskKey; }
}

// 출근~퇴근 한 건의 근무 기록 테이블 (퇴근 전에는 clockOut 이 비어 있다)
package com.storemate.backend.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "work_sessions")
public class WorkSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Account account;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Store store;

    @Column(nullable = false)
    private LocalDateTime clockIn = now();

    private LocalDateTime clockOut;

    protected WorkSession() {
    }

    public WorkSession(Account account, Store store) {
        this.account = account;
        this.store = store;
    }

    public Long getId() { return id; }
    public Account getAccount() { return account; }
    public LocalDateTime getClockIn() { return clockIn; }
    public LocalDateTime getClockOut() { return clockOut; }
    public void clockOut() { this.clockOut = now(); }

    // 초 단위까지만 쓴다 (앱의 Date 파싱이 소수점 아래 자릿수에 민감하다)
    private static LocalDateTime now() { return LocalDateTime.now().withNano(0); }
}

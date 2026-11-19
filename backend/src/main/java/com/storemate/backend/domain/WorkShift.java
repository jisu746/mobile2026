// 직원의 날짜별 근무 일정 테이블 (사장님이 정한다. 종료가 시작보다 이르면 다음 날 새벽까지)
package com.storemate.backend.domain;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "work_shifts", uniqueConstraints = @UniqueConstraint(columnNames = {"member_id", "day"}))
public class WorkShift {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private StoreMember member;

    @Column(nullable = false)
    private LocalDate day;

    // HH:mm
    @Column(nullable = false, length = 5)
    private String startTime;

    @Column(nullable = false, length = 5)
    private String endTime;

    protected WorkShift() {
    }

    public WorkShift(StoreMember member, LocalDate day, String startTime, String endTime) {
        this.member = member;
        this.day = day;
        this.startTime = startTime;
        this.endTime = endTime;
    }

    public LocalDate getDay() { return day; }
    public String getStartTime() { return startTime; }
    public String getEndTime() { return endTime; }
    public void set(String startTime, String endTime) {
        this.startTime = startTime;
        this.endTime = endTime;
    }
}

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
    @Lob private String breaksJson;
    private Long breakSeconds,breakRevision;
    private LocalDateTime lastBreakEnd;
    public String getBreaksJson(){return breaksJson;}public long getBreakSeconds(){return breakSeconds==null?0:breakSeconds;}public long getBreakRevision(){return breakRevision==null?0:breakRevision;}
    public void breaks(String json,long seconds,LocalDateTime last){breaksJson=json;breakSeconds=seconds;lastBreakEnd=last;breakRevision=getBreakRevision()+1;}
    @ManyToOne(fetch = FetchType.LAZY) private Account clockOutCorrectedBy;
    private LocalDateTime clockOutCorrectedAt;
    @Column(length = 300) private String clockOutCorrectionReason;

    private boolean missingAlertSent;
    public boolean isMissingAlertSent(){return missingAlertSent;}public void markMissingAlert(){missingAlertSent=true;}
    private Integer hourlyWage;
    @Column(length = 20) private String wageSource;
    @ManyToOne(fetch = FetchType.LAZY) private Account wageConfirmedBy;
    private LocalDateTime wageConfirmedAt;

    protected WorkSession() {
    }

    public WorkSession(Account account, Store store) {
        this.account = account;
        this.store = store;
    }

    public Long getId() { return id; }
    public Account getAccount() { return account; }
    public Store getStore() { return store; }
    public LocalDateTime getClockIn() { return clockIn; }
    public LocalDateTime getClockOut() { return clockOut; }
    public void clockOut() {
        if (clockOut != null) throw new IllegalStateException("이미 퇴근한 기록입니다");
        this.clockOut = now();
    }
    public Account getClockOutCorrectedBy() { return clockOutCorrectedBy; }
    public LocalDateTime getClockOutCorrectedAt() { return clockOutCorrectedAt; }
    public String getClockOutCorrectionReason() { return clockOutCorrectionReason; }
    public void correctMissingClockOut(LocalDateTime value, Account actor, String reason) {
        if (clockOut != null) throw new IllegalStateException("이미 퇴근한 기록입니다");
        if (value == null || !value.isAfter(clockIn) || value.isAfter(now()) || actor == null || reason == null || reason.isBlank() || reason.length() > 300)
            throw new IllegalArgumentException("퇴근 시각과 처리 사유를 확인해주세요");
        if(lastBreakEnd!=null&&lastBreakEnd.isAfter(value))throw new IllegalArgumentException("퇴근 시각 이후의 휴게 기록을 먼저 정정해주세요");
        clockOut = value.withNano(0);
        clockOutCorrectedBy = actor;
        clockOutCorrectedAt = now();
        clockOutCorrectionReason = reason.trim();
    }
    public Integer getHourlyWage() { return hourlyWage; }
    public void correctClosedClockOut(LocalDateTime value, Account actor, String reason) {
        if (clockOut == null || value == null || !value.isAfter(clockIn) || value.isAfter(now()) || actor == null || reason == null || reason.isBlank() || reason.length() > 300)
            throw new IllegalArgumentException("퇴근 시각과 정정 사유를 확인해주세요");
        if(lastBreakEnd!=null&&lastBreakEnd.isAfter(value))throw new IllegalArgumentException("퇴근 시각 이후의 휴게 기록을 먼저 정정해주세요");
        clockOut=value.withNano(0);clockOutCorrectedBy=actor;clockOutCorrectedAt=now();clockOutCorrectionReason=reason;
    }
    public String getWageSource() { return wageSource; }
    // 한 번 확정한 근무별 시급은 새 시급 예약·수정으로 바꾸지 않는다.
    public void assignWage(int amount, String source, Account actor) {
        if (hourlyWage != null) throw new IllegalStateException("이미 적용 시급이 확정된 근무입니다");
        hourlyWage = amount; wageSource = source; wageConfirmedBy = actor; wageConfirmedAt = now();
    }

    // 초 단위까지만 쓴다 (앱의 Date 파싱이 소수점 아래 자릿수에 민감하다)
    private static LocalDateTime now() { return LocalDateTime.now().withNano(0); }
}

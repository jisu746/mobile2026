package com.storemate.backend.domain;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "wage_rates", uniqueConstraints = @UniqueConstraint(columnNames = {"member_id", "effective_from"}))
public class WageRate {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) private StoreMember member;
    @Column(name = "effective_from", nullable = false) private LocalDate effectiveFrom;
    @Column(nullable = false) private int hourlyWage;
    @Column(nullable = false) private boolean defaultRate;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) private Account changedBy;
    private LocalDateTime changedAt;
    protected WageRate() {}
    public WageRate(StoreMember member, LocalDate date, int amount, boolean defaultRate, Account actor) {
        this.member = member; this.effectiveFrom = date; set(amount, defaultRate, actor);
    }
    public void set(int amount, boolean defaultRate, Account actor) {
        this.hourlyWage = amount; this.defaultRate = defaultRate; this.changedBy = actor;
        this.changedAt = LocalDateTime.now();
    }
    public LocalDate getEffectiveFrom() { return effectiveFrom; }
    public int getHourlyWage() { return hourlyWage; }
    public boolean isDefaultRate() { return defaultRate; }
}

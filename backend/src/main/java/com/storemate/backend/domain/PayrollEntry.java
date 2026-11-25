package com.storemate.backend.domain;
import jakarta.persistence.*;import java.time.*;
@Entity @Table(name="payroll_entries",uniqueConstraints=@UniqueConstraint(columnNames={"member_id","period","client_key"})) public class PayrollEntry {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) private StoreMember member;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) private Account actor;
 @Column(length=7,nullable=false) private String period;
 @Column(length=30,nullable=false) private String kind;
 @Column(length=200,nullable=false) private String reason;
 @Column(name="client_key",length=80,nullable=false) private String clientKey;
 @Column(length=64,nullable=false) private String fingerprint;
 public String getFingerprint(){return fingerprint;}
 public boolean isAutomatic(){return clientKey!=null&&clientKey.startsWith("statutory-");}
 private long amount;
 @Column(length=120) private String calculation;
 private LocalDateTime createdAt=LocalDateTime.now().withNano(0);
 private boolean cancelled;
 @Column(length=200) private String cancelReason;
 @ManyToOne(fetch=FetchType.LAZY) private Account cancelledBy;
 private LocalDateTime cancelledAt;
 protected PayrollEntry(){}public PayrollEntry(StoreMember member,Account actor,String period,String kind,String reason,long amount,String calculation,String clientKey,String fingerprint){this.clientKey=clientKey;this.fingerprint=fingerprint;this.member=member;this.actor=actor;this.period=period;this.kind=kind;this.reason=reason;this.amount=amount;this.calculation=calculation;}
 public Long getId(){return id;}public StoreMember getMember(){return member;}public String getPeriod(){return period;}public String getKind(){return kind;}public String getReason(){return reason;}public long getAmount(){return amount;}public String getCalculation(){return calculation;}public String getActorName(){return actor.getName();}public LocalDateTime getCreatedAt(){return createdAt;}public boolean isCancelled(){return cancelled;}public String getCancelReason(){return cancelReason;}
 public void cancel(Account actor,String reason){cancelled=true;cancelReason=reason;cancelledBy=actor;cancelledAt=LocalDateTime.now().withNano(0);}
}

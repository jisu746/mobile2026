package com.storemate.backend.domain;
import jakarta.persistence.*;import java.time.*;
@Entity @Table(name="work_time_corrections") public class WorkTimeCorrection {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) private WorkSession session;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) private Account actor;
 private LocalDateTime beforeTime,afterTime,createdAt=LocalDateTime.now().withNano(0);
 @Column(length=300,nullable=false)private String reason;
 protected WorkTimeCorrection(){}public WorkTimeCorrection(WorkSession session,Account actor,LocalDateTime before,LocalDateTime after,String reason){this.session=session;this.actor=actor;beforeTime=before;afterTime=after;this.reason=reason;}
 public LocalDateTime getBeforeTime(){return beforeTime;}public LocalDateTime getAfterTime(){return afterTime;}public LocalDateTime getCreatedAt(){return createdAt;}public String getReason(){return reason;}public String getActor(){return actor.getName();}
}

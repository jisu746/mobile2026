package com.storemate.backend.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/** Confirmed inputs are scoped to one employee and payroll month. */
@Entity
@Table(name="payroll_rule_drafts", uniqueConstraints=@UniqueConstraint(columnNames={"member_id","period"}))
public class PayrollRuleDraft {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) private StoreMember member;
 @Column(nullable=false,length=7) private String period;
 @Lob @Column(nullable=false) private String settings;
 private long revision;
 @Column(length=64) private String appliedHash;
 private LocalDateTime updatedAt;
 @Column(length=100) private String updatedBy;
 protected PayrollRuleDraft(){}
 public PayrollRuleDraft(StoreMember member,String period){this.member=member;this.period=period;}
 public String getSettings(){return settings;} public long getRevision(){return revision;}
 public String getAppliedHash(){return appliedHash;}
 public void update(String settings,Account actor){this.settings=settings;revision++;updatedAt=LocalDateTime.now().withNano(0);updatedBy=actor.getName();}
 public void applied(String hash){appliedHash=hash;}
}

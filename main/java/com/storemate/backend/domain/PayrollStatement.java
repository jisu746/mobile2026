package com.storemate.backend.domain;
import jakarta.persistence.*;import java.time.*;
@Entity @Table(name="payroll_statements",uniqueConstraints=@UniqueConstraint(columnNames={"member_id","period"})) public class PayrollStatement {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) private StoreMember member;
 @Column(length=7,nullable=false) private String period;
 private long basePay,additions,deductions;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) private Account finalizedBy;
 private LocalDateTime finalizedAt=LocalDateTime.now().withNano(0);
 protected PayrollStatement(){}public PayrollStatement(StoreMember member,String period,long base,long additions,long deductions,Account actor){this.member=member;this.period=period;basePay=base;this.additions=additions;this.deductions=deductions;finalizedBy=actor;}
 public long getBasePay(){return basePay;}public long getAdditions(){return additions;}public long getDeductions(){return deductions;}public String getFinalizedBy(){return finalizedBy.getName();}public LocalDateTime getFinalizedAt(){return finalizedAt;}
}

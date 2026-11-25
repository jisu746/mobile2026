package com.storemate.backend.domain;
import jakarta.persistence.*;
import java.time.LocalDateTime;
@Entity @Table(name="handover_confirmations",uniqueConstraints=@UniqueConstraint(columnNames={"handover_id","account_id","content_revision"}))
public class HandoverConfirmation {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) private Handover handover;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) private Account account;
    @Column(name="content_revision",nullable=false) private long contentRevision;
    private LocalDateTime confirmedAt=LocalDateTime.now().withNano(0);
    protected HandoverConfirmation(){}
    public HandoverConfirmation(Handover handover,Account account){this.handover=handover;this.account=account;contentRevision=handover.getRevision();}
    public Account getAccount(){return account;} public LocalDateTime getConfirmedAt(){return confirmedAt;}
}

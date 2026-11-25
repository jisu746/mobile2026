package com.storemate.backend.domain;
import jakarta.persistence.*;import java.time.*;
@Entity @Table(name="push_deliveries",uniqueConstraints=@UniqueConstraint(columnNames={"notification_id","device_token"}))
public class PushDelivery {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) private Notification notification;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="device_token") private PushDevice device;
 @Column(length=20) private String status="PENDING";
 @ManyToOne(fetch=FetchType.LAZY,optional=false) private Account recipient;
 public Account getRecipient(){return recipient;}
 private int attempts;private LocalDateTime nextAttempt=LocalDateTime.now();
 @Column(length=100) private String ticket;
 protected PushDelivery(){}public PushDelivery(Notification notification,PushDevice device){this.notification=notification;this.device=device;this.recipient=device.getAccount();}
 public Long getId(){return id;}public Notification getNotification(){return notification;}public PushDevice getDevice(){return device;}public int getAttempts(){return attempts;}public String getTicket(){return ticket;}public String getStatus(){return status;}
 public void skip(){status="SKIPPED";}public void defer(LocalDateTime time){nextAttempt=time;}
 public void accepted(String id){ticket=id;status="ACCEPTED";attempts++;nextAttempt=LocalDateTime.now().plusMinutes(15);}
 public void delivered(){status="DELIVERED";}public void fail(){attempts++;status=attempts>=5?"FAILED":"PENDING";nextAttempt=LocalDateTime.now().plusMinutes(Math.min(60,1L<<attempts));}
}

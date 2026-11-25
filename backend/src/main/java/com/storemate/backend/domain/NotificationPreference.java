package com.storemate.backend.domain;
import jakarta.persistence.*;
@Entity @Table(name="notification_preferences")
public class NotificationPreference {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @OneToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="account_id",unique=true,nullable=false) private Account account;
 private boolean pushEnabled=true,taskEnabled=true,expiryEnabled=true,stockEnabled=true,memoEnabled=true,payEnabled=true,quietEnabled=false;
 @Column(length=5,nullable=false) private String quietStart="23:00",quietEnd="08:00";
 private long revision;
 protected NotificationPreference(){}
 public NotificationPreference(Account account){this.account=account;}
 public boolean isPush(){return pushEnabled;}public boolean isTask(){return taskEnabled;}public boolean isExpiry(){return expiryEnabled;}public boolean isStock(){return stockEnabled;}public boolean isMemo(){return memoEnabled;}public boolean isPay(){return payEnabled;}public boolean isQuiet(){return quietEnabled;}
 public String getQuietStart(){return quietStart;}public String getQuietEnd(){return quietEnd;}public long getRevision(){return revision;}
 public void update(boolean push,boolean task,boolean expiry,boolean stock,boolean memo,boolean pay,boolean quiet,String start,String end){pushEnabled=push;taskEnabled=task;expiryEnabled=expiry;stockEnabled=stock;memoEnabled=memo;payEnabled=pay;quietEnabled=quiet;quietStart=start;quietEnd=end;revision++;}
}

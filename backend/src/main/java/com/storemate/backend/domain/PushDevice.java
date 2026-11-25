package com.storemate.backend.domain;
import jakarta.persistence.*;
import java.time.*;
@Entity @Table(name="push_devices") public class PushDevice {
 @Id @Column(length=255) private String token;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) private Account account;
 @Column(length=60) private String timezone="Asia/Seoul";
 @Column(length=200) private String sessionToken;
 public String getSessionToken(){return sessionToken;}public void bindSession(String token){sessionToken=token;}
 private boolean enabled=true;private LocalDateTime updatedAt;
 protected PushDevice(){}public PushDevice(String token,Account account,String timezone){this.token=token;update(account,timezone);}
 public String getToken(){return token;}public Account getAccount(){return account;}public String getTimezone(){return timezone;}public boolean isEnabled(){return enabled;}
 public void update(Account account,String timezone){this.account=account;this.timezone=timezone;enabled=true;updatedAt=LocalDateTime.now();}public void disable(){enabled=false;}
}

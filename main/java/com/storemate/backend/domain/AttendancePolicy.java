package com.storemate.backend.domain;
import jakarta.persistence.*;
@Entity @Table(name="attendance_policies")
public class AttendancePolicy {
 @Id private Long storeId;
 private int alertAfterHours=16,graceMinutes=60;
 private boolean autoCloseScheduled;
 private long revision;
 protected AttendancePolicy(){}public AttendancePolicy(Long storeId){this.storeId=storeId;}
 public int getAlertAfterHours(){return alertAfterHours;} public int getGraceMinutes(){return graceMinutes;}public boolean isAutoCloseScheduled(){return autoCloseScheduled;}public long getRevision(){return revision;}
 public void update(int hours,int grace,boolean auto){alertAfterHours=hours;graceMinutes=grace;autoCloseScheduled=auto;revision++;}
}

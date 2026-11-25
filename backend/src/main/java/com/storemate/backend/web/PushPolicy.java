package com.storemate.backend.web;
import com.storemate.backend.domain.NotificationPreference;import java.time.*;
public class PushPolicy {
 public static boolean allowed(NotificationPreference p,String kind){if(!p.isPush())return false;return switch(kind){case "task","task-review","task-assigned"->p.isTask();case "expiry"->p.isExpiry();case "stock"->p.isStock();case "handover"->p.isMemo();case "pay","schedule","clockin","clockout"->p.isPay();default->true;};}
 public static LocalDateTime quietEnd(NotificationPreference p,ZonedDateTime now){
  if(!p.isQuiet())return null;LocalTime start=LocalTime.parse(p.getQuietStart()),end=LocalTime.parse(p.getQuietEnd()),time=now.toLocalTime();
  boolean quiet=start.equals(end)||start.isBefore(end)?!time.isBefore(start)&&time.isBefore(end):!time.isBefore(start)||time.isBefore(end);
  if(start.equals(end))quiet=true;if(!quiet)return null;
  LocalDate day=now.toLocalDate();if(!time.isBefore(end)||start.equals(end))day=day.plusDays(1);
  return day.atTime(end).atZone(now.getZone()).withZoneSameInstant(ZoneId.systemDefault()).toLocalDateTime();
 }
}

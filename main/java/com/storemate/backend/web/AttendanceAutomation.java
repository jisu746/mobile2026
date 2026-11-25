package com.storemate.backend.web;
import com.storemate.backend.domain.*;
import com.storemate.backend.repo.*;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
@Service @org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name="storemate.automation.enabled",havingValue="true",matchIfMissing=true) public class AttendanceAutomation {
 private final WorkSessionRepository sessions;private final StoreMemberRepository members;private final WorkShiftRepository shifts;private final AttendancePolicyRepository policies;private final Notifier notifier;
 public AttendanceAutomation(WorkSessionRepository sessions,StoreMemberRepository members,WorkShiftRepository shifts,AttendancePolicyRepository policies,Notifier notifier){this.sessions=sessions;this.members=members;this.shifts=shifts;this.policies=policies;this.notifier=notifier;}
 public static LocalDateTime scheduledEnd(WorkShift shift){var start=LocalTime.parse(shift.getStartTime());var end=LocalTime.parse(shift.getEndTime());return shift.getDay().plusDays(end.isAfter(start)?0:1).atTime(end);}
 @Scheduled(fixedDelayString="${storemate.attendance.scan-delay-ms:60000}") @Transactional
 public void scan(){
  var now=LocalDateTime.now();
  for(var candidate:sessions.findByClockOutIsNullOrderByClockInAsc()){
   WorkSession w=sessions.findLockedById(candidate.getId()).orElse(null);if(w==null||w.getClockOut()!=null)continue;
   var policy=policies.findById(w.getStore().getId()).orElse(new AttendancePolicy(w.getStore().getId()));
   var scheduled=members.findByAccountAndStore(w.getAccount(),w.getStore()).flatMap(m->shifts.findByMemberAndDay(m,w.getClockIn().toLocalDate()));
   var end=scheduled.map(AttendanceAutomation::scheduledEnd).filter(t->t.isAfter(w.getClockIn()));
   boolean missed=end.map(t->now.isAfter(t.plusMinutes(policy.getGraceMinutes()))).orElseGet(()->now.isAfter(w.getClockIn().plusHours(policy.getAlertAfterHours())));
   if(!missed)continue;
   if(!w.isMissingAlertSent()){
    notifier.send(w.getStore(),Role.OWNER,w.getAccount(),"clockout",w.getAccount().getName()+" 님의 퇴근 확인이 필요해요","실제 퇴근 시각을 직원과 확인해주세요");w.markMissingAlert();
   }
   if(policy.isAutoCloseScheduled()&&end.isPresent())w.correctMissingClockOut(end.get(),w.getStore().getOwner(),"자동 처리: 매장 설정에 따라 예정 종료 시각으로 마감 (실제 근무와 다르면 관리자 정정 필요)");
  }
 }
}

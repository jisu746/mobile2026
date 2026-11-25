package com.storemate.backend.web;
import com.storemate.backend.domain.*;import com.storemate.backend.repo.*;import org.springframework.web.bind.annotation.*;import org.springframework.transaction.annotation.Transactional;import org.springframework.http.HttpStatus;import java.time.*;import java.util.*;
@RestController @RequestMapping("/api/stores/{storeId}/staff/{memberId}/work-records/{sessionId}/time-corrections") public class WorkTimeCorrectionController {
 private final StoreAccess access;private final StoreMemberRepository members;private final WorkSessionRepository sessions;private final WorkTimeCorrectionRepository corrections;private final PayrollStatementRepository statements;private final StockBatchService locks;
 public WorkTimeCorrectionController(StoreAccess access,StoreMemberRepository members,WorkSessionRepository sessions,WorkTimeCorrectionRepository corrections,PayrollStatementRepository statements,StockBatchService locks){this.access=access;this.members=members;this.sessions=sessions;this.corrections=corrections;this.statements=statements;this.locks=locks;}
 public record Request(String clockOut,String expectedClockOut,String reason){}
 public record View(String beforeTime,String afterTime,String actor,String reason,String createdAt){}
 private StoreMember member(Account actor,Long storeId,Long memberId){access.requireOwner(actor,storeId);return members.findById(memberId).filter(m->m.getStore().getId().equals(storeId)).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"직원을 찾을 수 없어요"));}
 private WorkSession session(StoreMember m,Long sessionId){return sessions.findLockedById(sessionId).filter(w->w.getStore().getId().equals(m.getStore().getId())&&w.getAccount().getId().equals(m.getAccount().getId())).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"근무 기록을 찾을 수 없어요"));}
 @GetMapping @Transactional public List<View> list(@RequestAttribute(AuthInterceptor.ACCOUNT)Account actor,@PathVariable Long storeId,@PathVariable Long memberId,@PathVariable Long sessionId){var w=session(member(actor,storeId,memberId),sessionId);return corrections.findBySessionOrderByIdAsc(w).stream().map(c->new View(c.getBeforeTime().toString(),c.getAfterTime().toString(),c.getActor(),c.getReason(),c.getCreatedAt().toString())).toList();}
 @PostMapping @Transactional public Dto.WorkRecord correct(@RequestAttribute(AuthInterceptor.ACCOUNT)Account actor,@PathVariable Long storeId,@PathVariable Long memberId,@PathVariable Long sessionId,@RequestBody Request r){
  var m=member(actor,storeId,memberId);locks.lock(m.getStore());var w=session(m,sessionId);
  if(statements.findByMemberAndPeriod(m,YearMonth.from(w.getClockIn()).toString()).isPresent())throw new ApiException(HttpStatus.CONFLICT,"확정 급여에 포함된 기록이에요. 다음 급여 명세에 정정 차액을 남겨주세요");
  LocalDateTime after,expected;try{after=LocalDateTime.parse(r.clockOut());expected=LocalDateTime.parse(r.expectedClockOut());}catch(Exception e){throw new ApiException(HttpStatus.BAD_REQUEST,"퇴근 시각을 확인해주세요");}
  if(w.getClockOut()==null||!w.getClockOut().equals(expected))throw new ApiException(HttpStatus.CONFLICT,"근무 기록이 변경됐어요. 새로고침해주세요");
  if(!after.isAfter(w.getClockIn())||after.isAfter(LocalDateTime.now())||r.reason()==null||r.reason().isBlank()||r.reason().length()>300)throw new ApiException(HttpStatus.BAD_REQUEST,"실제 퇴근 시각과 정정 사유를 확인해주세요");
  corrections.save(new WorkTimeCorrection(w,actor,w.getClockOut(),after.withNano(0),r.reason().trim()));w.correctClosedClockOut(after,actor,r.reason().trim());return WageService.view(w);
 }
}

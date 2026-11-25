package com.storemate.backend.web;

import com.storemate.backend.domain.*;
import com.storemate.backend.repo.*;
import tools.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.*;
import java.time.temporal.TemporalAdjusters;
import java.util.*;

@RestController
@RequestMapping("/api/stores/{storeId}/staff/{memberId}/payroll/automatic")
public class StatutoryPayrollController {
 @org.springframework.beans.factory.annotation.Autowired private WorkBreakController breaks;
 private final StoreAccess access; private final StoreMemberRepository members; private final WorkSessionRepository sessions;
 private final PayrollRuleDraftRepository drafts;private final PayrollEntryRepository entries;private final PayrollStatementRepository statements;
 private final StockBatchService locks;private final ObjectMapper json;
 public StatutoryPayrollController(StoreAccess access,StoreMemberRepository members,WorkSessionRepository sessions,PayrollRuleDraftRepository drafts,PayrollEntryRepository entries,PayrollStatementRepository statements,StockBatchService locks,ObjectMapper json){this.access=access;this.members=members;this.sessions=sessions;this.drafts=drafts;this.entries=entries;this.statements=statements;this.locks=locks;this.json=json;}
 public record Save(long revision,StatutoryPayCalculator.Settings settings){}
 public record Apply(String hash){}
 public record View(long revision,StatutoryPayCalculator.Settings settings,List<StatutoryPayCalculator.Work> records,StatutoryPayCalculator.Result result,String hash,boolean applied,boolean finalized){}
 private StoreMember member(Account owner,Long storeId,Long memberId){access.requireOwner(owner,storeId);return members.findById(memberId).filter(m->m.getStore().getId().equals(storeId)&&m.getRole()==Role.STAFF&&m.getStatus()==MemberStatus.APPROVED).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"승인된 직원을 찾을 수 없어요"));}
 private String encode(Object value){try{return json.writeValueAsString(value);}catch(Exception e){throw new IllegalStateException(e);}}
 private StatutoryPayCalculator.Settings decode(String value){try{return json.readValue(value,StatutoryPayCalculator.Settings.class);}catch(Exception e){throw new IllegalStateException(e);}}
 private static String hash(String value){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException(e);}}
 private View view(StoreMember member,YearMonth month,PayrollRuleDraft draft){
  var settings=draft==null?new StatutoryPayCalculator.Settings(null,false,false,false,1,List.of(),List.of(),List.of(),false):decode(draft.getSettings());
  if(settings.weekStart()<1||settings.weekStart()>7)throw new ApiException(HttpStatus.BAD_REQUEST,"주 시작 요일은 월 1~일 7로 입력해주세요");
  LocalDate from=month.atDay(1).with(TemporalAdjusters.previousOrSame(DayOfWeek.of(settings.weekStart())));
  var records=sessions.findByAccountAndStoreAndClockInGreaterThanEqualAndClockInLessThanOrderByClockInAsc(member.getAccount(),member.getStore(),from.minusDays(3).atStartOfDay(),month.plusMonths(1).atDay(1).atStartOfDay()).stream().filter(w->w.getClockOut()==null?!w.getClockIn().isBefore(from.atStartOfDay()):w.getClockOut().isAfter(from.atStartOfDay())).map(w->new StatutoryPayCalculator.Work(w.getId(),w.getClockIn(),w.getClockOut(),w.getHourlyWage(),w.getBreakSeconds(),w.getBreakRevision(),w.getBreaksJson())).toList();
  StatutoryPayCalculator.Result result;
  try{result=StatutoryPayCalculator.calculate(month,records,settings,LocalDateTime.now());}catch(IllegalArgumentException e){throw new ApiException(HttpStatus.BAD_REQUEST,e.getMessage());}
  String fingerprint=hash(encode(List.of(month.toString(),settings,records,result.items(),result.blockers())));
  boolean finalized=statements.findByMemberAndPeriod(member,month.toString()).isPresent();
  return new View(draft==null?0:draft.getRevision(),settings,records,result,fingerprint,draft!=null&&fingerprint.equals(draft.getAppliedHash()),finalized);
 }
 @GetMapping @Transactional(readOnly=true) public View get(@RequestAttribute(AuthInterceptor.ACCOUNT)Account owner,@PathVariable Long storeId,@PathVariable Long memberId,@RequestParam String month){var m=member(owner,storeId,memberId);var ym=MemberController.month(month);return view(m,ym,drafts.findByMemberAndPeriod(m,ym.toString()).orElse(null));}
 @PutMapping @Transactional public View save(@RequestAttribute(AuthInterceptor.ACCOUNT)Account owner,@PathVariable Long storeId,@PathVariable Long memberId,@RequestParam String month,@RequestBody Save request){
  var m=member(owner,storeId,memberId);locks.lock(m.getStore());var ym=MemberController.month(month);editable(m,ym);
  var draft=drafts.findByMemberAndPeriod(m,ym.toString()).orElseGet(()->new PayrollRuleDraft(m,ym.toString()));
  if(draft.getRevision()!=request.revision())throw new ApiException(HttpStatus.CONFLICT,"다른 화면에서 설정이 바뀌었어요. 다시 불러와주세요");
  if(request.settings()==null)throw new ApiException(HttpStatus.BAD_REQUEST,"급여 설정을 입력해주세요");
  var input=request.settings();var confirmed=new ArrayList<StatutoryPayCalculator.ConfirmedWork>();
  if(input.work()==null||input.work().size()>500||input.work().stream().anyMatch(java.util.Objects::isNull))throw new ApiException(HttpStatus.BAD_REQUEST,"근무 확인 항목을 입력해주세요");
  for(var c:input.work()){if(c.breaksConfirmed()){var w=sessions.findById(c.id()).filter(x->x.getAccount().getId().equals(m.getAccount().getId())&&x.getStore().getId().equals(storeId)).orElseThrow(()->new ApiException(HttpStatus.BAD_REQUEST,"직원의 근무 기록을 선택해주세요"));var currentBreaks=breaks.get(owner,storeId,c.id());if(currentBreaks.revision()!=(c.breakRevision()==null?0:c.breakRevision()))throw new ApiException(HttpStatus.CONFLICT,"휴게 기록이 바뀌었어요. 다시 확인해주세요");var requestedBreaks=c.breaks()==null?List.<StatutoryPayCalculator.Pause>of():c.breaks();var saved=currentBreaks.breaks().equals(requestedBreaks)?currentBreaks:breaks.put(owner,storeId,c.id(),new WorkBreakController.Save(currentBreaks.revision(),requestedBreaks));confirmed.add(new StatutoryPayCalculator.ConfirmedWork(c.id(),true,saved.breaks(),c.agreedDailyMinutes(),saved.revision()));}else confirmed.add(c);}
  input=new StatutoryPayCalculator.Settings(input.fiveOrMore(),input.voluntaryPremiums(),input.adultHourlyOrdinaryConfirmed(),input.partTime(),input.weekStart(),confirmed,input.weeks(),input.holidays(),input.holidaysConfirmed());
  String settings=encode(input);if(settings.length()>150000)throw new ApiException(HttpStatus.BAD_REQUEST,"설정 내용이 너무 길어요");
  // Validate against current records before persisting. Transaction rollback preserves the old draft on errors.
  draft.update(settings,owner);View result=view(m,ym,draft);drafts.save(draft);return result;
 }
 private void editable(StoreMember member,YearMonth month){if(statements.findByMemberAndPeriod(member,month.toString()).isPresent())throw new ApiException(HttpStatus.CONFLICT,"확정한 명세는 변경할 수 없어요");}
 @PostMapping("/apply") @Transactional public View apply(@RequestAttribute(AuthInterceptor.ACCOUNT)Account owner,@PathVariable Long storeId,@PathVariable Long memberId,@RequestParam String month,@RequestBody Apply request){
  var m=member(owner,storeId,memberId);locks.lock(m.getStore());var ym=MemberController.month(month);editable(m,ym);
  var draft=drafts.findByMemberAndPeriod(m,ym.toString()).orElseThrow(()->new ApiException(HttpStatus.BAD_REQUEST,"먼저 계산 설정을 저장해주세요"));var v=view(m,ym,draft);
  if(!v.hash().equals(request.hash()))throw new ApiException(HttpStatus.CONFLICT,"근무·시급·설정이 변경됐어요. 다시 계산해주세요");
  if(!v.result().blockers().isEmpty())throw new ApiException(HttpStatus.CONFLICT,"확인이 필요한 항목을 모두 처리해주세요");
  if(v.applied())return v;
  var previous=entries.findByMemberAndPeriodOrderByIdAsc(m,ym.toString());
  if(previous.stream().anyMatch(e->!e.isCancelled()&&!e.isAutomatic()&&Set.of("WEEKLY","NIGHT","HOLIDAY","OVERTIME").contains(e.getKind())))throw new ApiException(HttpStatus.CONFLICT,"직접 입력한 주휴·야간·휴일·연장 항목을 먼저 확인하고 취소해주세요. 자동 계산과 중복될 수 있어요");
  previous.stream().filter(e->e.isAutomatic()&&!e.isCancelled()).forEach(e->e.cancel(owner,"확인한 자동 계산으로 갱신"));
  for(var item:v.result().items())if(item.amount()!=0){
   String key="statutory-"+draft.getRevision()+"-"+item.kind();
   // Revision increments on each explicit save. Reapplying a changed attendance snapshot needs a new save.
   if(entries.findByMemberAndPeriodAndClientKey(m,ym.toString(),key).isPresent())throw new ApiException(HttpStatus.CONFLICT,"근무 기록이 바뀌었어요. 설정 저장·계산 후 다시 반영해주세요");
   entries.save(new PayrollEntry(m,owner,ym.toString(),item.kind(),item.label(),item.amount(),"고용노동부 기준 · 확인한 계약·휴게·휴일 적용",key,v.hash()));
  }
  draft.applied(v.hash());return view(m,ym,draft);
 }
 public void requireFresh(StoreMember member,String month){var draft=drafts.findByMemberAndPeriod(member,month);boolean active=entries.findByMemberAndPeriodOrderByIdAsc(member,month).stream().anyMatch(e->e.isAutomatic()&&!e.isCancelled());if((active||draft.map(d->d.getAppliedHash()!=null).orElse(false))&&(draft.isEmpty()||!view(member,YearMonth.parse(month),draft.get()).applied()))throw new ApiException(HttpStatus.CONFLICT,"자동 계산 후 근무·시급·설정이 변경됐어요. 다시 계산해 반영해주세요");}
}

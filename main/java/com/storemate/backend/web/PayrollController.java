package com.storemate.backend.web;
import com.storemate.backend.domain.*;import com.storemate.backend.repo.*;
import org.springframework.web.bind.annotation.*;import org.springframework.transaction.annotation.Transactional;import org.springframework.http.HttpStatus;
import java.math.*;import java.time.*;import java.util.*;
@RestController @RequestMapping("/api/stores/{storeId}") public class PayrollController {
 @org.springframework.beans.factory.annotation.Autowired private StatutoryPayrollController automaticPayroll;
 private final StoreAccess access;private final StoreMemberRepository members;private final WorkSessionRepository sessions;private final PayrollEntryRepository entries;private final PayrollStatementRepository statements;private final StockBatchService locks;private final Notifier notifier;
 public PayrollController(StoreAccess access,StoreMemberRepository members,WorkSessionRepository sessions,PayrollEntryRepository entries,PayrollStatementRepository statements,StockBatchService locks,Notifier notifier){this.access=access;this.members=members;this.sessions=sessions;this.entries=entries;this.statements=statements;this.locks=locks;this.notifier=notifier;}
 public record Line(long id,String kind,String reason,long amount,String calculation,String actor,String createdAt,boolean cancelled,String cancelReason,boolean automatic){}
 public record Summary(String period,long basePay,long additions,long deductions,long netPay,int unknownWages,int activeSessions,boolean finalized,String finalizedBy,String finalizedAt,List<Line> entries){}
 public record Add(String kind,String reason,Long amount,BigDecimal hours,Integer hourlyWage,BigDecimal factor,String clientKey){}
 public record Cancel(String reason){}
 public record Finalize(boolean attendanceConfirmed,boolean allowancesConfirmed,boolean deductionsConfirmed){}
 private StoreMember member(Account owner,Long storeId,Long id){access.requireOwner(owner,storeId);return members.findById(id).filter(m->m.getStore().getId().equals(storeId)&&m.getRole()==Role.STAFF).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"직원을 찾을 수 없어요"));}
 private String period(String value){return MemberController.month(value).toString();}
 private void editable(StoreMember m,String period){if(statements.findByMemberAndPeriod(m,period).isPresent())throw new ApiException(HttpStatus.CONFLICT,"확정한 명세는 변경할 수 없어요. 다음 명세에 정정 항목으로 반영해주세요");}
 static long calculate(Add r){
  if(r.amount()!=null){if(r.hours()!=null||r.hourlyWage()!=null||r.factor()!=null)throw new ApiException(HttpStatus.BAD_REQUEST,"금액 또는 시간 계산 중 하나만 입력해주세요");return r.amount();}
  if(r.hours()==null||r.hourlyWage()==null||r.factor()==null||r.hours().signum()<=0||r.hours().compareTo(new BigDecimal("744"))>0||r.hourlyWage()<1||r.hourlyWage()>100000||r.factor().signum()<=0||r.factor().compareTo(BigDecimal.TEN)>0)throw new ApiException(HttpStatus.BAD_REQUEST,"시간·시급·배율을 확인해주세요");
  return r.hours().multiply(BigDecimal.valueOf(r.hourlyWage())).multiply(r.factor()).setScale(0,RoundingMode.HALF_UP).longValueExact();
 }
 private Summary summary(StoreMember member,String period){
  YearMonth ym=YearMonth.parse(period);var records=sessions.findByAccountAndStoreAndClockInGreaterThanEqualAndClockInLessThanOrderByClockInAsc(member.getAccount(),member.getStore(),ym.atDay(1).atStartOfDay(),ym.plusMonths(1).atDay(1).atStartOfDay());
  int unknown=0,active=0;BigDecimal base=BigDecimal.ZERO;
  for(var w:records){if(w.getClockOut()==null){active++;continue;}if(w.getHourlyWage()==null){unknown++;continue;}long seconds=Duration.between(w.getClockIn(),w.getClockOut()).getSeconds()-w.getBreakSeconds();base=base.add(BigDecimal.valueOf(Math.max(0,seconds)).multiply(BigDecimal.valueOf(w.getHourlyWage())).divide(BigDecimal.valueOf(3600),12,RoundingMode.HALF_UP));}
  var list=entries.findByMemberAndPeriodOrderByIdAsc(member,period);long additions=0,deductions=0;for(var entry:list)if(!entry.isCancelled()){if(entry.getAmount()>0)additions+=entry.getAmount();else deductions-=entry.getAmount();}
  long basic=base.setScale(0,RoundingMode.HALF_UP).longValueExact();var finalized=statements.findByMemberAndPeriod(member,period);if(finalized.isPresent()){var v=finalized.get();basic=v.getBasePay();additions=v.getAdditions();deductions=v.getDeductions();}
  return new Summary(period,basic,additions,deductions,basic+additions-deductions,unknown,active,finalized.isPresent(),finalized.map(PayrollStatement::getFinalizedBy).orElse(null),finalized.map(v->v.getFinalizedAt().toString()).orElse(null),list.stream().map(e->new Line(e.getId(),e.getKind(),e.getReason(),e.getAmount(),e.getCalculation(),e.getActorName(),e.getCreatedAt().toString(),e.isCancelled(),e.getCancelReason(),e.isAutomatic())).toList());
 }
 @GetMapping("/staff/{memberId}/payroll") @Transactional(readOnly=true) public Summary get(@RequestAttribute(AuthInterceptor.ACCOUNT)Account owner,@PathVariable Long storeId,@PathVariable Long memberId,@RequestParam String month){return summary(member(owner,storeId,memberId),period(month));}
 @GetMapping("/payroll/me") @Transactional(readOnly=true) public Summary mine(@RequestAttribute(AuthInterceptor.ACCOUNT)Account account,@PathVariable Long storeId,@RequestParam String month){return summary(access.requireApproved(account,storeId),period(month));}
 @PostMapping("/staff/{memberId}/payroll/entries") @Transactional public Summary add(@RequestAttribute(AuthInterceptor.ACCOUNT)Account owner,@PathVariable Long storeId,@PathVariable Long memberId,@RequestParam String month,@RequestBody Add r){
  var m=member(owner,storeId,memberId);locks.lock(m.getStore());String period=period(month);editable(m,period);
  if(!Set.of("WEEKLY","OVERTIME","NIGHT","HOLIDAY","DEDUCTION","WAGE_CORRECTION","OTHER").contains(r.kind()==null?"":r.kind())||r.reason()==null||r.reason().isBlank()||r.reason().length()>200)throw new ApiException(HttpStatus.BAD_REQUEST,"항목 종류와 계산 사유를 입력해주세요");
  if(r.clientKey()==null||!r.clientKey().matches("[A-Za-z0-9_-]{8,80}"))throw new ApiException(HttpStatus.BAD_REQUEST,"급여 저장 요청을 다시 확인해주세요");
  if(r.clientKey().startsWith("statutory-"))throw new ApiException(HttpStatus.BAD_REQUEST,"자동 계산 전용 요청 키예요");
  if(Set.of("WEEKLY","NIGHT","HOLIDAY","OVERTIME").contains(r.kind())&&entries.findByMemberAndPeriodOrderByIdAsc(m,period).stream().anyMatch(e->e.isAutomatic()&&!e.isCancelled()))throw new ApiException(HttpStatus.CONFLICT,"자동 계산이 반영돼 있어요. 자동 설정에서 수정해주세요");
  String fingerprint;try{fingerprint=java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(r.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8)));}catch(java.security.NoSuchAlgorithmException e){throw new IllegalStateException(e);}
  var existing=entries.findByMemberAndPeriodAndClientKey(m,period,r.clientKey());if(existing.isPresent()){if(!existing.get().getFingerprint().equals(fingerprint))throw new ApiException(HttpStatus.CONFLICT,"급여 저장 요청 내용이 달라요");return summary(m,period);}
  long amount=calculate(r);if(amount==0||(amount < -100000000 || amount > 100000000))throw new ApiException(HttpStatus.BAD_REQUEST,"금액은 0원 외에 ±100,000,000원 이내로 입력해주세요");
  if("DEDUCTION".equals(r.kind()))amount=-Math.abs(amount);else if(amount<0&&!"WAGE_CORRECTION".equals(r.kind()))throw new ApiException(HttpStatus.BAD_REQUEST,"지급 항목은 양수로 입력해주세요");
  String formula=r.amount()!=null?"직접 확인 금액":r.hours()+"시간 × "+r.hourlyWage()+"원 × "+r.factor()+"배 (원 단위 반올림)";
  entries.save(new PayrollEntry(m,owner,period,r.kind(),r.reason().trim(),amount,formula,r.clientKey(),fingerprint));return summary(m,period);
 }
 @PostMapping("/staff/{memberId}/payroll/entries/{id}/cancel") @Transactional public Summary cancel(@RequestAttribute(AuthInterceptor.ACCOUNT)Account owner,@PathVariable Long storeId,@PathVariable Long memberId,@PathVariable Long id,@RequestParam String month,@RequestBody Cancel r){
  var m=member(owner,storeId,memberId);locks.lock(m.getStore());String period=period(month);editable(m,period);var e=entries.findById(id).filter(x->x.getMember().getId().equals(memberId)&&x.getPeriod().equals(period)).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"급여 항목을 찾을 수 없어요"));if(e.isAutomatic())throw new ApiException(HttpStatus.CONFLICT,"자동 계산 항목은 계산 설정에서 갱신해주세요");if(r.reason()==null||r.reason().isBlank()||r.reason().length()>200)throw new ApiException(HttpStatus.BAD_REQUEST,"취소 사유를 입력해주세요");if(!e.isCancelled())e.cancel(owner,r.reason().trim());return summary(m,period);
 }
 @PostMapping("/staff/{memberId}/payroll/finalize") @Transactional public Summary finalizePay(@RequestAttribute(AuthInterceptor.ACCOUNT)Account owner,@PathVariable Long storeId,@PathVariable Long memberId,@RequestParam String month,@RequestBody Finalize r){
  var m=member(owner,storeId,memberId);locks.lock(m.getStore());String period=period(month);if(statements.findByMemberAndPeriod(m,period).isPresent())return summary(m,period);
  if(!r.attendanceConfirmed()||!r.allowancesConfirmed()||!r.deductionsConfirmed())throw new ApiException(HttpStatus.BAD_REQUEST,"근무·수당·공제 확인이 필요해요");
  if(!YearMonth.parse(period).isBefore(YearMonth.now()))throw new ApiException(HttpStatus.BAD_REQUEST,"월이 끝난 뒤 명세를 확정할 수 있어요");
  if(automaticPayroll!=null)automaticPayroll.requireFresh(m,period);
  var s=summary(m,period);if(s.unknownWages()>0||s.activeSessions()>0||s.netPay()<0)throw new ApiException(HttpStatus.CONFLICT,"미확정 시급·퇴근 누락·공제 금액을 확인해주세요");
  statements.save(new PayrollStatement(m,period,s.basePay(),s.additions(),s.deductions(),owner));notifier.send(m.getStore(),Role.STAFF,owner,"pay","급여 명세가 확정됐어요",period+" · "+m.getAccount().getName());return summary(m,period);
 }
}

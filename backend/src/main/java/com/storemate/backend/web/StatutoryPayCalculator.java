package com.storemate.backend.web;

import java.math.*;
import java.time.*;
import java.time.temporal.TemporalAdjusters;
import java.util.*;

/** Adult hourly workers, ordinary (non-flexible) working time. All amounts are ADDITIONS to recorded gross base. */
public final class StatutoryPayCalculator {
 private StatutoryPayCalculator(){}
 public record Pause(LocalDateTime from,LocalDateTime to){}
 public record Work(long id,LocalDateTime from,LocalDateTime to,Integer wage,long baseBreakSeconds,long breakRevision,String breaks){public Work(long id,LocalDateTime from,LocalDateTime to,Integer wage){this(id,from,to,wage,0,0,null);}}
 public record ConfirmedWork(long id,boolean breaksConfirmed,List<Pause> breaks,Integer agreedDailyMinutes,Long breakRevision){public ConfirmedWork(long id,boolean confirmed,List<Pause> breaks,Integer minutes){this(id,confirmed,breaks,minutes,0L);}}
 public record Week(LocalDate holiday,double prescribedHours,int averagingWeeks,int normalWorkerDays,
                    int wage,boolean attendanceConfirmed,boolean fullAttendance,boolean workedAtLeastOneDay,
                    boolean employmentWholeWeek,Integer agreedWeeklyMinutes,Double normalDayHours){}
 public record Holiday(LocalDate day,boolean premiumEligible,double paidHours,int wage,boolean confirmed){}
 public record Settings(Boolean fiveOrMore,boolean voluntaryPremiums,boolean adultHourlyOrdinaryConfirmed,
                        boolean partTime,int weekStart,List<ConfirmedWork> work,List<Week> weeks,List<Holiday> holidays,
                        boolean holidaysConfirmed){}
 public record Item(String kind,String label,long amount){}
 public record Result(List<Item> items,List<String> blockers,List<String> notes){}
 private static final BigDecimal HOUR=BigDecimal.valueOf(3600);
 private static LocalDate week(LocalDate day,int first){return day.with(TemporalAdjusters.previousOrSame(DayOfWeek.of(first)));}
 private static IllegalArgumentException bad(String s){return new IllegalArgumentException(s);}
 private static BigDecimal pay(long seconds,int wage,double factor){return BigDecimal.valueOf(seconds).multiply(BigDecimal.valueOf(wage)).multiply(BigDecimal.valueOf(factor)).divide(HOUR,12,RoundingMode.HALF_UP);}
 public static Result calculate(YearMonth month,List<Work> records,Settings s,LocalDateTime now){
  if(s==null||s.weekStart()<1||s.weekStart()>7||s.work()==null||s.weeks()==null||s.holidays()==null||s.work().size()>500||s.weeks().size()>12||s.holidays().size()>40)throw bad("급여 설정을 확인해주세요");
  List<String> blocks=new ArrayList<>(),notes=new ArrayList<>();
  if(s.fiveOrMore()==null)blocks.add("상시 근로자 5인 이상·미만 여부를 확인해주세요");
  if(!s.adultHourlyOrdinaryConfirmed())blocks.add("성인 시급제·일반 근로시간제 적용 여부를 확인해주세요. 탄력·선택근로, 감시단속, 월급제 등은 별도 검토가 필요해요.");
  if(!s.holidaysConfirmed())blocks.add("주휴일·근로자의 날·공휴일·대체/약정휴일 및 휴일대체 여부를 확인해주세요.");
  Map<Long,ConfirmedWork> confirmed=new HashMap<>();for(var c:s.work()){if(c==null||confirmed.put(c.id(),c)!=null)throw bad("근무 확인 항목이 중복돼요");}
  Map<LocalDate,Week> weeks=new HashMap<>();for(var w:s.weeks()){
   if(w==null||w.holiday()==null||!Double.isFinite(w.prescribedHours())||w.prescribedHours()<0||w.prescribedHours()>40*w.averagingWeeks()||w.averagingWeeks()<1||w.averagingWeeks()>4||w.normalWorkerDays()<1||w.normalWorkerDays()>7*w.averagingWeeks()||w.wage()<1||w.wage()>100000)throw bad("주휴 계산의 약정 시간·평균 기간·통상근로자 근무일수·시급을 확인해주세요");
   if(w.averagingWeeks()*7>w.normalWorkerDays()&&w.normalWorkerDays()<w.averagingWeeks())throw bad("통상근로자 근무일수를 확인해주세요");
   if(w.normalDayHours()!=null&&(!Double.isFinite(w.normalDayHours())||w.normalDayHours()<=0||w.normalDayHours()>8))throw bad("통상근로자 1일 정상 근로시간은 0 초과~8시간으로 입력해주세요");
   LocalDate anchor=week(w.holiday(),s.weekStart());if(weeks.put(anchor,w)!=null)throw bad("같은 주의 주휴 확인이 중복돼요");
   if(w.agreedWeeklyMinutes()!=null&&(w.agreedWeeklyMinutes()<0||w.agreedWeeklyMinutes()>2400))throw bad("주 약정시간은 0~40시간으로 입력해주세요");
  }
  Map<LocalDate,Holiday> holidays=new HashMap<>();for(var h:s.holidays()){
   if(h==null||h.day()==null||h.paidHours()<0||h.paidHours()>8||!Double.isFinite(h.paidHours())||h.wage()<1||h.wage()>100000||holidays.put(h.day(),h)!=null)throw bad("휴일 날짜·유급 시간·시급을 확인해주세요");
   if(!h.confirmed())blocks.add(h.day()+" 휴일 적용 확인이 필요해요");
  }
  BigDecimal night=BigDecimal.ZERO,holiday=BigDecimal.ZERO,overtime=BigDecimal.ZERO,breakDeduction=BigDecimal.ZERO,weekly=BigDecimal.ZERO,paidHoliday=BigDecimal.ZERO;
  boolean premium=Boolean.TRUE.equals(s.fiveOrMore())||s.voluntaryPremiums();
  Map<LocalDate,Long> ordinaryWeek=new HashMap<>(),holidayDay=new HashMap<>(),workDay=new HashMap<>();
  Set<LocalDate> touchedWeeks=new TreeSet<>();
  var sorted=records.stream().sorted(Comparator.comparing(Work::from)).toList();LocalDateTime lastEnd=null;
  for(var r:sorted){
   boolean target=YearMonth.from(r.from()).equals(month);
   if(r.to()==null){if(target)blocks.add("근무 #"+r.id()+" 퇴근 처리가 필요해요");continue;}
   if(!r.to().isAfter(r.from())||Duration.between(r.from(),r.to()).toHours()>72||r.to().isAfter(now)) {blocks.add("근무 #"+r.id()+"의 근무시간을 확인해주세요 (72시간 초과 또는 미래 기록)");continue;}
   if(lastEnd!=null&&r.from().isBefore(lastEnd))blocks.add("겹치는 출퇴근 기록을 정정해주세요");lastEnd=r.to();
   if(r.wage()==null||r.wage()<1||r.wage()>100000){blocks.add("근무 #"+r.id()+"의 당시 시급을 확정해주세요");continue;}
   var c=confirmed.get(r.id());if(c==null||!c.breaksConfirmed()){blocks.add("근무 #"+r.id()+"의 실제 휴게시간을 확인해주세요 (휴게 없음도 확인 필요)");continue;}
   if((c.breakRevision()==null?0:c.breakRevision())!=r.breakRevision())blocks.add("근무 #"+r.id()+" 휴게 기록이 변경됐어요. 다시 확인해주세요");
   if(s.partTime()&&premium&&(c.agreedDailyMinutes()==null||c.agreedDailyMinutes()<0||c.agreedDailyMinutes()>480)){blocks.add("근무 #"+r.id()+"의 당일 약정 근로시간을 확인해주세요");continue;}
   List<Pause> pauses=c.breaks()==null?List.of():c.breaks().stream().peek(b->{if(b==null||b.from()==null||b.to()==null)throw bad("휴게 시작·종료 시각을 입력해주세요");}).sorted(Comparator.comparing(Pause::from)).toList();LocalDateTime end=r.from();long breakSeconds=0;
   for(var b:pauses){if(b.from()==null||b.to()==null||!b.to().isAfter(b.from())||b.from().isBefore(end)||b.from().isBefore(r.from())||b.to().isAfter(r.to()))throw bad("휴게시간은 해당 근무 안에서 겹치지 않게 입력해주세요");end=b.to();breakSeconds+=Duration.between(b.from(),b.to()).getSeconds();}
   if(breakSeconds>=Duration.between(r.from(),r.to()).getSeconds())throw bad("휴게시간이 전체 근무시간 이상이에요");
   if(target)breakDeduction=breakDeduction.add(pay(breakSeconds-r.baseBreakSeconds(),r.wage(),1));
   int pauseIndex=0;long active=0;
   for(LocalDateTime t=r.from();t.isBefore(r.to());){
    while(pauseIndex<pauses.size()&&!t.isBefore(pauses.get(pauseIndex).to()))pauseIndex++;
    if(pauseIndex<pauses.size()&&!t.isBefore(pauses.get(pauseIndex).from())){t=pauses.get(pauseIndex).to();continue;}
    LocalDate d=t.toLocalDate(),wk=week(d,s.weekStart());if(target)touchedWeeks.add(wk);
    var w=weeks.get(wk);var h=holidays.get(d);
    boolean isHoliday=h!=null&&h.premiumEligible();
    if(w!=null&&w.holiday().equals(d)&&w.fullAttendance()&&w.workedAtLeastOneDay()&&w.employmentWholeWeek()&&w.prescribedHours()/w.averagingWeeks()>=15)isHoliday=true;
    long daySeconds=workDay.getOrDefault(r.from().toLocalDate(),0L),hs=holidayDay.getOrDefault(d,0L),ws=ordinaryWeek.getOrDefault(wk,0L);
    long dailyLimit=s.partTime()?Math.min(28800,c.agreedDailyMinutes()==null?28800:c.agreedDailyMinutes()*60L):28800;
    long weeklyLimit=s.partTime()&&w!=null&&w.agreedWeeklyMinutes()!=null?Math.min(144000,w.agreedWeeklyMinutes()*60L):144000;
    LocalDateTime next=r.to();
    for(var boundary:List.of(d.atTime(6,0),d.atTime(22,0),d.plusDays(1).atStartOfDay()))if(boundary.isAfter(t)&&boundary.isBefore(next))next=boundary;
    if(pauseIndex<pauses.size()&&pauses.get(pauseIndex).from().isBefore(next))next=pauses.get(pauseIndex).from();
    long step=Duration.between(t,next).getSeconds();
    if(daySeconds<dailyLimit)step=Math.min(step,dailyLimit-daySeconds);
    if(isHoliday&&hs<28800)step=Math.min(step,28800-hs);
    if(!isHoliday&&daySeconds<dailyLimit&&ws<weeklyLimit)step=Math.min(step,weeklyLimit-ws);
    if(step<=0)throw bad("출퇴근 시각은 초 단위로 입력해주세요");
    active+=step;workDay.put(r.from().toLocalDate(),daySeconds+step);
    int hour=t.getHour();if(target&&premium&&(hour>=22||hour<6))night=night.add(pay(step,r.wage(),.5));
    if(isHoliday){holidayDay.put(d,hs+step);if(hs<28800&&daySeconds<dailyLimit)ordinaryWeek.put(wk,ws+step);if(target&&premium)holiday=holiday.add(pay(step,r.wage(),hs<28800?.5:1));}
    else{
     if(s.partTime()&&premium&&(w==null||w.agreedWeeklyMinutes()==null))blocks.add(wk+" 주의 약정 근로시간 확인이 필요해요");
     boolean daily=daySeconds>=dailyLimit,weeklyExtra=ws>=weeklyLimit;
     if(!daily)ordinaryWeek.put(wk,ws+step);
     if(target&&premium&&(daily||weeklyExtra))overtime=overtime.add(pay(step,r.wage(),.5));
    }
    t=t.plusSeconds(step);
   }
   if((active>=14400&&breakSeconds<1800)||(active>=28800&&breakSeconds<3600))notes.add("근무 #"+r.id()+": 4시간에 30분·8시간에 1시간 휴게 기준도 확인해주세요. 실제 쉰 시간만 차감했어요.");
  }
  // Weekly eligibility cannot be inferred from punch duration: owner confirms contracts, leave and attendance.
  LocalDate first=month.atDay(1),limit=month.plusMonths(1).atDay(1);
  for(var wk:touchedWeeks)if(!weeks.containsKey(wk)||!weeks.get(wk).attendanceConfirmed())blocks.add(wk+" 주의 주휴 대상·약정 시간 확인이 필요해요");
  for(var w:weeks.values())if(!w.holiday().isBefore(first)&&w.holiday().isBefore(limit)){
   if(!w.attendanceConfirmed()){blocks.add(w.holiday()+" 주휴 대상 확인이 필요해요");continue;}
   if(w.holiday().isAfter(now.toLocalDate()))blocks.add(w.holiday()+" 주휴일이 아직 지나지 않았어요");
   if(w.prescribedHours()/w.averagingWeeks()>=15&&w.fullAttendance()&&w.workedAtLeastOneDay()&&w.employmentWholeWeek()){
    if(!s.partTime()&&w.normalDayHours()==null){blocks.add(w.holiday()+" 통상근로자의 1일 정상 근로시간을 확인해주세요");continue;}
    double paidHours=s.partTime()?Math.min(8,w.prescribedHours()/w.normalWorkerDays()):w.normalDayHours();
    weekly=weekly.add(BigDecimal.valueOf(paidHours).multiply(BigDecimal.valueOf(w.wage())));
   }
  }
  for(var h:holidays.values())if(YearMonth.from(h.day()).equals(month)){
   if(h.day().isAfter(now.toLocalDate()))blocks.add(h.day()+" 휴일이 아직 지나지 않았어요");
   var w=weeks.get(week(h.day(),s.weekStart()));
   if(w!=null&&w.holiday().equals(h.day())&&h.paidHours()>0)blocks.add(h.day()+" 주휴일과 유급휴일이 겹쳐요. 중복 유급 지급 여부를 별도로 확인해주세요");
   paidHoliday=paidHoliday.add(BigDecimal.valueOf(h.paidHours()).multiply(BigDecimal.valueOf(h.wage())));
  }
  notes.add("상시 5인 미만은 법정 연장·야간·휴일 가산 제외 (별도 약정 적용 선택 가능). 기본급에 포함된 근로분에 가산분만 더해요.");
  notes.add("주휴는 주휴일이 속한 달, 근로 가산·휴게 차감은 출근일이 속한 달에 반영해요. 공제·세금은 별도 확인 항목이에요.");
  return new Result(List.of(item("WEEKLY","주휴수당",weekly),item("NIGHT","야간 가산 +50%",night),item("HOLIDAY","휴일 가산 +50% / 8시간 초과 +100%",holiday),item("OVERTIME","연장·단시간 초과 가산 +50%",overtime),item("OTHER","주휴 외 유급휴일 임금",paidHoliday),item("WAGE_CORRECTION","실제 무급 휴게시간 기본급 차감",breakDeduction.negate())),blocks.stream().distinct().toList(),notes.stream().distinct().toList());
 }
 private static Item item(String kind,String label,BigDecimal amount){return new Item(kind,label,amount.setScale(0,RoundingMode.HALF_UP).longValueExact());}
}

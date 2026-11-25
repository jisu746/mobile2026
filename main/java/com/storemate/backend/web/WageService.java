package com.storemate.backend.web;
import com.storemate.backend.domain.*;
import com.storemate.backend.repo.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.List;

@Service
public class WageService {
    // 기존 앱의 기본값. 연도별 기본값 관리는 별도 기능이다.
    public static final int DEFAULT_WAGE = 10320;
    private final WageRateRepository rates;
    private final StoreMemberRepository members;
    public WageService(WageRateRepository rates, StoreMemberRepository members) { this.rates = rates; this.members = members; }
    public record Rate(int amount, boolean defaultRate) {}
    public static int validAmount(Integer amount) {
        if (amount == null || amount < 1 || amount > 100000)
            throw new ApiException(HttpStatus.BAD_REQUEST, "시급은 1원 이상 100,000원 이하로 입력해주세요");
        return amount;
    }
    public Rate resolve(StoreMember member, LocalDate date) {
        return rates.findFirstByMemberAndEffectiveFromLessThanEqualOrderByEffectiveFromDesc(member, date)
            .map(r -> new Rate(r.getHourlyWage(), r.isDefaultRate()))
            .orElseGet(() -> new Rate(member.getHourlyWage() == null ? DEFAULT_WAGE : member.getHourlyWage(), member.getHourlyWage() == null));
    }
    private StoreMember locked(StoreMember member) {
        return members.findLockedById(member.getId()).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "직원을 찾을 수 없어요"));
    }
    public Rate forNewSession(StoreMember member, LocalDate day) { return resolve(locked(member), day); }
    public void schedule(StoreMember member, Account actor, Integer amount, LocalDate from) {
        validAmount(amount);
        LocalDate today = LocalDate.now();
        if (from == null || from.isBefore(today))
            throw new ApiException(HttpStatus.BAD_REQUEST, "적용 시작일은 오늘 이후로 선택해주세요. 과거 기록은 별도로 확인해주세요");
        StoreMember current = locked(member);
        // 미래 예약이 현재 설정값을 바꾸지 않도록 기존 설정을 오늘 기준 이력으로 보존한다.
        if (from.isAfter(today) && rates.findFirstByMemberAndEffectiveFromLessThanEqualOrderByEffectiveFromDesc(current, today).isEmpty()) {
            Rate baseline = resolve(current, today);
            rates.save(new WageRate(current, today, baseline.amount(), baseline.defaultRate(), actor));
        }
        WageRate rate = rates.findByMemberAndEffectiveFrom(current, from).orElse(null);
        if (rate == null) rates.save(new WageRate(current, from, amount, false, actor));
        else rate.set(amount, false, actor);
        rates.flush();
    }
    public Dto.WageHistory history(StoreMember member) {
        Rate current = resolve(member, LocalDate.now());
        List<Dto.WageRateView> history = rates.findByMemberOrderByEffectiveFromDesc(member).stream()
            .map(r -> new Dto.WageRateView(r.getEffectiveFrom().toString(), r.getHourlyWage(), r.isDefaultRate())).toList();
        return new Dto.WageHistory(current.amount(), current.defaultRate(), history);
    }
    public static Dto.WorkRecord view(WorkSession w) {
        return new Dto.WorkRecord(w.getId(), w.getClockIn().toString(), w.getClockOut() == null ? null : w.getClockOut().toString(), w.getHourlyWage(), w.getWageSource(),
            w.getClockOutCorrectedBy() == null ? null : w.getClockOutCorrectedBy().getName(),
            w.getClockOutCorrectedAt() == null ? null : w.getClockOutCorrectedAt().toString(), w.getClockOutCorrectionReason(),w.getBreakSeconds(),w.getBreakRevision(),w.getBreaksJson());
    }
}

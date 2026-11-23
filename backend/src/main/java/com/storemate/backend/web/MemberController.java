// 직원 시급·근무 일정 API (사장님이 정하고, 직원은 내 것을 읽는다)
package com.storemate.backend.web;

import com.storemate.backend.domain.Account;
import com.storemate.backend.domain.MemberStatus;
import com.storemate.backend.domain.Role;
import com.storemate.backend.domain.Store;
import com.storemate.backend.domain.StoreMember;
import com.storemate.backend.domain.WorkShift;
import com.storemate.backend.repo.StoreMemberRepository;
import com.storemate.backend.repo.WorkShiftRepository;
import com.storemate.backend.repo.WorkSessionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/stores/{storeId}")
public class MemberController {
    private static final Pattern TIME = Pattern.compile("^([01]\\d|2[0-3]):[0-5]\\d$");
    private static final int MAX_WAGE = 100000;

    private final StoreAccess access;
    private final StoreMemberRepository members;
    private final WorkShiftRepository shifts;
    private final WorkSessionRepository sessions;
    private final WageService wages;

    public MemberController(StoreAccess access, StoreMemberRepository members, WorkShiftRepository shifts, WorkSessionRepository sessions, WageService wages) {
        this.access = access;
        this.members = members;
        this.shifts = shifts;
        this.sessions = sessions;
        this.wages = wages;
    }

    static String validWorkPart(String value) {
        if (value == null || value.isBlank() || value.trim().length() > 30)
            throw new ApiException(HttpStatus.BAD_REQUEST, "근무 파트는 1~30자로 입력해주세요");
        return value.trim();
    }

    private Dto.StaffView view(StoreMember m) {
        var rate = wages.resolve(m, LocalDate.now());
        return new Dto.StaffView(m.getId(), m.getAccount().getName(), rate.defaultRate() ? null : rate.amount(),
                m.getAccount().getUsername(), m.getWorkPart(), m.getRequestedAt().toString());
    }

    static YearMonth month(String s) {
        try {
            return YearMonth.parse(s);
        } catch (DateTimeParseException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "월 형식이 올바르지 않아요");
        }
    }

    private List<Dto.Shift> shiftsOf(StoreMember m, String month) {
        YearMonth ym = month(month);
        return shifts.findByMemberAndDayGreaterThanEqualAndDayLessThanOrderByDayAsc(m, ym.atDay(1), ym.plusMonths(1).atDay(1)).stream()
                .map(w -> new Dto.Shift(w.getDay().toString(), w.getStartTime(), w.getEndTime())).toList();
    }

    // ---- 직원(본인) ----

    @GetMapping("/me")
    @Transactional(readOnly = true)
    public Dto.MeView me(@RequestAttribute(AuthInterceptor.ACCOUNT) Account account, @PathVariable Long storeId) {
        StoreMember m = access.requireApproved(account, storeId);
        var rate = wages.resolve(m, LocalDate.now());
        return new Dto.MeView(rate.defaultRate() ? null : rate.amount(), m.getRequestedAt().toLocalDate().toString());
    }

    // 내 근무 일정 (month = yyyy-MM)
    @GetMapping("/schedule")
    @Transactional(readOnly = true)
    public List<Dto.Shift> schedule(@RequestAttribute(AuthInterceptor.ACCOUNT) Account account, @PathVariable Long storeId,
                                    @RequestParam String month) {
        return shiftsOf(access.requireApproved(account, storeId), month);
    }

    // ---- 사장님 ----

    private StoreMember staff(Account owner, Long storeId, Long memberId) {
        Store s = access.requireOwner(owner, storeId);
        return members.findById(memberId)
                .filter(m -> m.getStore().getId().equals(s.getId()) && m.getRole() == Role.STAFF && m.getStatus() == MemberStatus.APPROVED)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "직원을 찾을 수 없어요"));
    }

    @GetMapping("/staff")
    @Transactional(readOnly = true)
    public List<Dto.StaffView> staffList(@RequestAttribute(AuthInterceptor.ACCOUNT) Account owner, @PathVariable Long storeId) {
        Store s = access.requireOwner(owner, storeId);
        return members.findByStoreAndStatusOrderByIdAsc(s, MemberStatus.APPROVED).stream()
                .filter(m -> m.getRole() == Role.STAFF)
                .map(this::view).toList();
    }

    @PutMapping("/staff/{memberId}/part")
    @Transactional
    public Dto.StaffView setPart(@RequestAttribute(AuthInterceptor.ACCOUNT) Account owner, @PathVariable Long storeId,
                                 @PathVariable Long memberId, @RequestBody Dto.WorkPartRequest r) {
        StoreMember m = staff(owner, storeId, memberId);
        m.setWorkPart(validWorkPart(r.workPart()));
        return view(m);
    }

    // 소속만 비활성화한다. 계정과 과거 근무·재고 이력은 삭제하지 않는다.
    @PostMapping("/staff/{memberId}/remove")
    @Transactional
    public void remove(@RequestAttribute(AuthInterceptor.ACCOUNT) Account owner, @PathVariable Long storeId,
                        @PathVariable Long memberId) {
        StoreMember m = staff(owner, storeId, memberId);
        if (sessions.findFirstByAccountAndStoreAndClockOutIsNull(m.getAccount(), m.getStore()).isPresent())
            throw new ApiException(HttpStatus.CONFLICT, "근무 중인 직원은 퇴근 처리 후 제거해주세요");
        m.setStatus(MemberStatus.REJECTED);
    }

    @PutMapping("/staff/{memberId}/wage")
    @Transactional
    public Dto.StaffView setWage(@RequestAttribute(AuthInterceptor.ACCOUNT) Account owner, @PathVariable Long storeId,
                                 @PathVariable Long memberId, @RequestBody Dto.WageRequest r) {
        StoreMember m = staff(owner, storeId, memberId);
        if (r.hourlyWage() == null || r.hourlyWage() <= 0 || r.hourlyWage() > MAX_WAGE)
            throw new ApiException(HttpStatus.BAD_REQUEST, "시급은 1원 이상 " + MAX_WAGE + "원 이하로 입력해주세요");
        LocalDate from;
        try { from = LocalDate.parse(r.effectiveFrom()); }
        catch (RuntimeException e) { throw new ApiException(HttpStatus.BAD_REQUEST, "적용 시작일을 YYYY-MM-DD 형식으로 입력해주세요"); }
        wages.schedule(m, owner, r.hourlyWage(), from);
        return view(m);
    }

    @GetMapping("/staff/{memberId}/wage-history")
    @Transactional(readOnly = true)
    public Dto.WageHistory wageHistory(@RequestAttribute(AuthInterceptor.ACCOUNT) Account owner, @PathVariable Long storeId, @PathVariable Long memberId) {
        return wages.history(staff(owner, storeId, memberId));
    }

    @GetMapping("/staff/{memberId}/work-records")
    @Transactional(readOnly = true)
    public List<Dto.WorkRecord> staffRecords(@RequestAttribute(AuthInterceptor.ACCOUNT) Account owner, @PathVariable Long storeId, @PathVariable Long memberId, @RequestParam String month) {
        StoreMember m = staff(owner, storeId, memberId);
        YearMonth ym = month(month);
        return sessions.findByAccountAndStoreAndClockInGreaterThanEqualAndClockInLessThanOrderByClockInAsc(
            m.getAccount(), m.getStore(), ym.atDay(1).atStartOfDay(), ym.plusMonths(1).atDay(1).atStartOfDay()).stream().map(WageService::view).toList();
    }

    @PutMapping("/staff/{memberId}/work-records/{sessionId}/wage")
    @Transactional
    public Dto.WorkRecord confirmLegacyWage(@RequestAttribute(AuthInterceptor.ACCOUNT) Account owner, @PathVariable Long storeId, @PathVariable Long memberId,
                                           @PathVariable Long sessionId, @RequestBody Dto.LegacyWageRequest r) {
        StoreMember m = staff(owner, storeId, memberId);
        var w = sessions.findLockedById(sessionId).filter(s -> s.getStore().getId().equals(storeId) && s.getAccount().getId().equals(m.getAccount().getId()))
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "근무 기록을 찾을 수 없어요"));
        if (w.getHourlyWage() != null) throw new ApiException(HttpStatus.CONFLICT, "이미 시급을 확정한 기록이에요");
        w.assignWage(WageService.validAmount(r.hourlyWage()), "CONFIRMED", owner);
        return WageService.view(w);
    }

    @GetMapping("/staff/{memberId}/shifts")
    @Transactional(readOnly = true)
    public List<Dto.Shift> staffShifts(@RequestAttribute(AuthInterceptor.ACCOUNT) Account owner, @PathVariable Long storeId,
                                       @PathVariable Long memberId, @RequestParam String month) {
        return shiftsOf(staff(owner, storeId, memberId), month);
    }

    // 날짜별 근무 일정을 저장한다. 같은 날짜는 덮어쓰고, start/end 가 모두 null 이면 그 날을 지운다.
    @PutMapping("/staff/{memberId}/shifts")
    @Transactional
    public List<Dto.Shift> setShifts(@RequestAttribute(AuthInterceptor.ACCOUNT) Account owner, @PathVariable Long storeId,
                                     @PathVariable Long memberId, @RequestBody Dto.ShiftsRequest r) {
        StoreMember m = staff(owner, storeId, memberId);
        if (r.shifts() == null || r.shifts().isEmpty()) throw new ApiException(HttpStatus.BAD_REQUEST, "저장할 근무 일정이 없어요");
        for (Dto.Shift x : r.shifts()) {
            LocalDate day;
            try {
                day = LocalDate.parse(x.date());
            } catch (RuntimeException e) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "날짜 형식이 올바르지 않아요");
            }
            var existing = shifts.findByMemberAndDay(m, day);
            if (x.start() == null && x.end() == null) {
                existing.ifPresent(shifts::delete);
                continue;
            }
            if (x.start() == null || x.end() == null || !TIME.matcher(x.start()).matches() || !TIME.matcher(x.end()).matches())
                throw new ApiException(HttpStatus.BAD_REQUEST, "근무 시간은 HH:mm 형식으로 입력해주세요");
            if (x.start().equals(x.end())) throw new ApiException(HttpStatus.BAD_REQUEST, "시작과 종료 시간이 같을 수 없어요");
            if (existing.isPresent()) existing.get().set(x.start(), x.end());
            else shifts.save(new WorkShift(m, day, x.start(), x.end()));
        }
        shifts.flush();
        YearMonth ym = YearMonth.from(LocalDate.parse(r.shifts().get(0).date()));
        return shiftsOf(m, ym.toString());
    }
}

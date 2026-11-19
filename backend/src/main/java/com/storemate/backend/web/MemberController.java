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

    public MemberController(StoreAccess access, StoreMemberRepository members, WorkShiftRepository shifts) {
        this.access = access;
        this.members = members;
        this.shifts = shifts;
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
        return new Dto.MeView(m.getHourlyWage(), m.getRequestedAt().toLocalDate().toString());
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
                .map(m -> new Dto.StaffView(m.getId(), m.getAccount().getName(), m.getHourlyWage())).toList();
    }

    @PutMapping("/staff/{memberId}/wage")
    @Transactional
    public Dto.StaffView setWage(@RequestAttribute(AuthInterceptor.ACCOUNT) Account owner, @PathVariable Long storeId,
                                 @PathVariable Long memberId, @RequestBody Dto.WageRequest r) {
        StoreMember m = staff(owner, storeId, memberId);
        if (r.hourlyWage() == null || r.hourlyWage() <= 0 || r.hourlyWage() > MAX_WAGE)
            throw new ApiException(HttpStatus.BAD_REQUEST, "시급은 1원 이상 " + MAX_WAGE + "원 이하로 입력해주세요");
        m.setHourlyWage(r.hourlyWage());
        return new Dto.StaffView(m.getId(), m.getAccount().getName(), m.getHourlyWage());
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

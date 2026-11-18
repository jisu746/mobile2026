// 출근·퇴근·근무 기록·근무 중 직원 API (출근 QR 은 매장 QR(초대 코드)과 같은 값)
package com.storemate.backend.web;

import com.storemate.backend.domain.Account;
import com.storemate.backend.domain.Role;
import com.storemate.backend.domain.Store;
import com.storemate.backend.domain.WorkSession;
import com.storemate.backend.repo.WorkSessionRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.List;

@RestController
@RequestMapping("/api/stores/{storeId}/work")
public class WorkController {
    private final StoreAccess access;
    private final WorkSessionRepository sessions;
    private final Notifier notifier;
    private final boolean anyQr;

    public WorkController(StoreAccess access, WorkSessionRepository sessions, Notifier notifier,
                          @Value("${storemate.dev.any-qr:false}") boolean anyQr) {
        this.access = access;
        this.sessions = sessions;
        this.notifier = notifier;
        this.anyQr = anyQr;
    }

    private Dto.WorkStatus status(Account a, Store s) {
        return new Dto.WorkStatus(sessions.findFirstByAccountAndStoreAndClockOutIsNull(a, s)
                .map(w -> w.getClockIn().toString()).orElse(null));
    }

    @GetMapping("/current")
    @Transactional(readOnly = true)
    public Dto.WorkStatus current(@RequestAttribute(AuthInterceptor.ACCOUNT) Account account, @PathVariable Long storeId) {
        return status(account, access.requireMember(account, storeId));
    }

    @PostMapping("/clock-in")
    @Transactional
    public Dto.WorkStatus clockIn(@RequestAttribute(AuthInterceptor.ACCOUNT) Account account, @PathVariable Long storeId,
                                  @RequestBody Dto.ClockInRequest r) {
        Store s = access.requireMember(account, storeId);
        if (account.getRole() != Role.STAFF) throw new ApiException(HttpStatus.FORBIDDEN, "직원만 출근할 수 있어요");
        if (!anyQr && (r.code() == null || !s.getInviteCode().equalsIgnoreCase(r.code().trim())))
            throw new ApiException(HttpStatus.BAD_REQUEST, "이 매장의 출근 QR이 아니에요");
        // 이미 출근 중이면 그대로 돌려준다
        if (sessions.findFirstByAccountAndStoreAndClockOutIsNull(account, s).isEmpty()) {
            WorkSession w = sessions.save(new WorkSession(account, s));
            notifier.send(s, Role.OWNER, account, "clockin", account.getName() + " 님이 출근했어요", w.getClockIn().toLocalTime().toString().substring(0, 5));
        }
        return status(account, s);
    }

    // 지금 근무 중인 사람들 (사장님 홈의 근무 현황)
    @GetMapping("/active")
    @Transactional(readOnly = true)
    public List<Dto.ActiveStaff> active(@RequestAttribute(AuthInterceptor.ACCOUNT) Account account, @PathVariable Long storeId) {
        return sessions.findByStoreAndClockOutIsNullOrderByClockInAsc(access.requireMember(account, storeId)).stream()
                .map(w -> new Dto.ActiveStaff(w.getAccount().getName(), w.getClockIn().toString())).toList();
    }

    @PostMapping("/clock-out")
    @Transactional
    public Dto.WorkStatus clockOut(@RequestAttribute(AuthInterceptor.ACCOUNT) Account account, @PathVariable Long storeId) {
        Store s = access.requireMember(account, storeId);
        WorkSession w = sessions.findFirstByAccountAndStoreAndClockOutIsNull(account, s)
                .orElseThrow(() -> new ApiException(HttpStatus.CONFLICT, "출근 기록이 없어요"));
        w.clockOut();
        return new Dto.WorkStatus(null);
    }

    // month = yyyy-MM. 출근한 날이 그 달인 기록을 돌려준다
    @GetMapping("/records")
    @Transactional(readOnly = true)
    public List<Dto.WorkRecord> records(@RequestAttribute(AuthInterceptor.ACCOUNT) Account account, @PathVariable Long storeId,
                                        @RequestParam String month) {
        Store s = access.requireMember(account, storeId);
        YearMonth ym;
        try {
            ym = YearMonth.parse(month);
        } catch (DateTimeParseException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "월 형식이 올바르지 않아요");
        }
        return sessions.findByAccountAndStoreAndClockInGreaterThanEqualAndClockInLessThanOrderByClockInAsc(
                        account, s, ym.atDay(1).atStartOfDay(), ym.plusMonths(1).atDay(1).atStartOfDay()).stream()
                .map(w -> new Dto.WorkRecord(w.getClockIn().toString(), w.getClockOut() == null ? null : w.getClockOut().toString()))
                .toList();
    }
}

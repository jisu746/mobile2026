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
import java.util.List;

@RestController
@RequestMapping("/api/stores/{storeId}/work")
public class WorkController {
    @org.springframework.beans.factory.annotation.Autowired private com.storemate.backend.repo.AccountRepository accounts;
    private final StoreAccess access;
    private final WorkSessionRepository sessions;
    private final Notifier notifier;
    private final boolean anyQr;
    private final WageService wages;

    public WorkController(StoreAccess access, WorkSessionRepository sessions, Notifier notifier,
                          @Value("${storemate.dev.any-qr:false}") boolean anyQr, WageService wages) {
        this.access = access;
        this.sessions = sessions;
        this.notifier = notifier;
        this.anyQr = anyQr;
        this.wages = wages;
    }

    private Dto.WorkStatus status(Account a, Store s) {
        String clockedAt = sessions.findFirstByAccountAndStoreAndClockOutIsNull(a, s).map(w -> w.getClockIn().toString()).orElse(null);
        String elsewhere = sessions.findFirstByAccountAndClockOutIsNull(a)
                .filter(w -> !w.getStore().getId().equals(s.getId())).map(w -> w.getStore().getName()).orElse(null);
        return new Dto.WorkStatus(clockedAt, elsewhere);
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
        if(accounts!=null)accounts.findLockedByUsername(account.getUsername()).orElseThrow(()->new ApiException(HttpStatus.UNAUTHORIZED,"로그인을 다시 해주세요"));
        Store s = access.requireMember(account, storeId);
        if (account.getRole() != Role.STAFF) throw new ApiException(HttpStatus.FORBIDDEN, "직원만 출근할 수 있어요");
        StoreDetailsController.checkLocation(s,r);
        if (!anyQr && (r.code() == null || !s.getInviteCode().equalsIgnoreCase(r.code().trim())))
            throw new ApiException(HttpStatus.BAD_REQUEST, "이 매장의 출근 QR이 아니에요");
        // 다른 매장에서 근무 중이면 출근할 수 없다 (같은 매장에서 이미 출근 중이면 아래에서 그대로 돌려준다)
        sessions.findFirstByAccountAndClockOutIsNull(account).ifPresent(w -> {
            if (!w.getStore().getId().equals(s.getId()))
                throw new ApiException(HttpStatus.CONFLICT, "'" + w.getStore().getName() + "'에서 근무 중이에요. 그곳에서 퇴근한 뒤 출근해 주세요");
        });
        if (sessions.findFirstByAccountAndStoreAndClockOutIsNull(account, s).isEmpty()) {
            WorkSession w = new WorkSession(account, s);
            var rate = wages.forNewSession(access.requireApproved(account, storeId), w.getClockIn().toLocalDate());
            w.assignWage(rate.amount(), rate.defaultRate() ? "DEFAULT" : "SNAPSHOT", null);
            sessions.save(w);
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
        WorkSession candidate = sessions.findFirstByAccountAndStoreAndClockOutIsNull(account, s)
                .orElseThrow(() -> new ApiException(HttpStatus.CONFLICT, "출근 기록이 없어요"));
        WorkSession w = sessions.findLockedById(candidate.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.CONFLICT, "출근 기록이 없어요"));
        if (w.getClockOut() != null) throw new ApiException(HttpStatus.CONFLICT, "이미 퇴근 처리된 기록이에요");
        w.clockOut();
        return status(account, s);
    }

    // month = yyyy-MM. 출근한 날이 그 달인 기록을 돌려준다
    @GetMapping("/records")
    @Transactional(readOnly = true)
    public List<Dto.WorkRecord> records(@RequestAttribute(AuthInterceptor.ACCOUNT) Account account, @PathVariable Long storeId,
                                        @RequestParam String month) {
        Store s = access.requireMember(account, storeId);
        YearMonth ym = MemberController.month(month);
        return sessions.findByAccountAndStoreAndClockInGreaterThanEqualAndClockInLessThanOrderByClockInAsc(
                        account, s, ym.atDay(1).atStartOfDay(), ym.plusMonths(1).atDay(1).atStartOfDay()).stream()
                .map(WageService::view)
                .toList();
    }
}

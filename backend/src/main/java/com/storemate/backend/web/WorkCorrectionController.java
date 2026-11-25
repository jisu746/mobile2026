package com.storemate.backend.web;

import com.storemate.backend.domain.*;
import com.storemate.backend.repo.*;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.ResolverStyle;

@RestController
@RequestMapping("/api/stores/{storeId}/staff/{memberId}/work-records")
public class WorkCorrectionController {
    private final StoreAccess access;
    private final StoreMemberRepository members;
    private final WorkSessionRepository sessions;
    public WorkCorrectionController(StoreAccess access, StoreMemberRepository members, WorkSessionRepository sessions) {
        this.access=access; this.members=members; this.sessions=sessions;
    }
    public record CloseRequest(String clockOut, String reason) {}

    @PutMapping("/{sessionId}/close")
    @Transactional
    public Dto.WorkRecord close(@RequestAttribute(AuthInterceptor.ACCOUNT) Account owner,
            @PathVariable Long storeId, @PathVariable Long memberId, @PathVariable Long sessionId,
            @RequestBody CloseRequest request) {
        Store store=access.requireOwner(owner,storeId);
        StoreMember member=members.findById(memberId)
            .filter(m->m.getStore().getId().equals(store.getId()) && m.getRole()==Role.STAFF && m.getStatus()==MemberStatus.APPROVED)
            .orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"직원을 찾을 수 없어요"));
        WorkSession session=sessions.findLockedById(sessionId)
            .filter(w->w.getStore().getId().equals(storeId) && w.getAccount().getId().equals(member.getAccount().getId()))
            .orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"근무 기록을 찾을 수 없어요"));
        if(session.getClockOut()!=null)throw new ApiException(HttpStatus.CONFLICT,"이미 퇴근 처리된 기록이에요. 새로고침해 주세요");
        LocalDateTime end;
        try {
            end=LocalDateTime.parse(request.clockOut(),DateTimeFormatter.ofPattern("uuuu-MM-dd'T'HH:mm:ss").withResolverStyle(ResolverStyle.STRICT));
        }catch(RuntimeException e){throw new ApiException(HttpStatus.BAD_REQUEST,"퇴근 날짜와 시각을 정확히 입력해주세요");}
        if(!end.isAfter(session.getClockIn()) || end.isAfter(LocalDateTime.now().withNano(0)))
            throw new ApiException(HttpStatus.BAD_REQUEST,"퇴근 시각은 출근 이후부터 현재 시각까지 입력해주세요");
        String reason=request.reason()==null?"":request.reason().trim();
        if(reason.isEmpty() || reason.length()>300)throw new ApiException(HttpStatus.BAD_REQUEST,"처리 사유를 1~300자로 입력해주세요");
        session.correctMissingClockOut(end,owner,reason);
        return WageService.view(session);
    }
}

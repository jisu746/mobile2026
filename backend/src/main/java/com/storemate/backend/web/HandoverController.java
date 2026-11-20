// 인수인계 메모 API (최근 20개 조회, 작성, 긴급 확인 완료)
package com.storemate.backend.web;

import com.storemate.backend.domain.Account;
import com.storemate.backend.domain.Handover;
import com.storemate.backend.domain.Role;
import com.storemate.backend.domain.Store;
import com.storemate.backend.repo.HandoverRepository;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/stores/{storeId}/handovers")
public class HandoverController {
    private final StoreAccess access;
    private final HandoverRepository handovers;
    private final Notifier notifier;

    public HandoverController(StoreAccess access, HandoverRepository handovers, Notifier notifier) {
        this.access = access;
        this.handovers = handovers;
        this.notifier = notifier;
    }

    private static Dto.HandoverView view(Handover h, Account me) {
        return new Dto.HandoverView(h.getId(), h.getAuthor().getName(), h.getAuthor().getId().equals(me.getId()),
                h.getContent(), h.isUrgent(), h.isResolved(), h.getCreatedAt().toString());
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<Dto.HandoverView> list(@RequestAttribute(AuthInterceptor.ACCOUNT) Account account, @PathVariable Long storeId) {
        return handovers.findTop20ByStoreOrderByIdDesc(access.requireMember(account, storeId)).stream().map(h -> view(h, account)).toList();
    }

    @PostMapping
    @Transactional
    public Dto.HandoverView create(@RequestAttribute(AuthInterceptor.ACCOUNT) Account account, @PathVariable Long storeId,
                                   @RequestBody Dto.HandoverRequest r) {
        Store s = access.requireMember(account, storeId);
        String text = r.content() == null ? "" : r.content().trim();
        if (text.isEmpty()) throw new ApiException(HttpStatus.BAD_REQUEST, "내용을 입력해주세요");
        if (text.length() > 500) throw new ApiException(HttpStatus.BAD_REQUEST, "내용은 500자까지 쓸 수 있어요");
        Handover h = handovers.save(new Handover(s, account, text, r.urgent()));
        notifier.send(s, Role.STAFF, account, "handover", account.getName() + " 님이 " + (r.urgent() ? "긴급 " : "") + "인수인계를 남겼어요",
                text.length() > 60 ? text.substring(0, 60) + "..." : text);
        return view(h, account);
    }

    // 긴급 인수인계 확인 완료 표시 (다시 눌러 되돌릴 수 있다)
    @PostMapping("/{id}/resolve")
    @Transactional
    public Dto.HandoverView resolve(@RequestAttribute(AuthInterceptor.ACCOUNT) Account account, @PathVariable Long storeId,
                                    @PathVariable Long id, @RequestBody Dto.ResolveRequest r) {
        Store s = access.requireMember(account, storeId);
        Handover h = handovers.findById(id).filter(x -> x.getStore().getId().equals(s.getId()))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "인수인계를 찾을 수 없어요"));
        h.setResolved(r.done());
        return view(h, account);
    }
}

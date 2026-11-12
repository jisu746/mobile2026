package com.storemate.backend.web;

import com.storemate.backend.domain.*;
import com.storemate.backend.repo.StoreMemberRepository;
import com.storemate.backend.repo.StoreRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.util.List;

@RestController
@RequestMapping("/api")
public class StoreController {
    private final StoreRepository stores;
    private final StoreMemberRepository members;
    private final SecureRandom random = new SecureRandom();
    private final boolean autoApprove;
    private final ProductSeeder seeder;

    public StoreController(StoreRepository stores, StoreMemberRepository members,
                           ProductSeeder seeder, @Value("${storemate.dev.auto-approve:false}") boolean autoApprove) {
        this.stores = stores;
        this.members = members;
        this.autoApprove = autoApprove;
        this.seeder = seeder;
    }

    // 초대 코드: 영문 대문자 3자 + 숫자 4자 (예: DLB-4821), 겹치면 다시 뽑는다
    private String newInviteCode() {
        for (int i = 0; i < 50; i++) {
            StringBuilder sb = new StringBuilder();
            for (int j = 0; j < 3; j++) sb.append((char) ('A' + random.nextInt(26)));
            sb.append('-').append(1000 + random.nextInt(9000));
            if (!stores.existsByInviteCode(sb.toString())) return sb.toString();
        }
        throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "초대 코드를 만들지 못했어요");
    }

    private static String clean(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    @PostMapping("/stores")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    Dto.StoreView create(@RequestAttribute(AuthInterceptor.ACCOUNT) Account account, @RequestBody Dto.CreateStoreRequest r) {
        if (account.getRole() != Role.OWNER) throw new ApiException(HttpStatus.FORBIDDEN, "사장님만 매장을 등록할 수 있어요");
        if (clean(r.name()) == null) throw new ApiException(HttpStatus.BAD_REQUEST, "매장 이름을 입력해주세요");
        if (clean(r.address()) == null) throw new ApiException(HttpStatus.BAD_REQUEST, "매장 주소를 입력해주세요");
        Store s = stores.save(new Store(clean(r.name()), clean(r.type()), clean(r.branch()), clean(r.address()),
                clean(r.addressDetail()), clean(r.openTime()), clean(r.closeTime()), newInviteCode(), account));
        members.save(new StoreMember(account, s, Role.OWNER, MemberStatus.APPROVED));
        seeder.seed(s);
        return AccountViews.store(s, true);
    }

    // 초대 코드(또는 QR)로 매장을 찾는다. 참여 요청 전에 어떤 매장인지 보여주는 용도
    @GetMapping("/stores/lookup")
    Dto.StoreSummary lookup(@RequestParam String code) {
        Store s = stores.findByInviteCode(code.trim().toUpperCase())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "초대 코드에 해당하는 매장이 없어요"));
        return new Dto.StoreSummary(s.getName(), s.getType(), s.getBranch(), s.getOwner().getName());
    }

    @PostMapping("/stores/join")
    @Transactional
    Dto.JoinResponse join(@RequestAttribute(AuthInterceptor.ACCOUNT) Account account, @RequestBody Dto.JoinRequest r) {
        if (account.getRole() != Role.STAFF) throw new ApiException(HttpStatus.FORBIDDEN, "직원만 매장에 참여할 수 있어요");
        Store s = stores.findByInviteCode(r.code() == null ? "" : r.code().trim().toUpperCase())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "초대 코드에 해당하는 매장이 없어요"));
        StoreMember m = members.findByAccountAndStore(account, s).orElse(null);
        if (m == null) {
            m = members.save(new StoreMember(account, s, Role.STAFF, autoApprove ? MemberStatus.APPROVED : MemberStatus.PENDING));
        } else if (m.getStatus() == MemberStatus.APPROVED) {
            throw new ApiException(HttpStatus.CONFLICT, "이미 참여 중인 매장이에요");
        } else if (m.getStatus() == MemberStatus.REJECTED) {
            m.setStatus(autoApprove ? MemberStatus.APPROVED : MemberStatus.PENDING); // 거절됐던 요청은 다시 보낼 수 있다
        }
        return new Dto.JoinResponse(m.getStatus().name().toLowerCase());
    }

    // ---- 사장님: 참여 요청 목록과 승인/거절 (앱 화면은 아직 없음) ----

    private Store ownedStore(Account account, Long storeId) {
        Store s = stores.findById(storeId).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "매장을 찾을 수 없어요"));
        if (!s.getOwner().getId().equals(account.getId())) throw new ApiException(HttpStatus.FORBIDDEN, "내 매장이 아니에요");
        return s;
    }

    @GetMapping("/stores/{id}/requests")
    @Transactional(readOnly = true)
    List<Dto.MemberRequestView> requests(@RequestAttribute(AuthInterceptor.ACCOUNT) Account account, @PathVariable Long id) {
        Store s = ownedStore(account, id);
        return members.findByStoreAndStatusOrderByIdAsc(s, MemberStatus.PENDING).stream()
                .map(m -> new Dto.MemberRequestView(m.getId(), m.getAccount().getUsername(), m.getAccount().getName(),
                        m.getRequestedAt().toString()))
                .toList();
    }

    @PostMapping("/members/{id}/{decision}")
    @Transactional
    Dto.JoinResponse decide(@RequestAttribute(AuthInterceptor.ACCOUNT) Account account, @PathVariable Long id, @PathVariable String decision) {
        StoreMember m = members.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "요청을 찾을 수 없어요"));
        ownedStore(account, m.getStore().getId());
        if ("approve".equals(decision)) m.setStatus(MemberStatus.APPROVED);
        else if ("reject".equals(decision)) m.setStatus(MemberStatus.REJECTED);
        else throw new ApiException(HttpStatus.BAD_REQUEST, "처리 방식이 올바르지 않아요");
        return new Dto.JoinResponse(m.getStatus().name().toLowerCase());
    }
}

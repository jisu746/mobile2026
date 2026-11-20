// 계정과 소속 매장 목록을 앱이 쓰는 응답 모양으로 만드는 도우미
package com.storemate.backend.web;

import com.storemate.backend.domain.*;
import com.storemate.backend.repo.StoreMemberRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Component
public class AccountViews {
    private final StoreMemberRepository members;

    public AccountViews(StoreMemberRepository members) {
        this.members = members;
    }

    @Transactional(readOnly = true)
    public Dto.AccountView of(Account a) {
        List<Dto.StoreView> stores = new ArrayList<>();
        Dto.StoreView pending = null;
        for (StoreMember m : members.findByAccountOrderByIdAsc(a)) {
            Dto.StoreView v = store(m.getStore(), m.getRole() == Role.OWNER);
            if (m.getStatus() == MemberStatus.APPROVED) stores.add(v);
            else if (m.getStatus() == MemberStatus.PENDING) pending = v;
        }
        return new Dto.AccountView(a.getUsername(), a.getRole().name().toLowerCase(), a.getName(), a.getBirth(), stores, pending);
    }

    public static Dto.StoreView store(Store s, boolean showInviteCode) {
        return new Dto.StoreView(s.getId(), s.getName(), s.getType(), s.getBranch(), s.getAddress(),
                showInviteCode ? s.getInviteCode() : null);
    }
}

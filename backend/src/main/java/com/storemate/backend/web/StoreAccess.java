// 내가 이 매장의 승인된 구성원인지 확인하는 공통 도우미
package com.storemate.backend.web;

import com.storemate.backend.domain.Account;
import com.storemate.backend.domain.MemberStatus;
import com.storemate.backend.domain.Store;
import com.storemate.backend.repo.StoreMemberRepository;
import com.storemate.backend.repo.StoreRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class StoreAccess {
    private final StoreRepository stores;
    private final StoreMemberRepository members;

    public StoreAccess(StoreRepository stores, StoreMemberRepository members) {
        this.stores = stores;
        this.members = members;
    }

    public Store requireMember(Account account, Long storeId) {
        Store s = stores.findById(storeId).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "매장을 찾을 수 없어요"));
        boolean ok = members.findByAccountAndStore(account, s).map(m -> m.getStatus() == MemberStatus.APPROVED).orElse(false);
        if (!ok) throw new ApiException(HttpStatus.FORBIDDEN, "이 매장에 참여하지 않았어요");
        return s;
    }
}

// 내가 이 매장의 승인된 구성원(또는 사장님)인지 확인하는 공통 도우미
package com.storemate.backend.web;

import com.storemate.backend.domain.Account;
import com.storemate.backend.domain.MemberStatus;
import com.storemate.backend.domain.Store;
import com.storemate.backend.domain.StoreMember;
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

    private Store store(Long storeId) {
        return stores.findById(storeId).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "매장을 찾을 수 없어요"));
    }

    private StoreMember approved(Account account, Store s) {
        return members.findByAccountAndStore(account, s).filter(m -> m.getStatus() == MemberStatus.APPROVED)
                .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "이 매장에 참여하지 않았어요"));
    }

    // 이 매장의 승인된 소속 정보 (시급 같은 내 소속 설정을 읽을 때)
    public StoreMember requireApproved(Account account, Long storeId) {
        return approved(account, store(storeId));
    }

    public Store requireMember(Account account, Long storeId) {
        Store s = store(storeId);
        approved(account, s);
        return s;
    }

    // 직원 시급·근무 일정처럼 사장님만 바꾸는 일
    public Store requireOwner(Account account, Long storeId) {
        Store s = requireMember(account, storeId);
        if (!s.getOwner().getId().equals(account.getId())) throw new ApiException(HttpStatus.FORBIDDEN, "내 매장이 아니에요");
        return s;
    }
}

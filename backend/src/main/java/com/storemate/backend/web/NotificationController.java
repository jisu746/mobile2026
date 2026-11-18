// 내 알림 조회·읽음 처리 API (최근 30일, 내가 일으킨 알림은 제외)
package com.storemate.backend.web;

import com.storemate.backend.domain.Account;
import com.storemate.backend.domain.Notification;
import com.storemate.backend.domain.NotificationRead;
import com.storemate.backend.domain.Store;
import com.storemate.backend.repo.NotificationReadRepository;
import com.storemate.backend.repo.NotificationRepository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/stores/{storeId}/notifications")
public class NotificationController {
    private final StoreAccess access;
    private final NotificationRepository notifications;
    private final NotificationReadRepository reads;

    public NotificationController(StoreAccess access, NotificationRepository notifications, NotificationReadRepository reads) {
        this.access = access;
        this.notifications = notifications;
        this.reads = reads;
    }

    private List<Notification> mine(Account account, Store s) {
        return notifications.findByStoreAndAudienceAndCreatedAtAfterOrderByIdDesc(s, account.getRole(), LocalDateTime.now().minusDays(30))
                .stream().filter(n -> !account.getId().equals(n.getActorId())).toList();
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<Dto.NotificationView> list(@RequestAttribute(AuthInterceptor.ACCOUNT) Account account, @PathVariable Long storeId) {
        List<Notification> list = mine(account, access.requireMember(account, storeId));
        Set<Long> read = reads.findByAccountIdAndNotificationIdIn(account.getId(), list.stream().map(Notification::getId).toList())
                .stream().map(NotificationRead::getNotificationId).collect(Collectors.toSet());
        return list.stream().map(n -> new Dto.NotificationView(n.getId(), n.getKind(), n.getTitle(), n.getSub(),
                n.getCreatedAt().toString(), read.contains(n.getId()))).toList();
    }

    // 읽음 표시. 내게 온 알림만 처리한다
    @PostMapping("/read")
    @Transactional
    public void read(@RequestAttribute(AuthInterceptor.ACCOUNT) Account account, @PathVariable Long storeId, @RequestBody Dto.ReadRequest r) {
        List<Notification> list = mine(account, access.requireMember(account, storeId));
        Set<Long> ask = r.ids() == null ? Set.of() : Set.copyOf(r.ids());
        Set<Long> already = reads.findByAccountIdAndNotificationIdIn(account.getId(), list.stream().map(Notification::getId).toList())
                .stream().map(NotificationRead::getNotificationId).collect(Collectors.toSet());
        for (Notification n : list)
            if (ask.contains(n.getId()) && !already.contains(n.getId())) reads.save(new NotificationRead(account.getId(), n.getId()));
    }
}

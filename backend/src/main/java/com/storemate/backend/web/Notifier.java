// 매장에서 일어난 일을 알림으로 저장하는 도우미
package com.storemate.backend.web;

import com.storemate.backend.domain.Account;
import com.storemate.backend.domain.Notification;
import com.storemate.backend.domain.Role;
import com.storemate.backend.domain.Store;
import com.storemate.backend.repo.NotificationRepository;
import org.springframework.stereotype.Component;

@Component
public class Notifier {
    private final NotificationRepository notifications;

    public Notifier(NotificationRepository notifications) {
        this.notifications = notifications;
    }

    public void send(Store store, Role audience, Account actor, String kind, String title, String sub) {
        notifications.save(new Notification(store, audience, actor.getId(), kind, title, sub));
    }
}

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
    private final NotificationRepository notifications;private final PushQueue push;

    public Notifier(NotificationRepository notifications,PushQueue push) {
        this.notifications = notifications;this.push=push;
    }

    public void system(Store store,Role audience,String kind,String title,String sub){var n=notifications.save(new Notification(store,audience,null,kind,title.substring(0,Math.min(100,title.length())),sub));push.enqueue(n,store,audience,null);}
    public void send(Store store, Role audience, Account actor, String kind, String title, String sub) {
        var notification=notifications.save(new Notification(store, audience, actor.getId(), kind, title, sub));
        push.enqueue(notification,store,audience,actor);
    }
    public void targeted(Store store,Role audience,Account actor,String kind,String title,String sub,Long targetId){var n=new Notification(store,audience,actor.getId(),kind,title,sub);n.target(targetId);n=notifications.save(n);push.enqueue(n,store,audience,actor);}
}

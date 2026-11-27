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
    // 직원의 발주 요청을 사장님에게 알린다. 같은 상품을 오늘 이미 요청했으면 만들지 않고 false
    public boolean orderRequest(Store store, Account actor, String barcode, String productName, int stock) {
        if (notifications.existsByStoreAndKindAndTargetBarcodeAndCreatedAtGreaterThanEqual(store, "order-request", barcode, java.time.LocalDate.now().atStartOfDay())) return false;
        String title = "발주 요청 · " + productName;
        var n = new Notification(store, Role.OWNER, actor.getId(), "order-request", title.substring(0, Math.min(100, title.length())), actor.getName() + " · 현재 재고 " + stock + "개");
        n.targetProduct(barcode);
        n = notifications.save(n);
        push.enqueue(n, store, Role.OWNER, actor);
        return true;
    }
    public void targeted(Store store,Role audience,Account actor,String kind,String title,String sub,Long targetId){var n=new Notification(store,audience,actor.getId(),kind,title,sub);n.target(targetId);n=notifications.save(n);push.enqueue(n,store,audience,actor);}
}

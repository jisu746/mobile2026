// 매장 알림 테이블 - audience 역할에게 보이고, 일으킨 사람 본인에게는 보이지 않는다
package com.storemate.backend.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Store store;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Role audience;

    private Long actorId;

    @Column(nullable = false, length = 20)
    private String kind;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(length = 200)
    private String sub;

    private LocalDateTime createdAt = LocalDateTime.now().withNano(0);
    private Long targetId;
    public Long getTargetId(){return targetId;}public void target(Long id){targetId=id;}
    // 알림이 가리키는 상품 (발주 요청처럼 누르면 그 상품으로 이동하는 알림)
    @Column(length = 20)
    private String targetBarcode;
    public String getTargetBarcode(){return targetBarcode;}public void targetProduct(String barcode){targetBarcode=barcode;}

    protected Notification() {
    }

    public Notification(Store store, Role audience, Long actorId, String kind, String title, String sub) {
        this.store = store;
        this.audience = audience;
        this.actorId = actorId;
        this.kind = kind;
        this.title = title;
        this.sub = sub;
    }

    public Store getStore(){return store;} public Role getAudience(){return audience;}
    public Long getId() { return id; }
    public Long getActorId() { return actorId; }
    public String getKind() { return kind; }
    public String getTitle() { return title; }
    public String getSub() { return sub; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}

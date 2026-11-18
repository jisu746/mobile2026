// 인수인계 메모 테이블 (urgent = 긴급 메모, resolved = 확인 완료)
package com.storemate.backend.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "handovers")
public class Handover {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Store store;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Account author;

    @Column(nullable = false, length = 500)
    private String content;

    private boolean urgent;
    private boolean resolved;
    private LocalDateTime createdAt = LocalDateTime.now().withNano(0);

    protected Handover() {
    }

    public Handover(Store store, Account author, String content, boolean urgent) {
        this.store = store;
        this.author = author;
        this.content = content;
        this.urgent = urgent;
    }

    public Long getId() { return id; }
    public Store getStore() { return store; }
    public Account getAuthor() { return author; }
    public String getContent() { return content; }
    public boolean isUrgent() { return urgent; }
    public boolean isResolved() { return resolved; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setResolved(boolean resolved) { this.resolved = resolved; }
}

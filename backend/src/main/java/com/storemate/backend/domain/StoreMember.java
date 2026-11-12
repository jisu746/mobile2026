package com.storemate.backend.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;

// 계정이 어느 매장에 어떤 역할로 속하는지 (직원은 사장님 승인 전까지 PENDING)
@Entity
@Table(name = "store_members", uniqueConstraints = @UniqueConstraint(columnNames = {"account_id", "store_id"}))
public class StoreMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Account account;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Store store;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private MemberStatus status;

    private LocalDateTime requestedAt = LocalDateTime.now();

    protected StoreMember() {
    }

    public StoreMember(Account account, Store store, Role role, MemberStatus status) {
        this.account = account;
        this.store = store;
        this.role = role;
        this.status = status;
    }

    public Long getId() { return id; }
    public Account getAccount() { return account; }
    public Store getStore() { return store; }
    public Role getRole() { return role; }
    public MemberStatus getStatus() { return status; }
    public LocalDateTime getRequestedAt() { return requestedAt; }
    public void setStatus(MemberStatus status) { this.status = status; }
}

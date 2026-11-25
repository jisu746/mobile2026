// 계정과 매장의 소속 테이블 (직원은 사장님 승인 전까지 PENDING)
package com.storemate.backend.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;

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

    // 사장님이 정하는 시급 (정하기 전에는 null)
    private Integer hourlyWage;

    @Column(length = 30)
    private String workPart;
    private Boolean deleteProducts;
    private Boolean adjustStock;
    private Boolean saveOrderPlans;
    private Long permissionsRevision;
    private LocalDateTime permissionsUpdatedAt;
    @ManyToOne(fetch=FetchType.LAZY) private Account permissionsUpdatedBy;
    public boolean canDeleteProducts(){return Boolean.TRUE.equals(deleteProducts);}
    public boolean canAdjustStock(){return Boolean.TRUE.equals(adjustStock);}
    public boolean canSaveOrderPlans(){return Boolean.TRUE.equals(saveOrderPlans);}
    public long getPermissionsRevision(){return permissionsRevision==null?0:permissionsRevision;}
    public LocalDateTime getPermissionsUpdatedAt(){return permissionsUpdatedAt;}
    public String getPermissionsUpdatedBy(){return permissionsUpdatedBy==null?null:permissionsUpdatedBy.getName();}
    public void permissions(boolean delete,boolean adjust,boolean plans,Account actor){deleteProducts=delete;adjustStock=adjust;saveOrderPlans=plans;permissionsRevision=getPermissionsRevision()+1;permissionsUpdatedAt=LocalDateTime.now().withNano(0);permissionsUpdatedBy=actor;}
    @Column(length=30) private String displayName;
    @Column(length=30) private String contactPhone;
    public String getDisplayName(){return displayName==null?account.getName():displayName;}public String getContactPhone(){return contactPhone;}
    public void contact(String name,String phone){displayName=name;contactPhone=phone;}

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
    public Integer getHourlyWage() { return hourlyWage; }
    public String getWorkPart() { return workPart; }
    public void setWorkPart(String workPart) { this.workPart = workPart; }
    public void setStatus(MemberStatus status) { this.status = status; }
    public void setHourlyWage(Integer hourlyWage) { this.hourlyWage = hourlyWage; }
}

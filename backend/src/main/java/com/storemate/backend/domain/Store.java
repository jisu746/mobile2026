// 매장 테이블 (이름, 주소, 영업시간, 초대 코드)
package com.storemate.backend.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "stores")
public class Store {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(length = 20)
    private String type;

    @Column(length = 50)
    private String branch;

    private String address;
    private String addressDetail;

    @Column(length = 5)
    private String openTime;

    @Column(length = 5)
    private String closeTime;

    @Column(nullable = false, unique = true, length = 10)
    private String inviteCode;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Account owner;

    private LocalDateTime createdAt = LocalDateTime.now();
    private Double latitude,longitude;
    private Integer attendanceRadius;
    private Long detailRevision;
    public Double getLatitude(){return latitude;}public Double getLongitude(){return longitude;}public int getAttendanceRadius(){return attendanceRadius==null?0:attendanceRadius;}public long getDetailRevision(){return detailRevision==null?0:detailRevision;}
    public void details(String name,String type,String branch,String address,String addressDetail,String open,String close,Double lat,Double lng,int radius){this.name=name;this.type=type;this.branch=branch;this.address=address;this.addressDetail=addressDetail;openTime=open;closeTime=close;latitude=lat;longitude=lng;attendanceRadius=radius;detailRevision=getDetailRevision()+1;}

    protected Store() {
    }

    public Store(String name, String type, String branch, String address, String addressDetail,
                 String openTime, String closeTime, String inviteCode, Account owner) {
        this.name = name;
        this.type = type;
        this.branch = branch;
        this.address = address;
        this.addressDetail = addressDetail;
        this.openTime = openTime;
        this.closeTime = closeTime;
        this.inviteCode = inviteCode;
        this.owner = owner;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public void rename(String name) { this.name=name; }
    public String getType() { return type; }
    public String getBranch() { return branch; }
    public String getAddress() { return address; }
    public String getAddressDetail() { return addressDetail; }
    public String getOpenTime() { return openTime; }
    public String getCloseTime() { return closeTime; }
    public String getInviteCode() { return inviteCode; }
    public Account getOwner() { return owner; }
}

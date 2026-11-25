package com.storemate.backend.domain;
import jakarta.persistence.*;import java.time.*;
@Entity @Table(name="order_deliveries",uniqueConstraints=@UniqueConstraint(columnNames={"plan_id","client_key"}))
public class OrderDelivery {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) private OrderPlan plan;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) private Account actor;
 @Column(name="client_key",length=80,nullable=false) private String clientKey;
 @Column(length=64,nullable=false) private String fingerprint;
 @Lob private String itemsJson;
 private LocalDateTime createdAt=LocalDateTime.now().withNano(0);
 protected OrderDelivery(){}public OrderDelivery(OrderPlan p,Account a,String key,String hash,String json){plan=p;actor=a;clientKey=key;fingerprint=hash;itemsJson=json;}
 public Long getId(){return id;}public Long getActorId(){return actor.getId();}public String getActor(){return actor.getName();}public String getFingerprint(){return fingerprint;}public String getItemsJson(){return itemsJson;}public LocalDateTime getCreatedAt(){return createdAt;}
}

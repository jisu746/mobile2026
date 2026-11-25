package com.storemate.backend.domain;
import jakarta.persistence.*;import java.time.*;
@Entity @Table(name="stocktake_operations",uniqueConstraints=@UniqueConstraint(columnNames={"store_id","client_key"}))
public class StocktakeOperation {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) private Store store;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) private Account actor;
 @Column(name="client_key",length=80,nullable=false) private String clientKey;
 @Column(length=64,nullable=false) private String fingerprint;
 @Column(length=300) private String reason;
 @Lob private String linesJson;
 private LocalDateTime createdAt=LocalDateTime.now().withNano(0);
 protected StocktakeOperation(){}public StocktakeOperation(Store s,Account a,String key,String hash,String reason,String json){store=s;actor=a;clientKey=key;fingerprint=hash;this.reason=reason;linesJson=json;}
 public Long getId(){return id;}public Long getActorId(){return actor.getId();}public String getActor(){return actor.getName();}public String getFingerprint(){return fingerprint;}public String getReason(){return reason;}public String getLinesJson(){return linesJson;}public LocalDateTime getCreatedAt(){return createdAt;}
}

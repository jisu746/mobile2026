package com.storemate.backend.domain;
import jakarta.persistence.*;import java.time.*;import java.util.*;
@Entity @Table(name="order_plans",uniqueConstraints=@UniqueConstraint(columnNames={"store_id","client_key"}))
public class OrderPlan {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) private Store store;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) private Account actor;
 @Column(name="client_key",length=80,nullable=false) private String clientKey;
 @Column(length=64,nullable=false) private String fingerprint;
 private LocalDateTime createdAt=LocalDateTime.now().withNano(0);
 private LocalDateTime orderedAt;
 private Long revision;
 public Store getStore(){return store;}public LocalDateTime getOrderedAt(){return orderedAt;}public long getRevision(){return revision==null?0:revision;}
 public String getStatus(){if(orderedAt==null)return "DRAFT";if(lines.stream().allMatch(l->l.getReceived()>=l.getQuantity()))return "DELIVERED";return lines.stream().anyMatch(l->l.getReceived()>0)?"PARTIAL":"ORDERED";}
 public void submit(){if(orderedAt==null){orderedAt=LocalDateTime.now().withNano(0);revision=getRevision()+1;}}
 public void delivered(){revision=getRevision()+1;}
 @ElementCollection @CollectionTable(name="order_plan_lines",joinColumns=@JoinColumn(name="plan_id")) @OrderColumn(name="line_index") private List<Line> lines=new ArrayList<>();
 protected OrderPlan(){}public OrderPlan(Store store,Account actor,String key,String fingerprint){this.store=store;this.actor=actor;clientKey=key;this.fingerprint=fingerprint;}
 public void add(String barcode,String name,int stock,int target,int quantity){lines.add(new Line(barcode,name,stock,target,quantity));}
 public Long getId(){return id;} public String getActor(){return actor.getName();}public Long getActorId(){return actor.getId();}public String getFingerprint(){return fingerprint;}public LocalDateTime getCreatedAt(){return createdAt;}public List<Line> getLines(){return lines;}
 @Embeddable public static class Line {
  @Column(length=20) private String barcode;@Column(length=100) private String name;private int stock,target,quantity;
  private Integer received;
  public int getReceived(){return received==null?0:received;}public void receive(int amount){received=getReceived()+amount;}
  protected Line(){} public Line(String barcode,String name,int stock,int target,int quantity){this.barcode=barcode;this.name=name;this.stock=stock;this.target=target;this.quantity=quantity;}
  public String getBarcode(){return barcode;}public String getName(){return name;}public int getStock(){return stock;}public int getTarget(){return target;}public int getQuantity(){return quantity;}
 }
}

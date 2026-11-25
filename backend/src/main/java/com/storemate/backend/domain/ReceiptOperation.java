package com.storemate.backend.domain;
import jakarta.persistence.*;
import java.util.*;
@Entity @Table(name="receipt_operations",uniqueConstraints=@UniqueConstraint(columnNames={"store_id","client_key"}))
public class ReceiptOperation {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) private Store store;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) private Account actor;
 @Column(name="client_key",length=80,nullable=false) private String clientKey;
 @Column(length=64,nullable=false) private String fingerprint;
 @ElementCollection @CollectionTable(name="receipt_operation_lines",joinColumns=@JoinColumn(name="operation_id")) @OrderColumn(name="line_index") private List<Line> lines=new ArrayList<>();
 protected ReceiptOperation(){}
 public ReceiptOperation(Store store,Account actor,String key,String fingerprint){this.store=store;this.actor=actor;clientKey=key;this.fingerprint=fingerprint;}
 public String getFingerprint(){return fingerprint;} public Account getActor(){return actor;} public List<Line> getLines(){return lines;}
 public void add(String barcode,String name,int before,int after,int min){lines.add(new Line(barcode,name,before,after,min));}
 @Embeddable public static class Line {
  @Column(length=20) private String barcode; @Column(length=100) private String name;
  private int beforeCount,afterCount,minimumCount;
  protected Line(){} public Line(String barcode,String name,int before,int after,int min){this.barcode=barcode;this.name=name;beforeCount=before;afterCount=after;minimumCount=min;}
  public String getBarcode(){return barcode;}public String getName(){return name;}public int getBefore(){return beforeCount;}public int getAfter(){return afterCount;}public int getMin(){return minimumCount;}
 }
}

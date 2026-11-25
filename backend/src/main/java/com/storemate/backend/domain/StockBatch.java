package com.storemate.backend.domain;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity @Table(name="stock_batches", indexes=@Index(columnList="product_id"))
public class StockBatch {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) private Product product;
 private int quantity;
 private LocalDate expiry;
 private LocalDateTime receivedAt=LocalDateTime.now().withNano(0);
 @Column(length=20,nullable=false) private String source;
 private long revision;
 protected StockBatch(){}
 public StockBatch(Product product,int quantity,LocalDate expiry,String source){this.product=product;this.quantity=quantity;this.expiry=expiry;this.source=source;}
 public Long getId(){return id;} public Product getProduct(){return product;}
 public int getQuantity(){return quantity;} public LocalDate getExpiry(){return expiry;}
 public String getSource(){return source;} public LocalDateTime getReceivedAt(){return receivedAt;} public long getRevision(){return revision;}
 public void update(int quantity,LocalDate expiry){if(quantity<0)throw new IllegalArgumentException();this.quantity=quantity;this.expiry=expiry;revision++;}
}

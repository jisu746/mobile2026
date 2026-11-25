// 매장별 상품·현재 재고 테이블 (바코드는 매장 안에서 하나만 가진다)
package com.storemate.backend.domain;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "products", uniqueConstraints = @UniqueConstraint(columnNames = {"store_id", "barcode"}))
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Store store;

    @Column(nullable = false, length = 20)
    private String barcode;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 20)
    private String category;

    private int stock;

    // 최소 재고 (이보다 적으면 발주 필요)
    private int minStock;
    @Column(length=100) private String specification;
    private Integer targetStock;
    public String getSpecification(){return specification;}
    public int getTargetStock(){return targetStock==null?0:targetStock;}
    public void metadata(String category,String specification,int targetStock){this.category=category;this.specification=specification;this.targetStock=targetStock;}

    // 가장 빠른 유통기한 (모르면 비어 있음)
    private LocalDate expiry;
    @Column(length=36) private String photoVersion;
    public String getPhotoVersion(){return photoVersion;}
    public void setPhotoVersion(String version){photoVersion=version;}
    private java.time.LocalDateTime deletedAt;
    @ManyToOne(fetch=FetchType.LAZY) private Account deletedBy;
    public boolean isDeleted(){return deletedAt!=null;}
    public void archive(Account actor){deletedAt=java.time.LocalDateTime.now().withNano(0);deletedBy=actor;photoVersion=null;}
    public void restore(String name,String category){deletedAt=null;deletedBy=null;this.name=name;this.category=category;this.minStock=0;}

    protected Product() {
    }

    public Product(Store store, String barcode, String name, String category, int stock, int minStock, LocalDate expiry) {
        this.store = store;
        this.barcode = barcode;
        this.name = name;
        this.category = category;
        this.stock = stock;
        this.minStock = minStock;
        this.expiry = expiry;
    }

    public Long getId() { return id; }
    public Store getStore() { return store; }
    public String getBarcode() { return barcode; }
    public String getName() { return name; }
    public String getCategory() { return category; }
    public int getStock() { return stock; }
    public int getMinStock() { return minStock; }
    public LocalDate getExpiry() { return expiry; }

    public void setName(String name) { this.name = name; }
    public void setStock(int stock) { this.stock = stock; }
    public void setMinStock(int minStock) { this.minStock = minStock; }
    public void setExpiry(LocalDate expiry) { this.expiry = expiry; }
}

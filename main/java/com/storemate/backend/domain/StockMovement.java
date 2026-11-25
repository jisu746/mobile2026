// 재고 변동 이력 테이블 (누가, 언제, 얼마나 바꿨는지)
package com.storemate.backend.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "stock_movements",uniqueConstraints=@UniqueConstraint(columnNames={"product_id","client_key"}))
public class StockMovement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Account account;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private MovementType type;

    private int beforeStock;
    private int afterStock;
    private LocalDateTime createdAt = LocalDateTime.now();
    @Column(length=300) private String reason;
    @Column(length=80) private String clientKey;
    @Column(length=64) private String fingerprint;
    private Long batchId;
    public void describe(String reason,String clientKey,String fingerprint,Long batchId){this.reason=reason;this.clientKey=clientKey;this.fingerprint=fingerprint;this.batchId=batchId;}
    public Long getId(){return id;} public Product getProduct(){return product;} public Account getAccount(){return account;}
    public MovementType getType(){return type;} public int getBeforeStock(){return beforeStock;}public int getAfterStock(){return afterStock;}
    public LocalDateTime getCreatedAt(){return createdAt;} public String getReason(){return reason;}public String getFingerprint(){return fingerprint;}public Long getBatchId(){return batchId;}

    protected StockMovement() {
    }

    public StockMovement(Product product, Account account, MovementType type, int beforeStock, int afterStock) {
        this.product = product;
        this.account = account;
        this.type = type;
        this.reason = switch(type){case IN->"상품 입고";case OUT->"상품 출고";case ADJUST->"재고 수량 조정";case DISCARD->"유통기한 경과 폐기";case DELETE->"상품 비활성화";};
        this.beforeStock = beforeStock;
        this.afterStock = afterStock;
    }
}

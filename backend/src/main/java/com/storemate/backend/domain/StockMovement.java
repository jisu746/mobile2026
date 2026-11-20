// 재고 변동 이력 테이블 (누가, 언제, 얼마나 바꿨는지)
package com.storemate.backend.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "stock_movements")
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

    protected StockMovement() {
    }

    public StockMovement(Product product, Account account, MovementType type, int beforeStock, int afterStock) {
        this.product = product;
        this.account = account;
        this.type = type;
        this.beforeStock = beforeStock;
        this.afterStock = afterStock;
    }
}

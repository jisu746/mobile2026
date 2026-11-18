// 상품·재고 테이블 조회·저장 창구
package com.storemate.backend.repo;

import com.storemate.backend.domain.Product;
import com.storemate.backend.domain.Store;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findByStoreOrderByIdAsc(Store store);

    Optional<Product> findByStoreAndBarcode(Store store, String barcode);
}

package com.storemate.backend.web;

import com.storemate.backend.domain.Product;
import com.storemate.backend.domain.Store;
import com.storemate.backend.repo.ProductRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

// 개발용: 새 매장을 만들 때 샘플 상품을 넣어 준다 (storemate.dev.seed-products=true 일 때만)
@Component
public class ProductSeeder {
    private final ProductRepository products;
    private final boolean enabled;

    public ProductSeeder(ProductRepository products, @Value("${storemate.dev.seed-products:false}") boolean enabled) {
        this.products = products;
        this.enabled = enabled;
    }

    public void seed(Store s) {
        if (!enabled) return;
        LocalDate today = LocalDate.now();
        products.save(new Product(s, "8801115114154", "서울우유 1L", "냉장", 2, 6, null));
        products.save(new Product(s, "8801043015653", "농심 신라면 컵", "상온", 4, 10, null));
        products.save(new Product(s, "8809000000011", "아이스컵 16oz", "소모품", 1, 3, null));
        products.save(new Product(s, "8801104000011", "빙그레 바나나맛우유 240ml", "냉장", 2, 6, today.plusDays(2)));
        products.save(new Product(s, "8801104000028", "빙그레 바닐라라떼", "냉장", 18, 6, today.plusDays(20)));
        products.save(new Product(s, "8801104000035", "빙그레 샌드위치 햄치즈", "냉장", 18, 6, today.minusDays(1)));
    }
}

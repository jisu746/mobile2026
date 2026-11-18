// 상품·재고·입고 API (매장에 승인된 사장님과 직원이 함께 쓴다)
package com.storemate.backend.web;

import com.storemate.backend.domain.*;
import com.storemate.backend.repo.ProductRepository;
import com.storemate.backend.repo.StockMovementRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/stores/{storeId}")
public class InventoryController {
    private static final Pattern BARCODE = Pattern.compile("^[0-9A-Za-z-]{4,20}$");

    private final StoreAccess access;
    private final ProductRepository products;
    private final StockMovementRepository movements;
    private final Notifier notifier;
    private final boolean anyCode;

    public InventoryController(StoreAccess access, ProductRepository products, StockMovementRepository movements, Notifier notifier,
                               @Value("${storemate.dev.any-qr:false}") boolean anyCode) {
        this.access = access;
        this.products = products;
        this.movements = movements;
        this.notifier = notifier;
        this.anyCode = anyCode;
    }

    // 개발용 any-qr 일 때는 바코드 형식을 가리지 않는다 (길이 20자까지)
    private boolean validBarcode(String b) {
        return b != null && (anyCode ? !b.isBlank() && b.length() <= 20 : BARCODE.matcher(b).matches());
    }

    private static Dto.ProductView view(Product p) {
        return new Dto.ProductView(p.getBarcode(), p.getName(), p.getCategory(), p.getStock(), p.getMinStock(),
                p.getExpiry() == null ? null : p.getExpiry().toString());
    }

    private static LocalDate date(String s) {
        if (s == null || s.isBlank()) return null;
        try {
            return LocalDate.parse(s);
        } catch (DateTimeParseException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "유통기한 형식이 올바르지 않아요");
        }
    }

    private Product find(Store s, String barcode) {
        return products.findByStoreAndBarcode(s, barcode).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "등록되지 않은 상품이에요"));
    }

    @GetMapping("/products")
    @Transactional(readOnly = true)
    public List<Dto.ProductView> list(@RequestAttribute(AuthInterceptor.ACCOUNT) Account account, @PathVariable Long storeId) {
        return products.findByStoreOrderByIdAsc(access.requireMember(account, storeId)).stream().map(InventoryController::view).toList();
    }

    @GetMapping("/products/{barcode}")
    @Transactional(readOnly = true)
    public Dto.ProductView one(@RequestAttribute(AuthInterceptor.ACCOUNT) Account account, @PathVariable Long storeId, @PathVariable String barcode) {
        return view(find(access.requireMember(account, storeId), barcode));
    }

    // 입고: 등록된 상품은 재고를 더하고, 등록되지 않은 상품은 새로 등록한다
    @PostMapping("/receipts")
    @Transactional
    public List<Dto.ReceiptResult> receive(@RequestAttribute(AuthInterceptor.ACCOUNT) Account account, @PathVariable Long storeId,
                                           @RequestBody Dto.ReceiptRequest r) {
        Store s = access.requireMember(account, storeId);
        if (r.items() == null || r.items().isEmpty()) throw new ApiException(HttpStatus.BAD_REQUEST, "입고할 상품이 없어요");
        List<Dto.ReceiptResult> out = new ArrayList<>();
        for (Dto.ReceiptItem i : r.items()) {
            if (!validBarcode(i.barcode()))
                throw new ApiException(HttpStatus.BAD_REQUEST, "바코드가 올바르지 않아요");
            if (i.qty() <= 0) throw new ApiException(HttpStatus.BAD_REQUEST, "입고 수량은 1개 이상이어야 해요");
            LocalDate expiry = date(i.expiry());
            Product p = products.findByStoreAndBarcode(s, i.barcode()).orElse(null);
            if (p == null) {
                if (i.name() == null || i.name().isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST, "상품명을 입력해주세요");
                p = products.save(new Product(s, i.barcode(), i.name().trim(), i.category(), 0, 0, null));
            }
            int before = p.getStock();
            p.setStock(before + i.qty());
            // 유통기한은 가장 빠른 날짜만 남긴다
            if (expiry != null && (p.getExpiry() == null || expiry.isBefore(p.getExpiry()))) p.setExpiry(expiry);
            movements.save(new StockMovement(p, account, MovementType.IN, before, p.getStock()));
            out.add(new Dto.ReceiptResult(p.getBarcode(), p.getName(), before, p.getStock(), p.getMinStock()));
        }
        int qty = r.items().stream().mapToInt(Dto.ReceiptItem::qty).sum();
        notifier.send(s, Role.OWNER, account, "receipt", account.getName() + " 님이 입고를 완료했어요", out.size() + "개 품목 · " + qty + "개 · " + s.getName());
        return out;
    }

    // 상품명·재고 수량 수정 (수량이 바뀌면 조정 이력을 남긴다)
    @PutMapping("/products/{barcode}")
    @Transactional
    public Dto.ProductView update(@RequestAttribute(AuthInterceptor.ACCOUNT) Account account, @PathVariable Long storeId,
                                  @PathVariable String barcode, @RequestBody Dto.UpdateProductRequest r) {
        Product p = find(access.requireMember(account, storeId), barcode);
        if (r.name() != null) {
            if (r.name().isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST, "상품명을 입력해주세요");
            p.setName(r.name().trim());
        }
        if (r.stock() != null) {
            if (r.stock() < 0) throw new ApiException(HttpStatus.BAD_REQUEST, "재고 수량은 0개 이상이어야 해요");
            int before = p.getStock();
            if (before != r.stock()) {
                p.setStock(r.stock());
                movements.save(new StockMovement(p, account, MovementType.ADJUST, before, r.stock()));
            }
        }
        return view(p);
    }

    // 유통기한이 지난 상품을 재고에서 제외한다 (지금은 해당 상품 재고 전체를 폐기)
    @PostMapping("/products/{barcode}/discard")
    @Transactional
    public Dto.ProductView discard(@RequestAttribute(AuthInterceptor.ACCOUNT) Account account, @PathVariable Long storeId, @PathVariable String barcode) {
        Product p = find(access.requireMember(account, storeId), barcode);
        int before = p.getStock();
        p.setStock(0);
        p.setExpiry(null);
        movements.save(new StockMovement(p, account, MovementType.DISCARD, before, 0));
        return view(p);
    }
}

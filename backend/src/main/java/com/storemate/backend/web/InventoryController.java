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
    private final StockBatchService batches;
    private final com.storemate.backend.repo.ReceiptOperationRepository receipts;
    public record BatchView(long id,int quantity,String expiry,String receivedAt,String source,long revision){}
    public record BatchEdit(int quantity,String expiry,Long revision){}
    private BatchView batchView(StockBatch b){return new BatchView(b.getId(),b.getQuantity(),b.getExpiry()==null?null:b.getExpiry().toString(),b.getReceivedAt().toString(),b.getSource(),b.getRevision());}
    @GetMapping("/products/{barcode}/batches") @Transactional(readOnly=true)
    public List<BatchView> batchList(@RequestAttribute(AuthInterceptor.ACCOUNT) Account account,@PathVariable Long storeId,@PathVariable String barcode){
        Product p=find(access.requireMember(account,storeId),barcode);var list=batches.list(p);
        if(list.isEmpty()&&p.getStock()>0)return List.of(new BatchView(0,p.getStock(),p.getExpiry()==null?null:p.getExpiry().toString(),null,"LEGACY",0));
        return list.stream().filter(b->b.getQuantity()>0).map(this::batchView).toList();
    }
    @PutMapping("/products/{barcode}/batches/{id}") @Transactional
    public Dto.ProductView batchEdit(@RequestAttribute(AuthInterceptor.ACCOUNT) Account account,@PathVariable Long storeId,@PathVariable String barcode,@PathVariable long id,@RequestBody BatchEdit r){
        Store store=access.requireMember(account,storeId);batches.lock(store);Product p=find(store,barcode);
        if(r.revision()==null)throw new ApiException(HttpStatus.BAD_REQUEST,"재고 변경 정보를 확인해주세요");
        access.requireInventory(account,storeId,StoreAccess.InventoryPermission.ADJUST_STOCK);
        int before=p.getStock();batches.update(p,id,r.revision(),r.quantity(),date(r.expiry()));
        movements.save(new StockMovement(p,account,r.quantity()==0?MovementType.DISCARD:MovementType.ADJUST,before,p.getStock()));return view(p);
    }

    public InventoryController(StoreAccess access, ProductRepository products, StockMovementRepository movements, Notifier notifier,
                               @Value("${storemate.dev.any-qr:false}") boolean anyCode, StockBatchService batches, com.storemate.backend.repo.ReceiptOperationRepository receipts) {
        this.access = access;
        this.products = products;
        this.movements = movements;
        this.notifier = notifier;
        this.anyCode = anyCode; this.batches=batches; this.receipts=receipts;
    }

    // 개발용 any-qr 일 때는 바코드 형식을 가리지 않는다 (길이 20자까지)
    private boolean validBarcode(String b) {
        return b != null && (anyCode ? !b.isBlank() && b.length() <= 20 : BARCODE.matcher(b).matches());
    }

    private static Dto.ProductView view(Product p) {
        return new Dto.ProductView(p.getBarcode(), p.getName(), p.getCategory(), p.getStock(), p.getMinStock(),
                p.getExpiry() == null ? null : p.getExpiry().toString(),p.getPhotoVersion(),p.getSpecification());
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
        return products.findByStoreAndBarcode(s, barcode).filter(p->!p.isDeleted()).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "등록되지 않은 상품이에요"));
    }

    @GetMapping("/products")
    @Transactional(readOnly = true)
    public List<Dto.ProductView> list(@RequestAttribute(AuthInterceptor.ACCOUNT) Account account, @PathVariable Long storeId) {
        return products.findByStoreOrderByIdAsc(access.requireMember(account, storeId)).stream().filter(p->!p.isDeleted()).map(InventoryController::view).toList();
    }

    @DeleteMapping("/products/{barcode}") @ResponseStatus(HttpStatus.NO_CONTENT) @Transactional
    public void delete(@RequestAttribute(AuthInterceptor.ACCOUNT) Account account,@PathVariable Long storeId,@PathVariable String barcode,@RequestParam int expectedStock){
        Store store=access.requireMember(account,storeId);batches.lock(store);
        Product p=products.findByStoreAndBarcode(store,barcode).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"등록되지 않은 상품이에요"));
        if(p.isDeleted())return;
        if(p.getStock()!=expectedStock)throw new ApiException(HttpStatus.CONFLICT,"재고가 변경됐어요. 목록을 다시 확인한 뒤 삭제해주세요");
        access.requireInventory(account,storeId,StoreAccess.InventoryPermission.DELETE_PRODUCTS);
        int before=p.getStock();batches.adjust(p,0);p.archive(account);
        movements.save(new StockMovement(p,account,MovementType.DELETE,before,0));
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
        batches.lock(s);
        if (r.items() == null || r.items().isEmpty() || r.items().size()>100) throw new ApiException(HttpStatus.BAD_REQUEST, "입고할 상품이 없어요");
        String key=r.clientKey()==null?java.util.UUID.randomUUID().toString():r.clientKey();
        if(!key.matches("[A-Za-z0-9_-]{8,80}"))throw new ApiException(HttpStatus.BAD_REQUEST,"입고 요청 정보를 확인해주세요");
        String fingerprint;
        try{fingerprint=java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(r.items().toString().getBytes(java.nio.charset.StandardCharsets.UTF_8)));}catch(java.security.NoSuchAlgorithmException e){throw new IllegalStateException(e);}
        var previous=receipts.findByStoreAndClientKey(s,key);
        if(previous.isPresent()){
            var operation=previous.get();
            if(!operation.getActor().getId().equals(account.getId())||!operation.getFingerprint().equals(fingerprint))throw new ApiException(HttpStatus.CONFLICT,"입고 요청 내용이 달라요. 새로 확인해주세요");
            return operation.getLines().stream().map(l->new Dto.ReceiptResult(l.getBarcode(),l.getName(),l.getBefore(),l.getAfter(),l.getMin())).toList();
        }
        var operation=new ReceiptOperation(s,account,key,fingerprint);
        List<Dto.ReceiptResult> out = new ArrayList<>();
        for (Dto.ReceiptItem i : r.items()) {
            if (!validBarcode(i.barcode()))
                throw new ApiException(HttpStatus.BAD_REQUEST, "바코드가 올바르지 않아요");
            if (i.qty() <= 0 || i.qty()>1000000) throw new ApiException(HttpStatus.BAD_REQUEST, "입고 수량은 1개 이상이어야 해요");
            LocalDate expiry = date(i.expiry());
            Product p = products.findByStoreAndBarcode(s, i.barcode()).orElse(null);
            if (p == null || p.isDeleted()) {
                if (i.name() == null || i.name().isBlank() || i.name().trim().length()>100 || (i.category()!=null&&i.category().length()>20)) throw new ApiException(HttpStatus.BAD_REQUEST, "상품명을 입력해주세요");
                if(p==null)p = products.save(new Product(s, i.barcode(), i.name().trim(), i.category(), 0, 0, null));
                else p.restore(i.name().trim(),i.category());
            }
            int before = p.getStock();
            batches.receive(p,i.qty(),expiry);
            movements.save(new StockMovement(p, account, MovementType.IN, before, p.getStock()));
            out.add(new Dto.ReceiptResult(p.getBarcode(), p.getName(), before, p.getStock(), p.getMinStock()));
            operation.add(p.getBarcode(),p.getName(),before,p.getStock(),p.getMinStock());
        }
        receipts.save(operation);
        int qty = r.items().stream().mapToInt(Dto.ReceiptItem::qty).sum();
        notifier.send(s, Role.OWNER, account, "receipt", account.getName() + " 님이 입고를 완료했어요", out.size() + "개 품목 · " + qty + "개 · " + s.getName());
        return out;
    }

    // 상품명·재고 수량 수정 (수량이 바뀌면 조정 이력을 남긴다)
    @PutMapping("/products/{barcode}")
    @Transactional
    public Dto.ProductView update(@RequestAttribute(AuthInterceptor.ACCOUNT) Account account, @PathVariable Long storeId,
                                  @PathVariable String barcode, @RequestBody Dto.UpdateProductRequest r) {
        Store store=access.requireMember(account,storeId);batches.lock(store);
        Product p = find(store, barcode);
        if (r.name() != null) {
            if (r.name().isBlank() || r.name().trim().length()>100) throw new ApiException(HttpStatus.BAD_REQUEST, "상품명을 입력해주세요");
            p.setName(r.name().trim());
        }
        if(r.stock()!=null&&(r.expectedStock()==null||r.expectedStock()!=p.getStock()))throw new ApiException(HttpStatus.CONFLICT,"재고가 변경됐어요. 새로고침 후 수량을 확인해주세요");
        if (r.stock() != null) {
            if (r.stock() < 0 || r.stock()>1000000) throw new ApiException(HttpStatus.BAD_REQUEST, "재고 수량은 0개 이상이어야 해요");
            int before = p.getStock();
            if (before != r.stock()) {
                access.requireInventory(account,storeId,StoreAccess.InventoryPermission.ADJUST_STOCK);
                batches.adjust(p,r.stock());
                movements.save(new StockMovement(p, account, MovementType.ADJUST, before, r.stock()));
            }
        }
        if (r.min() != null) {
            if (r.min() < 0 || r.min()>1000000) throw new ApiException(HttpStatus.BAD_REQUEST, "적정 재고는 0개 이상이어야 해요");
            p.setMinStock(r.min());
        }
        return view(p);
    }

    // 유통기한이 지난 입고 묶음만 재고에서 제외한다
    @PostMapping("/products/{barcode}/discard")
    @Transactional
    public Dto.ProductView discard(@RequestAttribute(AuthInterceptor.ACCOUNT) Account account, @PathVariable Long storeId, @PathVariable String barcode) {
        Store store=access.requireMember(account,storeId);batches.lock(store);
        Product p = find(store, barcode);
        int before = p.getStock();
        batches.discardExpired(p);
        movements.save(new StockMovement(p, account, MovementType.DISCARD, before, p.getStock()));
        return view(p);
    }
}

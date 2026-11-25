package com.storemate.backend.web;

import com.storemate.backend.domain.*;
import com.storemate.backend.repo.*;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/stores/{storeId}/categories")
public class CategoryController {
    private final StoreAccess access;
    private final StoreTemplateController templates;
    private final StoreTemplateRepository settings;
    private final ProductRepository products;
    private final StockBatchService locks;
    public CategoryController(StoreAccess access, StoreTemplateController templates, StoreTemplateRepository settings, ProductRepository products, StockBatchService locks) {
        this.access=access;this.templates=templates;this.settings=settings;this.products=products;this.locks=locks;
    }
    public record Catalog(List<String> categories,long revision) {}
    public record Change(String action,String name,String next,long revision) {}
    private List<String> names(Store s,StoreTemplateController.Template t) {
        var names=new LinkedHashSet<>(t.categories());
        products.findByStoreOrderByIdAsc(s).stream().filter(p->!p.isDeleted()).map(Product::getCategory)
                .filter(n->n!=null&&!n.isBlank()).forEach(n->names.add(n.trim()));
        return new ArrayList<>(names);
    }
    @GetMapping @Transactional(readOnly=true)
    public Catalog get(@RequestAttribute(AuthInterceptor.ACCOUNT)Account a,@PathVariable Long storeId) {
        var s=access.requireMember(a,storeId);var t=templates.get(a,storeId);
        return new Catalog(names(s,t),t.revision());
    }
    private String valid(String name) {
        if(name==null||name.isBlank()||name.trim().length()>20||name.trim().equals("미분류"))
            throw new ApiException(HttpStatus.BAD_REQUEST,"분류 이름은 1~20자로 입력해주세요. 미분류는 기본 분류예요.");
        return name.trim();
    }
    @PostMapping @Transactional
    public Catalog change(@RequestAttribute(AuthInterceptor.ACCOUNT)Account a,@PathVariable Long storeId,@RequestBody Change r) {
        var s=access.requireOwner(a,storeId);locks.lock(s);var t=templates.get(a,storeId);
        if(r.revision()!=t.revision())throw new ApiException(HttpStatus.CONFLICT,"분류가 변경됐어요. 다시 열어 확인해주세요.");
        var names=names(s,t);String name=valid(r.name());
        if("ADD".equals(r.action())) {
            if(names.stream().anyMatch(n->n.equalsIgnoreCase(name)))throw new ApiException(HttpStatus.CONFLICT,"이미 있는 분류예요.");
            if(names.size()>=20)throw new ApiException(HttpStatus.BAD_REQUEST,"분류는 최대 20개까지 만들 수 있어요.");
            names.add(name);
        } else if("RENAME".equals(r.action())||"DELETE".equals(r.action())) {
            if(!names.contains(name))throw new ApiException(HttpStatus.CONFLICT,"분류를 다시 확인해주세요.");
            String next="DELETE".equals(r.action())?"":valid(r.next());
            if(!next.isEmpty()&&names.stream().anyMatch(n->!n.equals(name)&&n.equalsIgnoreCase(next)))throw new ApiException(HttpStatus.CONFLICT,"이미 있는 분류예요.");
            for(var p:products.findByStoreOrderByIdAsc(s))if(!p.isDeleted()&&name.equals(p.getCategory()))p.metadata(next,p.getSpecification(),p.getTargetStock());
            int index=names.indexOf(name);names.remove(index);if(!next.isEmpty())names.add(index,next);
        } else throw new ApiException(HttpStatus.BAD_REQUEST,"분류 작업을 확인해주세요.");
        var saved=settings.findById(storeId).orElseGet(()->new StoreTemplate(storeId));
        saved.update(t.industry(),t.expiryEnabled(),names,t.examples());settings.save(saved);
        return new Catalog(List.copyOf(names),saved.getRevision());
    }
}

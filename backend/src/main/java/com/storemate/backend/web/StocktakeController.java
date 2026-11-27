package com.storemate.backend.web;
import com.storemate.backend.domain.*;import com.storemate.backend.repo.*;
import org.springframework.web.bind.annotation.*;import org.springframework.transaction.annotation.Transactional;import org.springframework.http.HttpStatus;
import tools.jackson.databind.ObjectMapper;import java.util.*;import java.security.MessageDigest;import java.nio.charset.StandardCharsets;
@RestController @RequestMapping("/api/stores/{storeId}/stocktakes")
public class StocktakeController {
 private final StoreAccess access;private final StockBatchService batches;private final ProductRepository products;private final StockMovementRepository movements;private final StocktakeOperationRepository operations;private final ObjectMapper json;
 public StocktakeController(StoreAccess a,StockBatchService b,ProductRepository p,StockMovementRepository m,StocktakeOperationRepository o,ObjectMapper j){access=a;batches=b;products=p;movements=m;operations=o;json=j;}
 public record Line(String barcode,int expectedStock,int counted){}public record Save(String clientKey,String reason,List<Line> items){}
 public record Result(long id,String actor,String at,String reason,Object items){}
 private String hash(Object o){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(o.toString().getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException(e);}}
 private Result view(StocktakeOperation o){return new Result(o.getId(),o.getActor(),o.getCreatedAt().toString(),o.getReason(),json.readValue(o.getLinesJson(),Object.class));}
 @GetMapping @Transactional(readOnly=true) public List<Result> history(@RequestAttribute(AuthInterceptor.ACCOUNT)Account a,@PathVariable Long storeId){return operations.findTop50ByStoreOrderByIdDesc(access.requireMember(a,storeId)).stream().map(this::view).toList();}
 @PostMapping @Transactional public Result save(@RequestAttribute(AuthInterceptor.ACCOUNT)Account a,@PathVariable Long storeId,@RequestBody Save r){
  var s=access.requireMember(a,storeId);batches.lock(s);
  if(r.clientKey()==null||!r.clientKey().matches("[A-Za-z0-9_-]{8,80}")||r.reason()==null||r.reason().isBlank()||r.reason().length()>300||r.items()==null||r.items().isEmpty()||r.items().size()>100||r.items().stream().anyMatch(Objects::isNull))throw new ApiException(HttpStatus.BAD_REQUEST,"실사 상품 1~100개와 처리 사유를 확인해주세요.");
  String fingerprint=hash(r.reason()+r.items().toString());var old=operations.findByStoreAndClientKey(s,r.clientKey());if(old.isPresent()){if(!old.get().getFingerprint().equals(fingerprint)||!old.get().getActorId().equals(a.getId()))throw new ApiException(HttpStatus.CONFLICT,"같은 요청의 내용이 달라요.");return view(old.get());}
  var selected=new LinkedHashMap<String,Product>();
  for(var line:r.items()){
   if(line.barcode()==null||selected.containsKey(line.barcode())||line.counted()<0||line.counted()>1000000)throw new ApiException(HttpStatus.BAD_REQUEST,"실사 수량과 중복 상품을 확인해주세요.");
   var p=products.findByStoreAndBarcode(s,line.barcode()).filter(v->!v.isDeleted()).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"실사 상품을 다시 확인해주세요."));
   if(p.getStock()!=line.expectedStock())throw new ApiException(HttpStatus.CONFLICT,p.getName()+" 재고가 변경됐어요. 최신 수량을 확인하고 다시 실사해주세요.");selected.put(line.barcode(),p);
  }
  var result=new ArrayList<Map<String,Object>>();
  for(var line:r.items()){
   var p=selected.get(line.barcode());int before=p.getStock();if(before!=line.counted()){batches.adjust(p,line.counted());var movement=new StockMovement(p,a,MovementType.ADJUST,before,p.getStock());movement.describe(r.reason().trim(),"stocktake-"+hash(r.clientKey()).substring(0,48),fingerprint,null);movements.save(movement);}
   result.add(Map.of("barcode",p.getBarcode(),"name",p.getName(),"before",before,"after",p.getStock(),"difference",p.getStock()-before));
  }
  return view(operations.save(new StocktakeOperation(s,a,r.clientKey(),fingerprint,r.reason().trim(),json.writeValueAsString(result))));
 }
}

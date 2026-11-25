package com.storemate.backend.web;
import com.storemate.backend.domain.*;import com.storemate.backend.repo.*;
import org.springframework.web.bind.annotation.*;import org.springframework.transaction.annotation.Transactional;import org.springframework.http.HttpStatus;
import java.util.*;import java.nio.charset.StandardCharsets;import java.security.MessageDigest;
import tools.jackson.databind.ObjectMapper;
@RestController @RequestMapping("/api/stores/{storeId}/order-plans/{planId}")
public class OrderFlowController {
 private final StoreAccess access;private final StockBatchService locks;private final OrderPlanRepository plans;private final OrderDeliveryRepository deliveries;private final InventoryController inventory;private final ObjectMapper json;
 public OrderFlowController(StoreAccess a,StockBatchService l,OrderPlanRepository p,OrderDeliveryRepository d,InventoryController i,ObjectMapper j){access=a;locks=l;plans=p;deliveries=d;inventory=i;json=j;}
 public record Revision(long revision){}public record Receive(String clientKey,long revision,List<Dto.ReceiptItem> items){}
 public record Delivery(long id,String actor,String createdAt,Object items){}
 private OrderPlan plan(Account a,Long sid,Long id){access.requireMember(a,sid);return plans.findById(id).filter(p->p.getStore().getId().equals(sid)).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"발주 계획을 찾을 수 없어요."));}
 private static String hash(Object o){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(o.toString().getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException(e);}}
 private Delivery view(OrderDelivery d){return new Delivery(d.getId(),d.getActor(),d.getCreatedAt().toString(),json.readValue(d.getItemsJson(),Object.class));}
 @GetMapping @Transactional(readOnly=true) public InventoryOperationsController.SavedPlan get(@RequestAttribute(AuthInterceptor.ACCOUNT)Account a,@PathVariable Long storeId,@PathVariable Long planId){return InventoryOperationsController.planView(plan(a,storeId,planId));}
 @PostMapping("/submit") @Transactional public InventoryOperationsController.SavedPlan submit(@RequestAttribute(AuthInterceptor.ACCOUNT)Account a,@PathVariable Long storeId,@PathVariable Long planId,@RequestBody Revision r){var s=access.requireInventory(a,storeId,StoreAccess.InventoryPermission.SAVE_ORDER_PLANS);locks.lock(s);var p=plan(a,storeId,planId);if(p.getOrderedAt()==null&&r.revision()!=p.getRevision())throw new ApiException(HttpStatus.CONFLICT,"계획이 변경됐어요. 다시 조회해주세요.");p.submit();return InventoryOperationsController.planView(p);}
 @GetMapping("/deliveries") @Transactional(readOnly=true) public List<Delivery> list(@RequestAttribute(AuthInterceptor.ACCOUNT)Account a,@PathVariable Long storeId,@PathVariable Long planId){return deliveries.findTop50ByPlanOrderByIdDesc(plan(a,storeId,planId)).stream().map(this::view).toList();}
 @PostMapping("/deliveries") @Transactional public Delivery receive(@RequestAttribute(AuthInterceptor.ACCOUNT)Account a,@PathVariable Long storeId,@PathVariable Long planId,@RequestBody Receive r){
  var s=access.requireMember(a,storeId);locks.lock(s);var p=plan(a,storeId,planId);
  if(r.clientKey()==null||!r.clientKey().matches("[A-Za-z0-9_-]{8,80}")||r.items()==null||r.items().isEmpty()||r.items().size()>100||r.items().stream().anyMatch(Objects::isNull))throw new ApiException(HttpStatus.BAD_REQUEST,"입고할 상품과 수량을 확인해주세요.");
  String fingerprint=hash(r.items());var previous=deliveries.findByPlanAndClientKey(p,r.clientKey());
  if(previous.isPresent()){if(!previous.get().getFingerprint().equals(fingerprint)||!previous.get().getActorId().equals(a.getId()))throw new ApiException(HttpStatus.CONFLICT,"같은 요청의 내용이 달라요.");return view(previous.get());}
  if(p.getOrderedAt()==null)throw new ApiException(HttpStatus.BAD_REQUEST,"실제로 발주를 마친 뒤 발주 완료로 표시해주세요.");
  if(p.getRevision()!=r.revision())throw new ApiException(HttpStatus.CONFLICT,"다른 입고가 반영됐어요. 다시 조회해주세요.");
  var totals=new HashMap<String,Integer>();var clean=new ArrayList<Dto.ReceiptItem>();
  for(var item:r.items()){
   var line=p.getLines().stream().filter(l->l.getBarcode().equals(item.barcode())).findFirst().orElseThrow(()->new ApiException(HttpStatus.BAD_REQUEST,"이 계획에 없는 상품이에요."));
   if(item.qty()<1||item.qty()>1000000)throw new ApiException(HttpStatus.BAD_REQUEST,"입고 수량을 확인해주세요.");
   totals.merge(item.barcode(),item.qty(),Integer::sum);if(totals.get(item.barcode())>line.getQuantity()-line.getReceived())throw new ApiException(HttpStatus.BAD_REQUEST,"남은 발주 수량보다 많이 입고할 수 없어요.");
   inventory.one(a,storeId,item.barcode());clean.add(new Dto.ReceiptItem(item.barcode(),line.getName(),null,item.qty(),item.expiry()));
  }
  var result=inventory.receive(a,storeId,new Dto.ReceiptRequest(clean,"delivery-"+planId+"-"+hash(r.clientKey()).substring(0,40)));
  for(var line:p.getLines())line.receive(totals.getOrDefault(line.getBarcode(),0));p.delivered();
  var audit=new ArrayList<Map<String,Object>>();for(int i=0;i<clean.size();i++){var line=clean.get(i);var stock=result.get(i);var map=new LinkedHashMap<String,Object>();map.put("barcode",line.barcode());map.put("name",stock.name());map.put("quantity",line.qty());map.put("expiry",line.expiry());map.put("before",stock.before());map.put("after",stock.after());audit.add(map);}
  return view(deliveries.save(new OrderDelivery(p,a,r.clientKey(),fingerprint,json.writeValueAsString(audit))));
 }
}

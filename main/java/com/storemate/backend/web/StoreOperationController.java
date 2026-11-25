package com.storemate.backend.web;
import com.storemate.backend.domain.*;import com.storemate.backend.repo.*;import org.springframework.web.bind.annotation.*;import org.springframework.transaction.annotation.Transactional;import org.springframework.http.HttpStatus;import java.util.*;
@RestController @RequestMapping("/api/stores/{storeId}/operation-settings") public class StoreOperationController {
 private final StoreAccess access;private final StoreOperationSettingsRepository settings;private final StockBatchService locks;
 public StoreOperationController(StoreAccess access,StoreOperationSettingsRepository settings,StockBatchService locks){this.access=access;this.settings=settings;this.locks=locks;}
 public record Part(String id,String name,String start,String end){}
 public record View(int expirationAlertDays,int lowStockThresholdCount,List<Part> workParts,long revision){}
 private View view(StoreOperationSettings s){return new View(s.getExpirationAlertDays(),s.getLowStockThresholdCount(),s.getWorkParts().stream().map(p->new Part(p.getId(),p.getName(),p.getStart(),p.getEnd())).toList(),s.getRevision());}
 @GetMapping @Transactional(readOnly=true) public View get(@RequestAttribute(AuthInterceptor.ACCOUNT)Account account,@PathVariable Long storeId){access.requireMember(account,storeId);return view(settings.findById(storeId).orElse(new StoreOperationSettings(storeId)));}
 @PutMapping @Transactional public View put(@RequestAttribute(AuthInterceptor.ACCOUNT)Account account,@PathVariable Long storeId,@RequestBody View r){
  var store=access.requireOwner(account,storeId);locks.lock(store);if(r.expirationAlertDays()<0||r.expirationAlertDays()>365||r.lowStockThresholdCount()<0||r.lowStockThresholdCount()>1000000||r.workParts()==null||r.workParts().isEmpty()||r.workParts().size()>20)throw new ApiException(HttpStatus.BAD_REQUEST,"알림 기준과 근무 파트를 확인해주세요");
  var names=new HashSet<String>();var ids=new HashSet<String>();for(var p:r.workParts())if(p.id()==null||!p.id().matches("[A-Za-z0-9_-]{1,30}")||!ids.add(p.id())||p.name()==null||p.name().isBlank()||p.name().length()>30||!names.add(p.name())||p.start()==null||p.end()==null||!p.start().matches("([01]\\d|2[0-3]):[0-5]\\d")||!p.end().matches("([01]\\d|2[0-3]):[0-5]\\d|24:00"))throw new ApiException(HttpStatus.BAD_REQUEST,"파트 이름·시간은 중복 없이 올바르게 입력해주세요");
  var s=settings.findById(storeId).orElse(new StoreOperationSettings(storeId));if(s.getRevision()!=r.revision())throw new ApiException(HttpStatus.CONFLICT,"매장 설정이 변경됐어요. 다시 불러와주세요");s.update(r.expirationAlertDays(),r.lowStockThresholdCount(),r.workParts().stream().map(p->new StoreOperationSettings.Part(p.id(),p.name().trim(),p.start(),p.end())).toList());return view(settings.save(s));
 }
}

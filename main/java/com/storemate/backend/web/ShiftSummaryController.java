package com.storemate.backend.web;
import com.storemate.backend.domain.*;import com.storemate.backend.repo.*;
import org.springframework.web.bind.annotation.*;import org.springframework.transaction.annotation.Transactional;import java.util.*;import java.time.*;
@RestController @RequestMapping("/api/stores/{storeId}/shift-summary")
public class ShiftSummaryController {
 private final StoreAccess access;private final StoreTaskController tasks;private final HandoverController handovers;private final HandoverRepository memos;private final InventoryController inventory;private final StoreOperationSettingsRepository settings;private final StoreTemplateController templates;
 public ShiftSummaryController(StoreAccess a,StoreTaskController t,HandoverController h,HandoverRepository m,InventoryController i,StoreOperationSettingsRepository s,StoreTemplateController p){access=a;tasks=t;handovers=h;memos=m;inventory=i;settings=s;templates=p;}
 public record Expiry(String barcode,String name,int stock,String expiry,long days){}
 public record Summary(String generatedAt,List<StoreTaskController.TaskView> tasks,List<Dto.HandoverView> urgent,List<Expiry> expiry,HandoverController.Previous previous){}
 @GetMapping @Transactional(readOnly=true) public Summary get(@RequestAttribute(AuthInterceptor.ACCOUNT)Account a,@PathVariable Long storeId){
  var s=access.requireMember(a,storeId);int days=settings.findById(storeId).map(StoreOperationSettings::getExpirationAlertDays).orElse(3);
  var pending=tasks.list(a,storeId).stream().filter(t->!t.status().equals("APPROVED")).toList();
  var urgent=memos.findByStoreAndArchivedFalseAndUrgentTrueOrderByIdDesc(s).stream().map(h->handovers.view(h,a)).filter(h->!h.confirmedByMe()).toList();
  var expiry=new ArrayList<Expiry>();if(templates.get(a,storeId).expiryEnabled())for(var p:inventory.list(a,storeId)){if(p.stock()>0&&p.expiry()!=null){long left=java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(),LocalDate.parse(p.expiry()));if(left<=days)expiry.add(new Expiry(p.barcode(),p.name(),p.stock(),p.expiry(),left));}}
  expiry.sort(Comparator.comparingLong(Expiry::days));return new Summary(LocalDateTime.now().withNano(0).toString(),pending,urgent,expiry,handovers.previous(a,storeId));
 }
}


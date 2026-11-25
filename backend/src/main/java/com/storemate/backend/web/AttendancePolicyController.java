package com.storemate.backend.web;
import com.storemate.backend.domain.*;
import com.storemate.backend.repo.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
@RestController @RequestMapping("/api/stores/{storeId}/attendance-policy")
public class AttendancePolicyController {
 private final StoreAccess access;private final AttendancePolicyRepository policies;private final StockBatchService locks;
 public AttendancePolicyController(StoreAccess access,AttendancePolicyRepository policies,StockBatchService locks){this.access=access;this.policies=policies;this.locks=locks;}
 public record View(int alertAfterHours,int graceMinutes,boolean autoCloseScheduled,long revision){}
 private View view(AttendancePolicy p){return new View(p.getAlertAfterHours(),p.getGraceMinutes(),p.isAutoCloseScheduled(),p.getRevision());}
 @GetMapping @Transactional(readOnly=true) public View get(@RequestAttribute(AuthInterceptor.ACCOUNT)Account account,@PathVariable Long storeId){access.requireOwner(account,storeId);return view(policies.findById(storeId).orElse(new AttendancePolicy(storeId)));}
 @PutMapping @Transactional public View put(@RequestAttribute(AuthInterceptor.ACCOUNT)Account account,@PathVariable Long storeId,@RequestBody View r){
  var store=access.requireOwner(account,storeId);locks.lock(store);if(r.alertAfterHours()<4||r.alertAfterHours()>48||r.graceMinutes()<0||r.graceMinutes()>720)throw new ApiException(HttpStatus.BAD_REQUEST,"감지 시간은 4~48시간, 유예 시간은 0~720분이에요");
  var p=policies.findById(storeId).orElse(new AttendancePolicy(storeId));if(p.getRevision()!=r.revision())throw new ApiException(HttpStatus.CONFLICT,"설정이 변경됐어요. 새로고침해주세요");p.update(r.alertAfterHours(),r.graceMinutes(),r.autoCloseScheduled());return view(policies.save(p));
 }
}

package com.storemate.backend.web;
import com.storemate.backend.domain.*;import com.storemate.backend.repo.*;
import org.springframework.web.bind.annotation.*;import org.springframework.transaction.annotation.Transactional;import org.springframework.http.HttpStatus;
@RestController @RequestMapping("/api/stores/{storeId}/staff/{memberId}/permissions")
public class EmployeePermissionController {
 private final StoreAccess access;private final StoreMemberRepository members;private final StockBatchService locks;
 public EmployeePermissionController(StoreAccess a,StoreMemberRepository m,StockBatchService l){access=a;members=m;locks=l;}
 public record Permissions(boolean deleteProducts,boolean adjustStock,boolean saveOrderPlans,long revision,String updatedAt,String updatedBy){}
 public record Save(boolean deleteProducts,boolean adjustStock,boolean saveOrderPlans,long revision){}
 private StoreMember employee(Account a,Long sid,Long mid){access.requireOwner(a,sid);return members.findById(mid).filter(m->m.getStore().getId().equals(sid)&&m.getRole()==Role.STAFF&&m.getStatus()==MemberStatus.APPROVED).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"승인된 직원을 찾을 수 없어요."));}
 private Permissions view(StoreMember m){return new Permissions(m.canDeleteProducts(),m.canAdjustStock(),m.canSaveOrderPlans(),m.getPermissionsRevision(),m.getPermissionsUpdatedAt()==null?null:m.getPermissionsUpdatedAt().toString(),m.getPermissionsUpdatedBy());}
 @GetMapping @Transactional(readOnly=true) public Permissions get(@RequestAttribute(AuthInterceptor.ACCOUNT)Account a,@PathVariable Long storeId,@PathVariable Long memberId){return view(employee(a,storeId,memberId));}
 @PutMapping @Transactional public Permissions save(@RequestAttribute(AuthInterceptor.ACCOUNT)Account a,@PathVariable Long storeId,@PathVariable Long memberId,@RequestBody Save r){var s=access.requireOwner(a,storeId);locks.lock(s);var m=employee(a,storeId,memberId);if(m.getPermissionsRevision()!=r.revision())throw new ApiException(HttpStatus.CONFLICT,"권한이 변경됐어요. 다시 열어 확인해주세요.");m.permissions(r.deleteProducts(),r.adjustStock(),r.saveOrderPlans(),a);return view(m);}
}

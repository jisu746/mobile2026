package com.storemate.backend.web;
import com.storemate.backend.domain.*;
import com.storemate.backend.repo.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController @RequestMapping("/api/stores/{storeId}/tasks/custom")
public class StoreTaskController {
    private final StoreAccess access; private final StoreTaskRepository tasks; private final StoreMemberRepository members;
    private final EntityManager em; private final Notifier notifier;
    public StoreTaskController(StoreAccess access,StoreTaskRepository tasks,StoreMemberRepository members,EntityManager em,Notifier notifier){this.access=access;this.tasks=tasks;this.members=members;this.em=em;this.notifier=notifier;}
    public record Create(String clientKey,String title,String description,boolean urgent,Long assignedMemberId){}
    public record Assign(Long revision,Long assignedMemberId){}
    public record Report(Long revision,String note){}
    public record Review(Long revision,boolean approve,String note){}
    public record Revision(Long revision){}
    public record Edit(Long revision,String title,String description,boolean urgent){}
    @PutMapping("/{taskId}") @Transactional public TaskView edit(@RequestAttribute(AuthInterceptor.ACCOUNT)Account owner,@PathVariable Long storeId,@PathVariable Long taskId,@RequestBody Edit r){access.requireOwner(owner,storeId);var t=task(storeId,taskId,r.revision());if(!t.getStatus().equals("PENDING"))throw new ApiException(HttpStatus.CONFLICT,"대기 중인 업무만 수정할 수 있어요");t.edit(text(r.title(),100,true),text(r.description(),500,false),r.urgent());return view(t,owner);}
    public record TaskView(Long id,String title,String description,boolean urgent,String status,Long assignedMemberId,String assignee,
        String reporter,String reportedAt,String reportNote,String reviewer,String reviewedAt,String reviewNote,long revision,boolean canReport,String createdAt){}
    private void notify(Store store,Role audience,Account actor,String kind,String title,String sub,Long taskId){
        notifier.targeted(store,audience,actor,kind,title.substring(0,Math.min(100,title.length())),sub.substring(0,Math.min(200,sub.length())),taskId);
    }
    private String text(String value,int max,boolean required){
        String s=value==null?"":value.trim();
        if((required&&s.isEmpty())||s.length()>max)throw new ApiException(HttpStatus.BAD_REQUEST,"입력 내용의 길이를 확인해주세요 (최대 "+max+"자)");
        return s;
    }
    private StoreMember assignee(Store store,Long memberId){
        if(memberId==null)return null;
        return members.findById(memberId).filter(m->m.getStore().getId().equals(store.getId())&&m.getRole()==Role.STAFF&&m.getStatus()==MemberStatus.APPROVED)
          .orElseThrow(()->new ApiException(HttpStatus.BAD_REQUEST,"현재 매장의 승인된 직원을 선택해주세요"));
    }
    private StoreTask task(Long storeId,Long taskId,Long revision){
        StoreTask t=tasks.findLockedById(taskId).filter(x->x.getStore().getId().equals(storeId)&&!x.isArchived())
          .orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"업무를 찾을 수 없어요"));
        if(revision==null||revision!=t.getRevision())throw new ApiException(HttpStatus.CONFLICT,"업무가 변경됐어요. 새로고침 후 다시 확인해주세요");
        return t;
    }
    private TaskView view(StoreTask t,Account caller){
        Long memberId=t.getAssignedTo()==null?null:members.findByAccountAndStore(t.getAssignedTo(),t.getStore()).map(StoreMember::getId).orElse(null);
        boolean can=caller.getRole()==Role.STAFF&&t.getStatus().equals("PENDING")&&(t.getAssignedTo()==null||t.getAssignedTo().getId().equals(caller.getId()));
        return new TaskView(t.getId(),t.getTitle(),t.getDescription(),t.isUrgent(),t.getStatus(),memberId,t.getAssignedTo()==null?null:t.getAssignedTo().getName(),
          t.getReportedBy()==null?null:t.getReportedBy().getName(),t.getReportedAt()==null?null:t.getReportedAt().toString(),t.getReportNote(),
          t.getReviewedBy()==null?null:t.getReviewedBy().getName(),t.getReviewedAt()==null?null:t.getReviewedAt().toString(),t.getReviewNote(),t.getRevision(),can,t.getCreatedAt().toString());
    }
    @GetMapping @Transactional(readOnly=true)
    public List<TaskView> list(@RequestAttribute(AuthInterceptor.ACCOUNT)Account account,@PathVariable Long storeId){
        Store store=access.requireMember(account,storeId);
        return tasks.findByStoreAndArchivedFalseOrderByIdDesc(store).stream().map(t->view(t,account)).toList();
    }
    @PostMapping @Transactional
    public TaskView create(@RequestAttribute(AuthInterceptor.ACCOUNT)Account owner,@PathVariable Long storeId,@RequestBody Create request){
        Store store=access.requireOwner(owner,storeId);
        String key=text(request.clientKey(),120,true),title=text(request.title(),100,true),desc=text(request.description(),500,false);
        // Serialize idempotent imports/retries within this store.
        em.lock(store,LockModeType.PESSIMISTIC_WRITE);
        var prior=tasks.findByStoreAndClientKey(store,key);
        if(prior.isPresent()){
            if(prior.get().isArchived())throw new ApiException(HttpStatus.CONFLICT,"이미 가져온 뒤 삭제한 업무예요");
            return view(prior.get(),owner);
        }
        StoreMember person=assignee(store,request.assignedMemberId());
        StoreTask t=tasks.save(new StoreTask(store,owner,key,title,desc,request.urgent(),person==null?null:person.getAccount()));
        notify(store,Role.STAFF,owner,"task","새 업무: "+title,person==null?"담당자 미지정":person.getAccount().getName()+" 담당",t.getId());
        return view(t,owner);
    }
    @PutMapping("/{taskId}/assignee") @Transactional
    public TaskView assign(@RequestAttribute(AuthInterceptor.ACCOUNT)Account owner,@PathVariable Long storeId,@PathVariable Long taskId,@RequestBody Assign request){
        Store store=access.requireOwner(owner,storeId);StoreTask t=task(storeId,taskId,request.revision());
        if(!t.getStatus().equals("PENDING"))throw new ApiException(HttpStatus.CONFLICT,"대기 중인 업무만 담당자를 바꿀 수 있어요");
        StoreMember m=assignee(store,request.assignedMemberId());t.assign(m==null?null:m.getAccount());
        return view(t,owner);
    }
    @PostMapping("/{taskId}/report") @Transactional
    public TaskView report(@RequestAttribute(AuthInterceptor.ACCOUNT)Account staff,@PathVariable Long storeId,@PathVariable Long taskId,@RequestBody Report request){
        Store store=access.requireMember(staff,storeId);
        if(staff.getRole()!=Role.STAFF)throw new ApiException(HttpStatus.FORBIDDEN,"직원만 완료 보고할 수 있어요");
        StoreTask t=task(storeId,taskId,request.revision());
        if(!t.getStatus().equals("PENDING"))throw new ApiException(HttpStatus.CONFLICT,"이미 보고하거나 완료된 업무예요");
        if(t.getAssignedTo()!=null&&!t.getAssignedTo().getId().equals(staff.getId()))throw new ApiException(HttpStatus.FORBIDDEN,"담당 직원만 보고할 수 있어요");
        t.report(staff,text(request.note(),500,false));
        notify(store,Role.OWNER,staff,"task",t.getTitle()+" 완료 보고",staff.getName()+" · 승인 대기",t.getId());
        return view(t,staff);
    }
    @PostMapping("/{taskId}/review") @Transactional
    public TaskView review(@RequestAttribute(AuthInterceptor.ACCOUNT)Account owner,@PathVariable Long storeId,@PathVariable Long taskId,@RequestBody Review request){
        Store store=access.requireOwner(owner,storeId);StoreTask t=task(storeId,taskId,request.revision());
        if(!t.getStatus().equals("SUBMITTED"))throw new ApiException(HttpStatus.CONFLICT,"완료 보고된 업무만 검토할 수 있어요");
        t.review(owner,request.approve(),text(request.note(),500,!request.approve()));
        notify(store,Role.STAFF,owner,"task",t.getTitle()+(request.approve()?" 승인됨":" 반려됨"),request.approve()?"업무 완료":t.getReviewNote(),t.getId());
        return view(t,owner);
    }
    @DeleteMapping("/{taskId}") @Transactional
    public void remove(@RequestAttribute(AuthInterceptor.ACCOUNT)Account owner,@PathVariable Long storeId,@PathVariable Long taskId,@RequestBody Revision request){
        access.requireOwner(owner,storeId);task(storeId,taskId,request.revision()).archive();
    }
}

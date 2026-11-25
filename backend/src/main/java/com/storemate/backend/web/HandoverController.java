package com.storemate.backend.web;
import com.storemate.backend.domain.*;
import com.storemate.backend.repo.*;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController @RequestMapping("/api/stores/{storeId}/handovers")
public class HandoverController {
 private final HandoverContextService context;private final StoreAccess access;private final HandoverRepository handovers;private final HandoverConfirmationRepository confirmations;private final Notifier notifier;
 public HandoverController(StoreAccess access,HandoverRepository handovers,HandoverConfirmationRepository confirmations,Notifier notifier,HandoverContextService context){this.context=context;this.access=access;this.handovers=handovers;this.confirmations=confirmations;this.notifier=notifier;}
 @org.springframework.beans.factory.annotation.Autowired private StoreTaskRepository tasks;
 public record Edit(String content,boolean urgent,Long revision,String title,Long relatedTaskId){public Edit(String content,boolean urgent,Long revision){this(content,urgent,revision,null,null);}}
 private void describe(Handover h,String title,Long taskId){String value=title==null||title.isBlank()?h.getContent().substring(0,Math.min(30,h.getContent().length())):title.trim();if(value.length()>100)throw new ApiException(HttpStatus.BAD_REQUEST,"제목은 100자 이하로 입력해주세요");StoreTask task=taskId==null?null:tasks.findById(taskId).filter(t->t.getStore().getId().equals(h.getStore().getId())&&!t.isArchived()).orElseThrow(()->new ApiException(HttpStatus.BAD_REQUEST,"현재 매장의 업무를 선택해주세요"));h.describe(value,task);}
 public record Revision(Long revision){}
 public record Resolve(boolean done,Long revision){}
 private boolean mine(Handover h,Account me){return h.getAuthor().getId().equals(me.getId());}
 private boolean owner(Handover h,Account me){return h.getStore().getOwner().getId().equals(me.getId());}
 Dto.HandoverView view(Handover h,Account me){
  var checks=confirmations.findByHandoverAndContentRevisionOrderByConfirmedAtAsc(h,h.getRevision()).stream().map(c->new Dto.HandoverConfirmationView(c.getAccount().getName(),c.getConfirmedAt().toString(),c.getAccount().getId().equals(me.getId()))).toList();
  return new Dto.HandoverView(h.getId(),h.getAuthor().getName(),mine(h,me),h.getContent(),h.isUrgent(),h.isResolved(),h.getCreatedAt().toString(),h.getRevision(),h.getUpdatedAt()==null?null:h.getUpdatedAt().toString(),mine(h,me),mine(h,me)||owner(h,me),checks.stream().anyMatch(Dto.HandoverConfirmationView::mine),checks,h.getTitle(),h.getRelatedTask()==null?null:h.getRelatedTask().getId(),h.getRelatedTask()==null?null:h.getRelatedTask().getTitle(),h.getRelatedTask()==null?null:h.getRelatedTask().getStatus());
 }
 private String text(String value){String s=value==null?"":value.trim();if(s.isEmpty()||s.length()>500)throw new ApiException(HttpStatus.BAD_REQUEST,"내용은 1~500자로 입력해주세요");return s;}
 private Handover locked(Long storeId,Long id,Long revision){
  Handover h=handovers.findLockedById(id).filter(x->!x.isArchived()&&x.getStore().getId().equals(storeId)).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"인수인계를 찾을 수 없어요"));
  if(revision==null||revision!=h.getRevision())throw new ApiException(HttpStatus.CONFLICT,"메모 내용이 변경됐어요. 새로고침 후 다시 확인해주세요");return h;
 }
 @GetMapping @Transactional(readOnly=true)
 public List<Dto.HandoverView> list(@RequestAttribute(AuthInterceptor.ACCOUNT)Account account,@PathVariable Long storeId){return handovers.findTop20ByStoreAndArchivedFalseOrderByIdDesc(access.requireMember(account,storeId)).stream().map(h->view(h,account)).toList();}
 public record Previous(String author,String workPart,String clockIn,String clockOut,List<Dto.HandoverView> items){}
 @GetMapping("/previous") @Transactional(readOnly=true)
 public Previous previous(@RequestAttribute(AuthInterceptor.ACCOUNT)Account account,@PathVariable Long storeId){
  Store store=access.requireMember(account,storeId);
  return context.previous(account,store).map(c->new Previous(c.session().getAccount().getName(),c.part(),c.session().getClockIn().toString(),c.session().getClockOut().toString(),c.memos().stream().map(h->view(h,account)).toList())).orElse(new Previous(null,null,null,null,List.of()));
 }
 @PostMapping @Transactional
 public Dto.HandoverView create(@RequestAttribute(AuthInterceptor.ACCOUNT)Account account,@PathVariable Long storeId,@RequestBody Dto.HandoverRequest request){
  Store store=access.requireMember(account,storeId);String content=text(request.content());Handover h=new Handover(store,account,content,request.urgent());context.attach(h,account,store);describe(h,request.title(),request.relatedTaskId());h=handovers.save(h);
  String title=account.getName()+" 님이 "+(request.urgent()?"긴급 ":"")+"인수인계를 남겼어요";
  notifier.send(store,Role.STAFF,account,"handover",title.substring(0,Math.min(100,title.length())),content.substring(0,Math.min(60,content.length())));return view(h,account);
 }
 @PutMapping("/{id}") @Transactional
 public Dto.HandoverView edit(@RequestAttribute(AuthInterceptor.ACCOUNT)Account account,@PathVariable Long storeId,@PathVariable Long id,@RequestBody Edit request){
  access.requireMember(account,storeId);Handover h=locked(storeId,id,request.revision());if(!mine(h,account))throw new ApiException(HttpStatus.FORBIDDEN,"본인이 작성한 메모만 수정할 수 있어요");h.edit(text(request.content()),request.urgent());describe(h,request.title(),request.relatedTaskId());return view(h,account);
 }
 @DeleteMapping("/{id}") @Transactional
 public void remove(@RequestAttribute(AuthInterceptor.ACCOUNT)Account account,@PathVariable Long storeId,@PathVariable Long id,@RequestBody Revision request){
  access.requireMember(account,storeId);Handover h=locked(storeId,id,request.revision());if(!mine(h,account)&&!owner(h,account))throw new ApiException(HttpStatus.FORBIDDEN,"작성자 또는 매장 관리자만 삭제할 수 있어요");h.archive();
 }
 @PostMapping("/{id}/resolve") @Transactional
 public Dto.HandoverView resolve(@RequestAttribute(AuthInterceptor.ACCOUNT)Account account,@PathVariable Long storeId,@PathVariable Long id,@RequestBody Resolve request){
  access.requireMember(account,storeId);Handover h=locked(storeId,id,request.revision());
  var existing=confirmations.findByHandoverAndAccountAndContentRevision(h,account,h.getRevision());
  if(request.done()&&existing.isEmpty())confirmations.save(new HandoverConfirmation(h,account));if(!request.done()&&existing.isPresent())confirmations.delete(existing.get());confirmations.flush();
  if(request.done()||existing.isPresent())h.setResolved(!confirmations.findByHandoverAndContentRevisionOrderByConfirmedAtAsc(h,h.getRevision()).isEmpty());return view(h,account);
 }
}

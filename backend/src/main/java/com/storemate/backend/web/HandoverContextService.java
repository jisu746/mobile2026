package com.storemate.backend.web;
import com.storemate.backend.domain.*;
import com.storemate.backend.repo.*;
import org.springframework.stereotype.Service;
import java.time.*;
import java.util.*;
@Service public class HandoverContextService {
 private final WorkSessionRepository sessions;private final StoreMemberRepository members;private final HandoverRepository memos;
 public HandoverContextService(WorkSessionRepository sessions,StoreMemberRepository members,HandoverRepository memos){this.sessions=sessions;this.members=members;this.memos=memos;}
 public void attach(Handover memo,Account author,Store store){
  var now=LocalDateTime.now();var work=sessions.findFirstByAccountAndStoreAndClockInLessThanEqualOrderByClockInDesc(author,store,now);
  var member=members.findByAccountAndStore(author,store);
  work.filter(w->w.getClockOut()==null||w.getClockOut().isAfter(now.minusHours(2))).ifPresent(w->memo.attachWork(w,member.map(StoreMember::getWorkPart).orElse(null)));
 }
 public record Context(WorkSession session,String part,List<Handover> memos){}
 public Optional<Context> previous(Account account,Store store){
  LocalDateTime boundary=sessions.findFirstByAccountAndStoreAndClockOutIsNull(account,store).map(WorkSession::getClockIn).orElse(LocalDateTime.now());
  return sessions.findFirstByStoreAndAccountNotAndClockOutLessThanEqualOrderByClockOutDescIdDesc(store,account,boundary).map(w->{
   var list=memos.findByWorkSessionAndArchivedFalseOrderByIdDesc(w);
   // Legacy notes are matched to their actual author's shift window, never to an arbitrary latest note.
   var legacy=memos.findByStoreAndAuthorAndWorkSessionIsNullAndArchivedFalseAndCreatedAtBetweenOrderByIdDesc(store,w.getAccount(),w.getClockIn(),w.getClockOut());
   var all=new ArrayList<>(list);all.addAll(legacy);all.sort(Comparator.comparing(Handover::getCreatedAt).reversed());
   String part=list.stream().map(Handover::getWorkPart).filter(Objects::nonNull).findFirst().orElse(null);
   return new Context(w,part,all);
  });
 }
}

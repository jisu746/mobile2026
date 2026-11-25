package com.storemate.backend.web;
import com.storemate.backend.domain.*;
import com.storemate.backend.repo.*;
import org.junit.jupiter.api.*;
import org.springframework.http.HttpStatus;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class HandoverWorkflowTest {
 StoreAccess access=mock(StoreAccess.class);HandoverRepository handovers=mock(HandoverRepository.class);
 HandoverConfirmationRepository checks=mock(HandoverConfirmationRepository.class);Notifier notifier=mock(Notifier.class);
 Account author=mock(Account.class),other=mock(Account.class),owner=mock(Account.class);Store store=mock(Store.class);Handover memo;HandoverController controller;
 Map<Long,List<HandoverConfirmation>> rows=new HashMap<>();
 @BeforeEach void setup() throws Exception {
  when(author.getId()).thenReturn(7L);when(author.getName()).thenReturn("crew2");when(other.getId()).thenReturn(8L);when(other.getName()).thenReturn("crew3");when(owner.getId()).thenReturn(1L);when(owner.getName()).thenReturn("owner");
  when(store.getId()).thenReturn(3L);when(store.getOwner()).thenReturn(owner);
  for(Account account:List.of(author,other,owner))when(access.requireMember(account,3L)).thenReturn(store);
  memo=new Handover(store,author,"냉장고 확인",true);var id=Handover.class.getDeclaredField("id");id.setAccessible(true);id.set(memo,9L);
  when(handovers.findLockedById(9L)).thenReturn(Optional.of(memo));
  when(checks.findByHandoverAndContentRevisionOrderByConfirmedAtAsc(eq(memo),anyLong())).thenAnswer(a->new ArrayList<>(rows.getOrDefault(a.getArgument(1),List.of())));
  when(checks.findByHandoverAndAccountAndContentRevision(eq(memo),any(),anyLong())).thenAnswer(a->rows.getOrDefault(a.getArgument(2),List.of()).stream().filter(c->c.getAccount()==a.getArgument(1)).findFirst());
  when(checks.save(any())).thenAnswer(a->{HandoverConfirmation c=a.getArgument(0);rows.computeIfAbsent(memo.getRevision(),key->new ArrayList<>()).add(c);return c;});
  doAnswer(a->{rows.values().forEach(list->list.remove(a.getArgument(0)));return null;}).when(checks).delete(any());
  controller=new HandoverController(access,handovers,checks,notifier,mock(HandoverContextService.class));
 }
 @Test void authorCanEditAndRevisionAdvances(){var result=controller.edit(author,3L,9L,new HandoverController.Edit(" 수정 ",true,0L));assertEquals("수정",result.content());assertEquals(1,result.revision());assertNotNull(result.updatedAt());assertTrue(result.canEdit());}
 @Test void othersIncludingOwnerCannotRewriteAuthorsWords(){for(Account account:List.of(other,owner))assertThrows(ApiException.class,()->controller.edit(account,3L,9L,new HandoverController.Edit("다른 내용",true,0L)));assertEquals("냉장고 확인",memo.getContent());}
 @Test void onlyAuthorOrStoreOwnerCanDelete(){assertThrows(ApiException.class,()->controller.remove(other,3L,9L,new HandoverController.Revision(0L)));controller.remove(owner,3L,9L,new HandoverController.Revision(0L));assertTrue(memo.isArchived());assertThrows(ApiException.class,()->controller.resolve(other,3L,9L,new HandoverController.Resolve(true,1L)));}
 @Test void authorCanDeleteOwnMemo(){controller.remove(author,3L,9L,new HandoverController.Revision(0L));assertTrue(memo.isArchived());}
 @Test void individualChecksStoreNamesAndDoNotDuplicate(){
  var first=controller.resolve(other,3L,9L,new HandoverController.Resolve(true,0L));assertTrue(first.confirmedByMe());assertEquals("crew3",first.confirmations().getFirst().name());assertNotNull(first.confirmations().getFirst().confirmedAt());
  controller.resolve(other,3L,9L,new HandoverController.Resolve(true,0L));verify(checks,times(1)).save(any());
 }
 @Test void cancelOnlyRemovesCallersOwnConfirmation(){
  controller.resolve(author,3L,9L,new HandoverController.Resolve(true,0L));controller.resolve(other,3L,9L,new HandoverController.Resolve(true,0L));
  var result=controller.resolve(other,3L,9L,new HandoverController.Resolve(false,0L));assertFalse(result.confirmedByMe());assertTrue(result.resolved());assertEquals(1,result.confirmations().size());assertEquals("crew2",result.confirmations().getFirst().name());
 }
 @Test void cancellingWithoutOwnCheckCannotEraseOthers(){controller.resolve(author,3L,9L,new HandoverController.Resolve(true,0L));var result=controller.resolve(other,3L,9L,new HandoverController.Resolve(false,0L));assertTrue(result.resolved());verify(checks,never()).delete(any());}
 @Test void editingRequiresNewChecksButPreservesEarlierRecords(){
  controller.resolve(other,3L,9L,new HandoverController.Resolve(true,0L));
  var edited=controller.edit(author,3L,9L,new HandoverController.Edit("수정된 긴급 내용",true,0L));assertFalse(edited.resolved());assertTrue(edited.confirmations().isEmpty());assertEquals(1,rows.get(0L).size());
  assertThrows(ApiException.class,()->controller.resolve(other,3L,9L,new HandoverController.Resolve(true,0L)));
  assertTrue(controller.resolve(other,3L,9L,new HandoverController.Resolve(true,1L)).confirmedByMe());assertEquals(1,rows.get(1L).size());
 }
 @Test void staleEditAndDeleteCannotOverwriteNewVersion(){controller.edit(author,3L,9L,new HandoverController.Edit("새 내용",true,0L));assertThrows(ApiException.class,()->controller.edit(author,3L,9L,new HandoverController.Edit("이전 화면",true,0L)));assertThrows(ApiException.class,()->controller.remove(author,3L,9L,new HandoverController.Revision(0L)));}
 @Test void ordinaryMemoCanTrackReadWithoutBecomingUrgent(){memo.edit("일반",false);var result=controller.resolve(other,3L,9L,new HandoverController.Resolve(true,1L));assertFalse(result.urgent());assertTrue(result.confirmedByMe());assertEquals(1,result.confirmations().size());}
 @Test void otherStoreAndNonMembersCannotModify(){
  when(access.requireMember(other,3L)).thenThrow(new ApiException(HttpStatus.FORBIDDEN,"소속 아님"));assertThrows(ApiException.class,()->controller.resolve(other,3L,9L,new HandoverController.Resolve(true,0L)));
  when(store.getId()).thenReturn(55L);assertThrows(ApiException.class,()->controller.edit(author,3L,9L,new HandoverController.Edit("내용",true,0L)));
 }
 @Test void invalidTextIsRejected(){for(String content:new String[]{null," ","a".repeat(501)})assertThrows(ApiException.class,()->controller.edit(author,3L,9L,new HandoverController.Edit(content,true,0L)));assertEquals(0,memo.getRevision());}
 @Test void listShowsOnlyNonArchivedRecentItems(){when(handovers.findTop20ByStoreAndArchivedFalseOrderByIdDesc(store)).thenReturn(List.of(memo));var result=controller.list(other,3L);assertFalse(result.getFirst().canEdit());assertFalse(result.getFirst().canDelete());assertFalse(result.getFirst().confirmedByMe());}
}

package com.storemate.backend.web;
import com.storemate.backend.domain.*;
import com.storemate.backend.repo.*;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.springframework.http.HttpStatus;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class StoreTaskWorkflowTest {
    StoreAccess access=mock(StoreAccess.class);StoreTaskRepository tasks=mock(StoreTaskRepository.class);
    StoreMemberRepository members=mock(StoreMemberRepository.class);EntityManager em=mock(EntityManager.class);Notifier notifier=mock(Notifier.class);
    Store store=mock(Store.class);Account owner=mock(Account.class),staff=mock(Account.class),other=mock(Account.class);
    StoreMember member=mock(StoreMember.class);StoreTaskController controller;StoreTask task;
    @BeforeEach void setup() throws Exception {
        when(store.getId()).thenReturn(3L);when(owner.getId()).thenReturn(1L);when(owner.getName()).thenReturn("owner");when(owner.getRole()).thenReturn(Role.OWNER);
        when(staff.getId()).thenReturn(7L);when(staff.getName()).thenReturn("crew2");when(staff.getRole()).thenReturn(Role.STAFF);
        when(other.getId()).thenReturn(10L);when(other.getRole()).thenReturn(Role.STAFF);
        when(access.requireOwner(owner,3L)).thenReturn(store);when(access.requireMember(staff,3L)).thenReturn(store);when(access.requireMember(owner,3L)).thenReturn(store);when(access.requireMember(other,3L)).thenReturn(store);
        when(member.getId()).thenReturn(8L);when(member.getStore()).thenReturn(store);when(member.getRole()).thenReturn(Role.STAFF);when(member.getStatus()).thenReturn(MemberStatus.APPROVED);when(member.getAccount()).thenReturn(staff);
        when(members.findById(8L)).thenReturn(Optional.of(member));when(members.findByAccountAndStore(staff,store)).thenReturn(Optional.of(member));
        task=new StoreTask(store,owner,"test-key","좌석 정리","테이블",false,staff);
        setId(task);when(tasks.findLockedById(9L)).thenReturn(Optional.of(task));
        when(tasks.save(any())).thenAnswer(a->{StoreTask t=a.getArgument(0);setId(t);return t;});
        controller=new StoreTaskController(access,tasks,members,em,notifier);
    }
    void setId(StoreTask task) throws Exception {var f=StoreTask.class.getDeclaredField("id");f.setAccessible(true);f.set(task,9L);}
    StoreTaskController.Create input(String key){return new StoreTaskController.Create(key," 좌석 정리 "," 테이블 ",false,8L);}
    @Test void createUsesServerAndAssignment(){
        var result=controller.create(owner,3L,input("key"));assertEquals("좌석 정리",result.title());assertEquals("crew2",result.assignee());assertEquals(8L,result.assignedMemberId());assertEquals("PENDING",result.status());
        verify(em).lock(store,jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);verify(tasks).save(any());verify(notifier).targeted(eq(store),eq(Role.STAFF),eq(owner),eq("task"),anyString(),anyString(),eq(9L));
    }
    @Test void retriesAndImportsAreIdempotent(){
        when(tasks.findByStoreAndClientKey(store,"key")).thenReturn(Optional.of(task));
        assertEquals(9L,controller.create(owner,3L,input("key")).id());verify(tasks,never()).save(any());verifyNoInteractions(notifier);
        task.archive();assertThrows(ApiException.class,()->controller.create(owner,3L,input("key")));
    }
    @Test void assignedStaffReportThenOwnerApproves(){
        var submitted=controller.report(staff,3L,9L,new StoreTaskController.Report(0L,"정리 완료"));assertEquals("SUBMITTED",submitted.status());assertEquals("crew2",submitted.reporter());assertFalse(submitted.canReport());
        var approved=controller.review(owner,3L,9L,new StoreTaskController.Review(1L,true,"확인"));assertEquals("APPROVED",approved.status());assertEquals("owner",approved.reviewer());assertEquals(2,approved.revision());
    }
    @Test void rejectionRequiresReasonAndAllowsNewReport(){
        controller.report(staff,3L,9L,new StoreTaskController.Report(0L,"완료"));
        assertThrows(ApiException.class,()->controller.review(owner,3L,9L,new StoreTaskController.Review(1L,false," ")));
        var rejected=controller.review(owner,3L,9L,new StoreTaskController.Review(1L,false,"다시 닦아주세요"));assertEquals("PENDING",rejected.status());assertEquals("다시 닦아주세요",rejected.reviewNote());
        var resubmitted=controller.report(staff,3L,9L,new StoreTaskController.Report(2L,"다시 완료"));assertEquals("SUBMITTED",resubmitted.status());assertNull(resubmitted.reviewer());
    }
    @Test void otherEmployeeAndOwnerCannotReport(){
        assertThrows(ApiException.class,()->controller.report(other,3L,9L,new StoreTaskController.Report(0L,"완료")));
        assertThrows(ApiException.class,()->controller.report(owner,3L,9L,new StoreTaskController.Report(0L,"완료")));
        assertEquals("PENDING",task.getStatus());
    }
    @Test void unassignedTaskCanBeReportedByApprovedStaff(){
        task.assign(null);var result=controller.report(other,3L,9L,new StoreTaskController.Report(1L,"완료"));assertEquals("SUBMITTED",result.status());
    }
    @Test void staleRevisionCannotReviewNewSubmission(){
        controller.report(staff,3L,9L,new StoreTaskController.Report(0L,"완료"));
        controller.review(owner,3L,9L,new StoreTaskController.Review(1L,false,"다시"));
        controller.report(staff,3L,9L,new StoreTaskController.Report(2L,"다시 완료"));
        assertThrows(ApiException.class,()->controller.review(owner,3L,9L,new StoreTaskController.Review(1L,true,"")));
        assertEquals("SUBMITTED",task.getStatus());
    }
    @Test void illegalStatesCannotBeReassignedApprovedOrReported(){
        assertThrows(ApiException.class,()->controller.review(owner,3L,9L,new StoreTaskController.Review(0L,true,"")));
        controller.report(staff,3L,9L,new StoreTaskController.Report(0L,""));
        assertThrows(ApiException.class,()->controller.assign(owner,3L,9L,new StoreTaskController.Assign(1L,null)));
        assertThrows(ApiException.class,()->controller.report(staff,3L,9L,new StoreTaskController.Report(1L,"")));
    }
    @Test void nonOwnerCannotCreateAssignReviewOrDelete(){
        when(access.requireOwner(staff,3L)).thenThrow(new ApiException(HttpStatus.FORBIDDEN,"권한 없음"));
        assertThrows(ApiException.class,()->controller.create(staff,3L,input("key")));
        assertThrows(ApiException.class,()->controller.assign(staff,3L,9L,new StoreTaskController.Assign(0L,null)));
        assertThrows(ApiException.class,()->controller.review(staff,3L,9L,new StoreTaskController.Review(0L,true,"")));
        assertThrows(ApiException.class,()->controller.remove(staff,3L,9L,new StoreTaskController.Revision(0L)));
        verifyNoInteractions(tasks);
    }
    @Test void crossStoreAndRejectedAssigneesAreRejected(){
        var elsewhere=mock(Store.class);when(elsewhere.getId()).thenReturn(55L);when(member.getStore()).thenReturn(elsewhere);
        assertThrows(ApiException.class,()->controller.create(owner,3L,input("key")));
        when(member.getStore()).thenReturn(store);when(member.getStatus()).thenReturn(MemberStatus.REJECTED);
        assertThrows(ApiException.class,()->controller.create(owner,3L,input("key2")));
        when(tasks.findLockedById(9L)).thenReturn(Optional.of(new StoreTask(elsewhere,owner,"k","other","",false,null)));
        assertThrows(ApiException.class,()->controller.report(staff,3L,9L,new StoreTaskController.Report(0L,"")));
    }
    @Test void archivingHidesTaskAndCannotResurrect(){
        controller.remove(owner,3L,9L,new StoreTaskController.Revision(0L));assertTrue(task.isArchived());
        assertThrows(ApiException.class,()->controller.report(staff,3L,9L,new StoreTaskController.Report(1L,"")));
    }
    @Test void invalidTextCannotCreate(){
        for(String title:new String[]{null," ","x".repeat(101)})assertThrows(ApiException.class,()->controller.create(owner,3L,new StoreTaskController.Create("key",title,"",false,null)));
        verify(tasks,never()).save(any());
    }
    @Test void longTaskTitlesAndReviewNotesFitNotificationColumns(){
        controller.create(owner,3L,new StoreTaskController.Create("key","x".repeat(100),"",false,null));
        controller.report(staff,3L,9L,new StoreTaskController.Report(0L,""));
        controller.review(owner,3L,9L,new StoreTaskController.Review(1L,false,"r".repeat(500)));
        var title=org.mockito.ArgumentCaptor.forClass(String.class);var sub=org.mockito.ArgumentCaptor.forClass(String.class);
        verify(notifier,atLeastOnce()).targeted(any(),any(),any(),anyString(),title.capture(),sub.capture(),anyLong());
        assertTrue(title.getAllValues().stream().allMatch(s->s.length()<=100));assertTrue(sub.getAllValues().stream().allMatch(s->s.length()<=200));
    }
    @Test void listUsesStoreScopeAndComputesReportPermission(){
        when(tasks.findByStoreAndArchivedFalseOrderByIdDesc(store)).thenReturn(List.of(task));
        assertTrue(controller.list(staff,3L).getFirst().canReport());assertFalse(controller.list(other,3L).getFirst().canReport());
    }
}

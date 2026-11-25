package com.storemate.backend.web;
import com.storemate.backend.domain.*;
import com.storemate.backend.repo.*;
import org.junit.jupiter.api.*;
import java.time.LocalDateTime;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class WorkCorrectionTest {
    StoreAccess access=mock(StoreAccess.class);
    StoreMemberRepository members=mock(StoreMemberRepository.class);
    WorkSessionRepository sessions=mock(WorkSessionRepository.class);
    Account owner=mock(Account.class),staff=mock(Account.class);
    Store store=mock(Store.class);
    StoreMember member=mock(StoreMember.class);
    WorkCorrectionController controller;
    WorkSession session;
    LocalDateTime start=LocalDateTime.now().withNano(0).minusDays(2);
    @BeforeEach void setup() throws Exception {
        when(store.getId()).thenReturn(3L);when(staff.getId()).thenReturn(7L);when(owner.getName()).thenReturn("owner");
        when(access.requireOwner(owner,3L)).thenReturn(store);
        when(member.getStore()).thenReturn(store);when(member.getAccount()).thenReturn(staff);
        when(member.getRole()).thenReturn(Role.STAFF);when(member.getStatus()).thenReturn(MemberStatus.APPROVED);
        when(members.findById(8L)).thenReturn(Optional.of(member));
        session=new WorkSession(staff,store);
        var field=WorkSession.class.getDeclaredField("clockIn");field.setAccessible(true);field.set(session,start);
        when(sessions.findLockedById(9L)).thenReturn(Optional.of(session));
        controller=new WorkCorrectionController(access,members,sessions);
    }
    WorkCorrectionController.CloseRequest request(LocalDateTime time,String reason){return new WorkCorrectionController.CloseRequest(time.format(java.time.format.DateTimeFormatter.ofPattern("uuuu-MM-dd'T'HH:mm:ss")),reason);}
    @Test void closesWithAuditAndPreservesWage(){
        session.assignWage(12000,"SNAPSHOT",null);
        var end=start.plusHours(8);var result=controller.close(owner,3L,8L,9L,request(end," 직원 확인 "));
        assertEquals(end,session.getClockOut());assertEquals(12000,result.hourlyWage());assertEquals("SNAPSHOT",result.wageSource());
        assertSame(owner,session.getClockOutCorrectedBy());assertNotNull(session.getClockOutCorrectedAt());
        assertEquals("직원 확인",result.correctionReason());assertEquals("owner",result.correctedBy());
    }
    @Test void unconfirmedWageRemainsUnconfirmed(){assertNull(controller.close(owner,3L,8L,9L,request(start.plusHours(1),"확인")).hourlyWage());}
    @Test void cannotOverwriteAlreadyClosedSession(){
        controller.close(owner,3L,8L,9L,request(start.plusHours(1),"확인"));
        assertThrows(ApiException.class,()->controller.close(owner,3L,8L,9L,request(start.plusHours(2),"다시")));
        assertThrows(IllegalStateException.class,session::clockOut);assertEquals(start.plusHours(1),session.getClockOut());
    }
    @Test void rejectsBeforeOrSameStartAndFuture(){
        for(var end:new LocalDateTime[]{start,start.minusSeconds(1),LocalDateTime.now().plusHours(1)})
            assertThrows(ApiException.class,()->controller.close(owner,3L,8L,9L,request(end,"확인")));
        assertNull(session.getClockOut());
    }
    @Test void rejectsMalformedAndImpossibleDate(){
        for(String time:new String[]{null,"2026-02-30T18:00:00","2026-11-23","2026-11-23T25:00:00"})
            assertThrows(ApiException.class,()->controller.close(owner,3L,8L,9L,new WorkCorrectionController.CloseRequest(time,"확인")));
    }
    @Test void rejectsEmptyOrExcessiveReason(){
        for(String reason:new String[]{null,"  ","x".repeat(301)})assertThrows(ApiException.class,()->controller.close(owner,3L,8L,9L,request(start.plusHours(1),reason)));
    }
    @Test void nonOwnerCannotReadOrChangeSession(){
        when(access.requireOwner(owner,3L)).thenThrow(new ApiException(org.springframework.http.HttpStatus.FORBIDDEN,"권한 없음"));
        assertThrows(ApiException.class,()->controller.close(owner,3L,8L,9L,request(start.plusHours(1),"확인")));
        verifyNoInteractions(members,sessions);
    }
    @Test void otherStoreOrEmployeeCannotBeChanged(){
        var other=mock(Account.class);when(other.getId()).thenReturn(99L);
        when(sessions.findLockedById(9L)).thenReturn(Optional.of(new WorkSession(other,store)));
        assertThrows(ApiException.class,()->controller.close(owner,3L,8L,9L,request(start.plusHours(1),"확인")));
        var otherStore=mock(Store.class);when(otherStore.getId()).thenReturn(99L);
        when(sessions.findLockedById(9L)).thenReturn(Optional.of(new WorkSession(staff,otherStore)));
        assertThrows(ApiException.class,()->controller.close(owner,3L,8L,9L,request(start.plusHours(1),"확인")));
    }
    @Test void rejectedMembershipCannotBeChanged(){
        when(member.getStatus()).thenReturn(MemberStatus.REJECTED);
        assertThrows(ApiException.class,()->controller.close(owner,3L,8L,9L,request(start.plusHours(1),"확인")));
        verifyNoInteractions(sessions);
    }
    @Test void employeeClockOutUsesSameRowLock(){
        when(access.requireMember(staff,3L)).thenReturn(store);
        var id=mock(WorkSession.class);when(id.getId()).thenReturn(9L);
        when(sessions.findFirstByAccountAndStoreAndClockOutIsNull(staff,store)).thenReturn(Optional.of(id));
        var work=new WorkController(access,sessions,mock(Notifier.class),false,mock(WageService.class));
        controller.close(owner,3L,8L,9L,request(start.plusHours(1),"관리자 확인"));
        assertThrows(ApiException.class,()->work.clockOut(staff,3L));
        assertEquals(start.plusHours(1),session.getClockOut());
    }
}

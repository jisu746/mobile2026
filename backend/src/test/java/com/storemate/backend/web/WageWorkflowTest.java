package com.storemate.backend.web;
import com.storemate.backend.domain.*;
import com.storemate.backend.repo.*;
import org.junit.jupiter.api.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class WageWorkflowTest {
    StoreAccess access=mock(StoreAccess.class);
    WorkSessionRepository sessions=mock(WorkSessionRepository.class);
    StoreMemberRepository members=mock(StoreMemberRepository.class);
    WageService wages=mock(WageService.class);
    Notifier notifier=mock(Notifier.class);
    Account owner=mock(Account.class),staff=mock(Account.class);
    Store store=mock(Store.class);
    StoreMember member=mock(StoreMember.class);
    WorkSession[] saved=new WorkSession[1];
    WorkController work;
    MemberController controller;
    @BeforeEach void setup(){
        when(staff.getId()).thenReturn(7L);when(staff.getRole()).thenReturn(Role.STAFF);when(staff.getName()).thenReturn("crew2");
        when(store.getId()).thenReturn(3L);when(store.getInviteCode()).thenReturn("ABC-1234");
        when(member.getId()).thenReturn(8L);when(member.getStore()).thenReturn(store);when(member.getAccount()).thenReturn(staff);
        when(member.getRole()).thenReturn(Role.STAFF);when(member.getStatus()).thenReturn(MemberStatus.APPROVED);
        when(access.requireOwner(owner,3L)).thenReturn(store);when(members.findById(8L)).thenReturn(Optional.of(member));
        when(access.requireMember(staff,3L)).thenReturn(store);when(access.requireApproved(staff,3L)).thenReturn(member);
        when(wages.forNewSession(eq(member),any())).thenReturn(new WageService.Rate(12000,false));
        when(sessions.save(any())).thenAnswer(a->{saved[0]=a.getArgument(0);return saved[0];});
        when(sessions.findFirstByAccountAndStoreAndClockOutIsNull(staff,store)).thenAnswer(a->Optional.ofNullable(saved[0]));
        work=new WorkController(access,sessions,notifier,false,wages);
        controller=new MemberController(access,members,mock(WorkShiftRepository.class),sessions,wages);
    }
    @Test void clockInPersistsRateAndRepeatedCallKeepsSnapshot(){
        work.clockIn(staff,3L,new Dto.ClockInRequest("ABC-1234"));
        assertEquals(12000,saved[0].getHourlyWage());assertEquals("SNAPSHOT",saved[0].getWageSource());
        when(wages.forNewSession(eq(member),any())).thenReturn(new WageService.Rate(15000,false));
        work.clockIn(staff,3L,new Dto.ClockInRequest("ABC-1234"));
        assertEquals(12000,saved[0].getHourlyWage());verify(sessions,times(1)).save(any());
    }
    @Test void wrongQrCannotCreatePaidSession(){assertThrows(ApiException.class,()->work.clockIn(staff,3L,new Dto.ClockInRequest("WRONG")));verify(sessions,never()).save(any());verifyNoInteractions(wages);}
    @Test void explicitLegacyConfirmationIsOneTime(){
        var old=new WorkSession(staff,store);when(sessions.findLockedById(9L)).thenReturn(Optional.of(old));
        var result=controller.confirmLegacyWage(owner,3L,8L,9L,new Dto.LegacyWageRequest(11000));
        assertEquals(11000,result.hourlyWage());assertEquals("CONFIRMED",result.wageSource());
        assertThrows(ApiException.class,()->controller.confirmLegacyWage(owner,3L,8L,9L,new Dto.LegacyWageRequest(12000)));
        assertEquals(11000,old.getHourlyWage());
    }
    @Test void cannotConfirmAnotherEmployeesSession(){
        var other=mock(Account.class);when(other.getId()).thenReturn(99L);
        when(sessions.findLockedById(9L)).thenReturn(Optional.of(new WorkSession(other,store)));
        assertThrows(ApiException.class,()->controller.confirmLegacyWage(owner,3L,8L,9L,new Dto.LegacyWageRequest(11000)));
    }
    @Test void cannotConfirmAnotherStoresSession(){
        var other=mock(Store.class);when(other.getId()).thenReturn(99L);
        when(sessions.findLockedById(9L)).thenReturn(Optional.of(new WorkSession(staff,other)));
        assertThrows(ApiException.class,()->controller.confirmLegacyWage(owner,3L,8L,9L,new Dto.LegacyWageRequest(11000)));
    }
    @Test void nonOwnerCannotConfirmLegacyWage(){
        when(access.requireOwner(owner,3L)).thenThrow(new ApiException(org.springframework.http.HttpStatus.FORBIDDEN,"권한 없음"));
        assertThrows(ApiException.class,()->controller.confirmLegacyWage(owner,3L,8L,9L,new Dto.LegacyWageRequest(11000)));
        verify(sessions,never()).findLockedById(anyLong());
    }
}

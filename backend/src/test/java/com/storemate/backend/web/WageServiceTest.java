package com.storemate.backend.web;
import com.storemate.backend.domain.*;
import com.storemate.backend.repo.*;
import org.junit.jupiter.api.*;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class WageServiceTest {
    WageRateRepository rates=mock(WageRateRepository.class);
    StoreMemberRepository members=mock(StoreMemberRepository.class);
    StoreMember member=mock(StoreMember.class);
    Account owner=mock(Account.class);
    TreeMap<LocalDate,WageRate> history=new TreeMap<>();
    WageService service;
    @BeforeEach void setup(){
        when(member.getId()).thenReturn(8L);
        when(member.getHourlyWage()).thenReturn(12000);
        when(members.findLockedById(8L)).thenReturn(Optional.of(member));
        when(rates.findFirstByMemberAndEffectiveFromLessThanEqualOrderByEffectiveFromDesc(eq(member),any())).thenAnswer(a->{var e=history.floorEntry(a.getArgument(1));return e==null?Optional.empty():Optional.of(e.getValue());});
        when(rates.findByMemberAndEffectiveFrom(eq(member),any())).thenAnswer(a->Optional.ofNullable(history.get(a.getArgument(1))));
        when(rates.findByMemberOrderByEffectiveFromDesc(member)).thenAnswer(a->new ArrayList<>(history.descendingMap().values()));
        when(rates.save(any())).thenAnswer(a->{WageRate r=a.getArgument(0);history.put(r.getEffectiveFrom(),r);return r;});
        service=new WageService(rates,members);
    }
    @Test void currentConfiguredRateRemainsBeforeFirstDatedChange(){assertEquals(12000,service.resolve(member,LocalDate.now()).amount());}
    @Test void defaultIsOnlyForNewSessionsAndIsMarked(){when(member.getHourlyWage()).thenReturn(null);var rate=service.forNewSession(member,LocalDate.now());assertEquals(10320,rate.amount());assertTrue(rate.defaultRate());}
    @Test void futureChangePreservesTodayAndAppliesOnExactDate(){
        LocalDate today=LocalDate.now(),future=today.plusDays(2);
        service.schedule(member,owner,15000,future);
        assertEquals(12000,service.resolve(member,today).amount());
        assertEquals(12000,service.resolve(member,future.minusDays(1)).amount());
        assertEquals(15000,service.resolve(member,future).amount());
        assertEquals(15000,service.resolve(member,future.plusDays(1)).amount());
    }
    @Test void sameDateUpdatesOneHistoryEntry(){var day=LocalDate.now();service.schedule(member,owner,14000,day);service.schedule(member,owner,16000,day);assertEquals(1,history.size());assertEquals(16000,service.resolve(member,day).amount());}
    @Test void latestEffectiveDateWins(){var today=LocalDate.now();service.schedule(member,owner,14000,today.plusDays(1));service.schedule(member,owner,16000,today.plusDays(5));assertEquals(14000,service.resolve(member,today.plusDays(4)).amount());assertEquals(16000,service.resolve(member,today.plusDays(5)).amount());}
    @Test void pastDateCannotRepriceHistory(){assertThrows(ApiException.class,()->service.schedule(member,owner,15000,LocalDate.now().minusDays(1)));assertTrue(history.isEmpty());}
    @Test void badWagesNeverWriteHistory(){for(Integer value:new Integer[]{null,0,-1,100001})assertThrows(ApiException.class,()->service.schedule(member,owner,value,LocalDate.now()));assertTrue(history.isEmpty());}
    @Test void snapshotSurvivesNewRateAndCannotBeOverwritten(){
        var work=new WorkSession(mock(Account.class),mock(Store.class));var rate=service.forNewSession(member,LocalDate.now());work.assignWage(rate.amount(),"SNAPSHOT",null);
        service.schedule(member,owner,18000,LocalDate.now());
        assertEquals(12000,work.getHourlyWage());assertEquals(18000,service.resolve(member,LocalDate.now()).amount());
        assertThrows(IllegalStateException.class,()->work.assignWage(18000,"CONFIRMED",owner));
    }
    @Test void oldRecordsStayUnknownUntilExplicitConfirmation(){var work=new WorkSession(mock(Account.class),mock(Store.class));assertNull(work.getHourlyWage());service.schedule(member,owner,18000,LocalDate.now());assertNull(work.getHourlyWage());work.assignWage(11000,"CONFIRMED",owner);assertEquals(11000,work.getHourlyWage());assertEquals("CONFIRMED",work.getWageSource());}
    @Test void historyReturnsCurrentAndFutureSeparately(){service.schedule(member,owner,15000,LocalDate.now().plusDays(1));var result=service.history(member);assertEquals(12000,result.currentHourlyWage());assertEquals(2,result.history().size());}
}

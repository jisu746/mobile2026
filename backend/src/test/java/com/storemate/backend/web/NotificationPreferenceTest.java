package com.storemate.backend.web;
import com.storemate.backend.domain.*;
import com.storemate.backend.repo.*;
import jakarta.persistence.*;
import org.junit.jupiter.api.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class NotificationPreferenceTest {
 NotificationPreferenceRepository preferences=mock(NotificationPreferenceRepository.class);EntityManager em=mock(EntityManager.class);
 Account a=mock(Account.class),b=mock(Account.class);NotificationPreferenceController controller;
 Map<Long,NotificationPreference> rows=new HashMap<>();
 @BeforeEach void setup(){
  when(a.getId()).thenReturn(7L);when(a.getUsername()).thenReturn("crew2");when(b.getId()).thenReturn(8L);when(b.getUsername()).thenReturn("crew3");
  when(em.find(Account.class,7L,LockModeType.PESSIMISTIC_WRITE)).thenReturn(a);when(em.find(Account.class,8L,LockModeType.PESSIMISTIC_WRITE)).thenReturn(b);
  when(preferences.findByAccountId(anyLong())).thenAnswer(c->Optional.ofNullable(rows.get(c.getArgument(0))));
  when(preferences.save(any())).thenAnswer(c->{NotificationPreference p=c.getArgument(0);var f=NotificationPreference.class.getDeclaredField("account");f.setAccessible(true);rows.put(((Account)f.get(p)).getId(),p);return p;});
  controller=new NotificationPreferenceController(preferences,em);
 }
 NotificationPreferenceController.Update update(String username,long revision,String start,String end){return new NotificationPreferenceController.Update(false,false,true,true,false,true,true,start,end,revision,username);}
 @Test void initialGetUsesDefaultsWithoutCreatingRow(){var p=controller.get(a);assertFalse(p.initialized());assertEquals("crew2",p.username());assertTrue(p.push());assertFalse(p.quiet());assertEquals("23:00",p.quietStart());assertEquals(0,p.revision());verify(preferences,never()).save(any());}
 @Test void savePersistsAllFieldsAndReReads(){var p=controller.save(a,update("crew2",0,"22:30","07:30"));assertTrue(p.initialized());assertFalse(p.push());assertFalse(p.task());assertFalse(p.memo());assertTrue(p.quiet());assertEquals(1,p.revision());assertEquals(p,controller.get(a));}
 @Test void preferencesAreAccountScoped(){controller.save(a,update("crew2",0,"22:30","07:30"));assertTrue(controller.get(b).push());assertFalse(controller.get(b).initialized());assertEquals("23:00",controller.get(b).quietStart());}
 @Test void changedLoginCannotWriteAnotherAccountsPayload(){assertThrows(ApiException.class,()->controller.save(b,update("crew2",0,"22:30","07:30")));verify(preferences,never()).save(any());}
 @Test void staleRevisionCannotOverwriteNewerSettings(){controller.save(a,update("crew2",0,"22:30","07:30"));assertThrows(ApiException.class,()->controller.save(a,update("crew2",0,"20:00","06:00")));assertEquals("22:30",controller.get(a).quietStart());}
 @Test void newerRevisionCanSaveAnotherChange(){controller.save(a,update("crew2",0,"22:30","07:30"));var changed=controller.save(a,update("crew2",1,"21:00","06:00"));assertEquals(2,changed.revision());assertEquals("21:00",changed.quietStart());}
 @Test void overnightAndDaytimeIntervalsAreAccepted(){controller.save(a,update("crew2",0,"23:00","08:00"));assertEquals("08:00",controller.get(a).quietEnd());controller.save(a,update("crew2",1,"13:00","14:00"));assertEquals("14:00",controller.get(a).quietEnd());}
 @Test void equalOrMalformedTimesAreRejected(){for(String[] times:new String[][]{{"08:00","08:00"},{"24:00","08:00"},{"8:00","09:00"},{"23:60","08:00"},{null,"08:00"}})assertThrows(ApiException.class,()->controller.save(a,update("crew2",0,times[0],times[1])));verify(preferences,never()).save(any());}
 @Test void missingSwitchCannotSilentlyResetOthers(){assertThrows(ApiException.class,()->controller.save(a,new NotificationPreferenceController.Update(null,true,true,true,true,true,false,"23:00","08:00",0L,"crew2")));verify(preferences,never()).save(any());}
 @Test void deletedAccountCannotCreateSettings(){when(em.find(Account.class,7L,LockModeType.PESSIMISTIC_WRITE)).thenReturn(null);assertThrows(ApiException.class,()->controller.save(a,update("crew2",0,"22:00","08:00")));verify(preferences,never()).save(any());}
 @Test void writesUseAccountLockForFirstSaveAndConcurrentUpdates(){controller.save(a,update("crew2",0,"22:00","08:00"));verify(em).find(Account.class,7L,LockModeType.PESSIMISTIC_WRITE);}
}

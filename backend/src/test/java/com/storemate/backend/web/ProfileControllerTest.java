package com.storemate.backend.web;
import com.storemate.backend.domain.*;
import jakarta.persistence.*;
import org.junit.jupiter.api.*;
import org.springframework.http.HttpStatus;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ProfileControllerTest {
 EntityManager em=mock(EntityManager.class);StoreAccess access=mock(StoreAccess.class);AccountViews views=mock(AccountViews.class);
 Account account;ProfileController controller;
 @BeforeEach void setup() throws Exception {
  account=new Account("crew2","unused",Role.STAFF,"crew2","20031113");var id=Account.class.getDeclaredField("id");id.setAccessible(true);id.set(account,7L);
  when(em.find(Account.class,7L,LockModeType.PESSIMISTIC_WRITE)).thenReturn(account);controller=new ProfileController(em,access,views);
 }
 ProfileController.Update input(String username,String name,String birth){return new ProfileController.Update(username,name,birth,"crew2","20031113",null,null,null);}
 @Test void profilePersistsNameAndBirthInAccount(){controller.update(account,input("crew2"," 김테스트 ","20000229"));assertEquals("김테스트",account.getName());assertEquals("20000229",account.getBirth());verify(views).of(account);}
 @Test void validBirthIncludesLeapDayAndToday(){assertEquals("20000229",ProfileController.birth("20000229"));String today=java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.BASIC_ISO_DATE);assertEquals(today,ProfileController.birth(today));}
 @Test void impossibleFutureOrMalformedBirthRejected(){for(String birth:new String[]{null,"20030229","18991231","20031301","2003.11.13","29990101","2003111"})assertThrows(ApiException.class,()->controller.update(account,input("crew2","이름",birth)));assertEquals("crew2",account.getName());}
 @Test void emptyAndOversizeNamesRejected(){for(String name:new String[]{null," ","가".repeat(31)})assertThrows(ApiException.class,()->controller.update(account,input("crew2",name,"20031113")));}
 @Test void differentLoginCannotWritePayload(){assertThrows(ApiException.class,()->controller.update(account,input("crew3","바뀐 이름","20031113")));verifyNoInteractions(em);}
 @Test void staleProfileCannotOverwriteNewerProfile(){account.updateProfile("이미 수정됨","20031113");assertThrows(ApiException.class,()->controller.update(account,input("crew2","이전 화면","20031113")));assertEquals("이미 수정됨",account.getName());}
 @Test void storeRenameRequiresOwnershipBeforeAnyPersonalChange(){when(access.requireOwner(account,3L)).thenThrow(new ApiException(HttpStatus.FORBIDDEN,"권한 없음"));assertThrows(ApiException.class,()->controller.update(account,new ProfileController.Update("crew2","새이름","20031113","crew2","20031113",3L,"매장 이름","기존 매장")));assertEquals("crew2",account.getName());}
 @Test void ownedStoreAndProfileUpdateTogether(){Store store=mock(Store.class);when(store.getName()).thenReturn("기존 매장");when(em.find(Store.class,3L,LockModeType.PESSIMISTIC_WRITE)).thenReturn(store);controller.update(account,new ProfileController.Update("crew2","새이름","20031113","crew2","20031113",3L," 새 매장 ","기존 매장"));assertEquals("새이름",account.getName());verify(access).requireOwner(account,3L);verify(store).rename("새 매장");}
 @Test void changedStoreNameDoesNotPartiallySavePersonalProfile(){Store store=mock(Store.class);when(store.getName()).thenReturn("이미 변경된 매장");when(em.find(Store.class,3L,LockModeType.PESSIMISTIC_WRITE)).thenReturn(store);assertThrows(ApiException.class,()->controller.update(account,new ProfileController.Update("crew2","새이름","20031113","crew2","20031113",3L,"새 매장","기존 매장")));assertEquals("crew2",account.getName());verify(store,never()).rename(anyString());}
}

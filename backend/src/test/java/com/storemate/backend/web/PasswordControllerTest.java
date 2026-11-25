package com.storemate.backend.web;
import com.storemate.backend.domain.*;
import com.storemate.backend.repo.*;
import jakarta.persistence.*;
import org.junit.jupiter.api.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PasswordControllerTest {
 EntityManager em=mock(EntityManager.class);AuthTokenRepository tokens=mock(AuthTokenRepository.class);
 BCryptPasswordEncoder encoder=new BCryptPasswordEncoder();Account account;PasswordController controller;
 @BeforeEach void setup() throws Exception {
  account=new Account("crew2",encoder.encode("OldPass1!"),Role.STAFF,"crew2","20031113");var id=Account.class.getDeclaredField("id");id.setAccessible(true);id.set(account,7L);
  when(em.find(Account.class,7L,LockModeType.PESSIMISTIC_WRITE)).thenReturn(account);when(tokens.findById("current-token")).thenReturn(Optional.of(new AuthToken("current-token",account)));
  controller=new PasswordController(em,tokens);
 }
 PasswordController.Request request(String user,String current,String next){var r=new PasswordController.Request();r.setUsername(user);r.setCurrentPassword(current);r.setNewPassword(next);return r;}
 @Test void successfulChangeHashesAndRevokesAllAccountTokens(){controller.change(account,"current-token",request("crew2","OldPass1!","NewPass2!"));assertTrue(encoder.matches("NewPass2!",account.getPasswordHash()));assertFalse(encoder.matches("OldPass1!",account.getPasswordHash()));assertNotEquals("NewPass2!",account.getPasswordHash());verify(tokens).deleteAllForAccount(7L);verify(em).flush();}
 @Test void wrongCurrentPasswordDoesNotChangeAnything(){String hash=account.getPasswordHash();assertThrows(ApiException.class,()->controller.change(account,"current-token",request("crew2","wrong","NewPass2!")));assertEquals(hash,account.getPasswordHash());verify(tokens,never()).deleteAllForAccount(anyLong());}
 @Test void samePasswordRejected(){assertThrows(ApiException.class,()->controller.change(account,"current-token",request("crew2","OldPass1!","OldPass1!")));verify(tokens,never()).deleteAllForAccount(anyLong());}
 @Test void invalidNewPasswordsRejected(){for(String p:new String[]{null,"a1!","OnlyLetters!","12345678!","NoSymbol123","Space pass1!","가나다라123!","a".repeat(73)+"1!"})assertThrows(ApiException.class,()->controller.change(account,"current-token",request("crew2","OldPass1!",p)));verifyNoInteractions(em);}
 @Test void validAsciiRulesAcceptBoundaryAndSymbols(){assertTrue(PasswordController.validNewPassword("Aa12345!"));assertTrue(PasswordController.validNewPassword("A1!"+"a".repeat(69)));assertTrue(PasswordController.validNewPassword("Brackets1[]"));}
 @Test void changedLoginCannotChangeOtherAccount(){assertThrows(ApiException.class,()->controller.change(account,"current-token",request("crew3","OldPass1!","NewPass2!")));verifyNoInteractions(em);}
 @Test void revokedInFlightTokenCannotChangePassword(){when(tokens.findById("current-token")).thenReturn(Optional.empty());assertThrows(ApiException.class,()->controller.change(account,"current-token",request("crew2","OldPass1!","NewPass2!")));verify(tokens,never()).deleteAllForAccount(anyLong());}
 @Test void tokenForAnotherAccountRejected() throws Exception {Account other=new Account("crew3","unused",Role.STAFF,"crew3",null);var id=Account.class.getDeclaredField("id");id.setAccessible(true);id.set(other,8L);when(tokens.findById("current-token")).thenReturn(Optional.of(new AuthToken("current-token",other)));assertThrows(ApiException.class,()->controller.change(account,"current-token",request("crew2","OldPass1!","NewPass2!")));}
 @Test void oldPasswordLoginFailsAndNewPasswordWorksAfterChange(){
  controller.change(account,"current-token",request("crew2","OldPass1!","NewPass2!"));
  AccountRepository accounts=mock(AccountRepository.class);when(accounts.findLockedByUsername("crew2")).thenReturn(Optional.of(account));
  AuthController auth=new AuthController(accounts,tokens,mock(AccountViews.class));
  assertThrows(ApiException.class,()->auth.login(new Dto.LoginRequest("crew2","OldPass1!","staff")));
  assertNotNull(auth.login(new Dto.LoginRequest("crew2","NewPass2!","staff")).token());
  verify(accounts,times(2)).findLockedByUsername("crew2");verify(tokens,times(1)).save(any(AuthToken.class));
 }
 @Test void requestToStringDoesNotExposePasswords(){var r=request("crew2","OldPass1!","NewPass2!");assertFalse(r.toString().contains("OldPass1!"));assertFalse(r.toString().contains("NewPass2!"));}
}

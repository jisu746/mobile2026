package com.storemate.backend.web;
import com.storemate.backend.domain.*;
import com.storemate.backend.repo.AuthTokenRepository;
import jakarta.persistence.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
public class PasswordController {
 private final EntityManager em;private final AuthTokenRepository tokens;
 private final BCryptPasswordEncoder encoder=new BCryptPasswordEncoder();
 public PasswordController(EntityManager em,AuthTokenRepository tokens){this.em=em;this.tokens=tokens;}
 // Avoid record-generated toString exposing password values.
 public static class Request {
  private String username,currentPassword,newPassword;
  public String getUsername(){return username;}public void setUsername(String value){username=value;}
  public String getCurrentPassword(){return currentPassword;}public void setCurrentPassword(String value){currentPassword=value;}
  public String getNewPassword(){return newPassword;}public void setNewPassword(String value){newPassword=value;}
 }
 static boolean validNewPassword(String value){return value!=null&&value.matches("[!-~]{8,72}")&&value.matches(".*[A-Za-z].*")&&value.matches(".*[0-9].*")&&value.matches(".*[^A-Za-z0-9].*");}
 @PutMapping("/api/me/password") @Transactional @ResponseStatus(HttpStatus.NO_CONTENT)
 public void change(@RequestAttribute(AuthInterceptor.ACCOUNT)Account caller,@RequestAttribute(AuthInterceptor.TOKEN)String token,@RequestBody Request r){
  if(!caller.getUsername().equals(r.getUsername()))throw new ApiException(HttpStatus.CONFLICT,"로그인 계정이 변경됐어요. 다시 로그인해주세요");
  if(!validNewPassword(r.getNewPassword()))throw new ApiException(HttpStatus.BAD_REQUEST,"새 비밀번호는 공백 없이 영문·숫자·특수문자를 포함한 8~72자로 입력해주세요");
  Account account=em.find(Account.class,caller.getId(),LockModeType.PESSIMISTIC_WRITE);
  if(account!=null)em.refresh(account,LockModeType.PESSIMISTIC_WRITE);
  if(account==null||tokens.findById(token).filter(t->t.getAccount().getId().equals(account.getId())).isEmpty())throw new ApiException(HttpStatus.UNAUTHORIZED,"다시 로그인해주세요");
  String current=r.getCurrentPassword();
  if(current==null||current.getBytes(java.nio.charset.StandardCharsets.UTF_8).length>72||!encoder.matches(current,account.getPasswordHash()))throw new ApiException(HttpStatus.BAD_REQUEST,"현재 비밀번호가 맞지 않아요");
  if(current.equals(r.getNewPassword()))throw new ApiException(HttpStatus.BAD_REQUEST,"현재 비밀번호와 다른 새 비밀번호를 입력해주세요");
  account.changePasswordHash(encoder.encode(r.getNewPassword()));em.flush();tokens.deleteAllForAccount(account.getId());
 }
}

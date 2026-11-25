package com.storemate.backend.web;
import com.storemate.backend.domain.*;
import jakarta.persistence.*;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.time.format.*;
import java.util.Objects;

@RestController
public class ProfileController {
 private final EntityManager em;private final StoreAccess access;private final AccountViews views;
 public ProfileController(EntityManager em,StoreAccess access,AccountViews views){this.em=em;this.access=access;this.views=views;}
 public record Update(String username,String name,String birth,String expectedName,String expectedBirth,Long storeId,String storeName,String expectedStoreName){}
 static String birth(String value){
  try{if(value==null||!value.matches("\\d{8}"))throw new IllegalArgumentException();
   LocalDate date=LocalDate.parse(value,DateTimeFormatter.ofPattern("uuuuMMdd").withResolverStyle(ResolverStyle.STRICT));
   if(date.getYear()<1900||date.isAfter(LocalDate.now()))throw new IllegalArgumentException();return value;
  }catch(RuntimeException e){throw new ApiException(HttpStatus.BAD_REQUEST,"생년월일을 1900년 이후부터 오늘까지의 유효한 날짜로 입력해주세요");}
 }
 @PutMapping("/api/me") @Transactional
 public Dto.AccountView update(@RequestAttribute(AuthInterceptor.ACCOUNT)Account caller,@RequestBody Update r){
  if(!caller.getUsername().equals(r.username()))throw new ApiException(HttpStatus.CONFLICT,"로그인 계정이 변경됐어요. 다시 로그인해주세요");
  String name=r.name()==null?"":r.name().trim();if(name.isEmpty()||name.length()>30)throw new ApiException(HttpStatus.BAD_REQUEST,"이름은 1~30자로 입력해주세요");String birth=birth(r.birth());
  Account account=em.find(Account.class,caller.getId(),LockModeType.PESSIMISTIC_WRITE);
  if(account==null)throw new ApiException(HttpStatus.UNAUTHORIZED,"다시 로그인해주세요");
  if(!Objects.equals(account.getName(),r.expectedName())||!Objects.equals(account.getBirth()==null?"":account.getBirth(),r.expectedBirth()))throw new ApiException(HttpStatus.CONFLICT,"프로필이 변경됐어요. 다시 로그인한 뒤 수정해주세요");
  Store store=null;String storeName=null;
  if(r.storeName()!=null){
   if(r.storeId()==null)throw new ApiException(HttpStatus.BAD_REQUEST,"매장을 선택해주세요");
   access.requireOwner(account,r.storeId());store=em.find(Store.class,r.storeId(),LockModeType.PESSIMISTIC_WRITE);
   if(store==null)throw new ApiException(HttpStatus.NOT_FOUND,"매장을 찾을 수 없어요");
   if(!Objects.equals(store.getName(),r.expectedStoreName()))throw new ApiException(HttpStatus.CONFLICT,"매장 이름이 변경됐어요. 다시 로그인해주세요");
   storeName=r.storeName().trim();if(storeName.isEmpty()||storeName.length()>50)throw new ApiException(HttpStatus.BAD_REQUEST,"매장 이름은 1~50자로 입력해주세요");
  }
  account.updateProfile(name,birth);if(store!=null)store.rename(storeName);return views.of(account);
 }
}

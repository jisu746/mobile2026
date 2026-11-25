package com.storemate.backend.web;
import com.storemate.backend.domain.*;
import com.storemate.backend.repo.NotificationPreferenceRepository;
import jakarta.persistence.*;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/me/notification-preferences")
public class NotificationPreferenceController {
 private final NotificationPreferenceRepository preferences;private final EntityManager em;
 public NotificationPreferenceController(NotificationPreferenceRepository preferences,EntityManager em){this.preferences=preferences;this.em=em;}
 public record View(String username,boolean push,boolean task,boolean expiry,boolean stock,boolean memo,boolean pay,boolean quiet,String quietStart,String quietEnd,long revision,boolean initialized){}
 public record Update(Boolean push,Boolean task,Boolean expiry,Boolean stock,Boolean memo,Boolean pay,Boolean quiet,String quietStart,String quietEnd,Long revision,String username){}
 private View view(Account account,NotificationPreference p,boolean initialized){return new View(account.getUsername(),p.isPush(),p.isTask(),p.isExpiry(),p.isStock(),p.isMemo(),p.isPay(),p.isQuiet(),p.getQuietStart(),p.getQuietEnd(),p.getRevision(),initialized);}
 @GetMapping @Transactional(readOnly=true)
 public View get(@RequestAttribute(AuthInterceptor.ACCOUNT)Account account){var saved=preferences.findByAccountId(account.getId());return view(account,saved.orElseGet(()->new NotificationPreference(account)),saved.isPresent());}
 @PutMapping @Transactional
 public View save(@RequestAttribute(AuthInterceptor.ACCOUNT)Account account,@RequestBody Update r){
  if(!account.getUsername().equals(r.username()))throw new ApiException(HttpStatus.CONFLICT,"로그인 계정이 변경됐어요. 다시 로그인해주세요");
  if(r.push()==null||r.task()==null||r.expiry()==null||r.stock()==null||r.memo()==null||r.pay()==null||r.quiet()==null||r.revision()==null||r.revision()<0)throw new ApiException(HttpStatus.BAD_REQUEST,"알림 설정을 다시 불러온 뒤 저장해주세요");
  String pattern="^([01]\\d|2[0-3]):[0-5]\\d$";
  if(r.quietStart()==null||r.quietEnd()==null||!r.quietStart().matches(pattern)||!r.quietEnd().matches(pattern)||r.quietStart().equals(r.quietEnd()))throw new ApiException(HttpStatus.BAD_REQUEST,"서로 다른 시작·종료 시각을 HH:mm 형식으로 입력해주세요");
  Account current=em.find(Account.class,account.getId(),LockModeType.PESSIMISTIC_WRITE);
  if(current==null)throw new ApiException(HttpStatus.UNAUTHORIZED,"다시 로그인해주세요");
  NotificationPreference p=preferences.findByAccountId(account.getId()).orElseGet(()->new NotificationPreference(current));
  if(r.revision()!=p.getRevision())throw new ApiException(HttpStatus.CONFLICT,"다른 화면에서 설정이 변경됐어요. 다시 불러온 뒤 저장해주세요");
  p.update(r.push(),r.task(),r.expiry(),r.stock(),r.memo(),r.pay(),r.quiet(),r.quietStart(),r.quietEnd());
  preferences.save(p);return view(current,p,true);
 }
}

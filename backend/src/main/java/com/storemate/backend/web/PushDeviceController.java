package com.storemate.backend.web;
import com.storemate.backend.domain.*;import com.storemate.backend.repo.*;import org.springframework.web.bind.annotation.*;import org.springframework.transaction.annotation.Transactional;import org.springframework.http.HttpStatus;import java.time.*;
@RestController @RequestMapping("/api/me/push-devices") public class PushDeviceController {
 private final PushDeviceRepository devices;private final AccountRepository accounts;
 public PushDeviceController(PushDeviceRepository devices,AccountRepository accounts){this.devices=devices;this.accounts=accounts;}
 public record Registration(String token,String timezone){}
 @PostMapping @Transactional public void register(@RequestAttribute(AuthInterceptor.ACCOUNT)Account account,@RequestAttribute(AuthInterceptor.TOKEN)String sessionToken,@RequestBody Registration r){
  if(r.token()==null||!r.token().matches("(ExponentPushToken|ExpoPushToken)\\[[A-Za-z0-9_-]{10,200}\\]"))throw new ApiException(HttpStatus.BAD_REQUEST,"푸시 기기 정보를 확인해주세요");
  try{if(r.timezone()==null||r.timezone().length()>60)throw new IllegalArgumentException();ZoneId.of(r.timezone());}catch(Exception e){throw new ApiException(HttpStatus.BAD_REQUEST,"기기 시간대를 확인해주세요");}
  accounts.findLockedByUsername(account.getUsername()).orElseThrow();var device=devices.findById(r.token()).orElse(new PushDevice(r.token(),account,r.timezone()));device.update(account,r.timezone());device.bindSession(sessionToken);devices.save(device);
 }
 @DeleteMapping @Transactional public void remove(@RequestAttribute(AuthInterceptor.ACCOUNT)Account account,@RequestBody Registration r){devices.findById(r.token()).filter(d->d.getAccount().getId().equals(account.getId())).ifPresent(PushDevice::disable);}
}

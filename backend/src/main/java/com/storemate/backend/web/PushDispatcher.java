package com.storemate.backend.web;
import com.storemate.backend.domain.*;import com.storemate.backend.repo.*;
import org.springframework.stereotype.Service;import org.springframework.scheduling.annotation.Scheduled;import org.springframework.transaction.annotation.Transactional;import org.springframework.beans.factory.annotation.Value;
import java.time.*;
@Service public class PushDispatcher {
 private final PushDeliveryRepository deliveries;private final NotificationPreferenceRepository preferences;private final StoreMemberRepository members;private final AuthTokenRepository tokens;private final ExpoPushGateway gateway;private final boolean enabled;
 public PushDispatcher(PushDeliveryRepository deliveries,NotificationPreferenceRepository preferences,StoreMemberRepository members,AuthTokenRepository tokens,ExpoPushGateway gateway,@Value("${storemate.push.enabled:${PUSH_ENABLED:false}}")boolean enabled){this.deliveries=deliveries;this.preferences=preferences;this.members=members;this.tokens=tokens;this.gateway=gateway;this.enabled=enabled;}
 @Scheduled(fixedDelayString="${storemate.push.delay-ms:15000}") @Transactional public void send(){if(!enabled)return;
  for(var item:deliveries.findTop20ByStatusAndNextAttemptBeforeOrderByIdAsc("PENDING",LocalDateTime.now())){
   var delivery=deliveries.lock(item.getId()).orElseThrow();if(!"PENDING".equals(delivery.getStatus()))continue;var device=delivery.getDevice();var n=delivery.getNotification();
   if(!delivery.getRecipient().getId().equals(device.getAccount().getId())||!device.isEnabled()||device.getSessionToken()==null||!tokens.existsById(device.getSessionToken())||members.findByAccountAndStore(device.getAccount(),n.getStore()).filter(m->m.getStatus()==MemberStatus.APPROVED&&m.getRole()==n.getAudience()).isEmpty()){delivery.skip();continue;}
   var p=preferences.findByAccountId(device.getAccount().getId()).orElse(new NotificationPreference(device.getAccount()));
   if(!PushPolicy.allowed(p,n.getKind())){delivery.skip();continue;}
   var end=PushPolicy.quietEnd(p,ZonedDateTime.now(ZoneId.of(device.getTimezone())));if(end!=null){delivery.defer(end);continue;}
   if(n.getCreatedAt().isBefore(LocalDateTime.now().minusDays(2))){delivery.skip();continue;}
   try{var ticket=gateway.send(device,n);if(ticket.invalidDevice()){device.disable();delivery.skip();}else delivery.accepted(ticket.id());}catch(Exception ignored){delivery.fail();}
  }
 }
 @Scheduled(fixedDelay=60000) @Transactional public void receipts(){if(!enabled)return;
  for(var item:deliveries.findTop20ByStatusAndNextAttemptBeforeOrderByIdAsc("ACCEPTED",LocalDateTime.now())){
   var delivery=deliveries.lock(item.getId()).orElseThrow();if(!"ACCEPTED".equals(delivery.getStatus()))continue;
   try{switch(gateway.receipt(delivery.getTicket())){
    case DELIVERED->delivery.delivered();
    case INVALID_DEVICE->{delivery.getDevice().disable();delivery.skip();}
    case FAILED->delivery.skip();
    case PENDING->{if(delivery.getNotification().getCreatedAt().isBefore(LocalDateTime.now().minusDays(1)))delivery.skip();else delivery.defer(LocalDateTime.now().plusMinutes(15));}
   }}catch(Exception ignored){delivery.defer(LocalDateTime.now().plusMinutes(15));}
  }
 }
}

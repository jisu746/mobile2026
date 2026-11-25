package com.storemate.backend.web;
import com.storemate.backend.domain.*;import com.storemate.backend.repo.*;import org.springframework.stereotype.Service;
@Service public class PushQueue {
 private final PushDeviceRepository devices;private final PushDeliveryRepository deliveries;private final StoreMemberRepository members;
 public PushQueue(PushDeviceRepository devices,PushDeliveryRepository deliveries,StoreMemberRepository members){this.devices=devices;this.deliveries=deliveries;this.members=members;}
 public void enqueue(Notification notification,Store store,Role audience,Account actor){
  for(var member:members.findByStoreAndStatusOrderByIdAsc(store,MemberStatus.APPROVED))if(member.getRole()==audience&&(actor==null||!member.getAccount().getId().equals(actor.getId())))for(var device:devices.findByAccountAndEnabledTrue(member.getAccount()))deliveries.save(new PushDelivery(notification,device));
 }
}

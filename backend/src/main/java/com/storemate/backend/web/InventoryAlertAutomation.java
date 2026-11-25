package com.storemate.backend.web;
import com.storemate.backend.domain.*;import com.storemate.backend.repo.*;import org.springframework.stereotype.Service;import org.springframework.scheduling.annotation.Scheduled;import org.springframework.transaction.annotation.Transactional;import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;import java.time.*;
@Service @ConditionalOnProperty(name="storemate.automation.enabled",havingValue="true",matchIfMissing=true) public class InventoryAlertAutomation {
 @org.springframework.beans.factory.annotation.Autowired private StoreTemplateRepository templates;
 private final ProductRepository products;private final InventoryAlertDayRepository events;private final StoreOperationSettingsRepository settings;private final Notifier notifier;private final StockBatchService locks;
 public InventoryAlertAutomation(ProductRepository products,InventoryAlertDayRepository events,StoreOperationSettingsRepository settings,Notifier notifier,StockBatchService locks){this.products=products;this.events=events;this.settings=settings;this.notifier=notifier;this.locks=locks;}
 @Scheduled(cron="${storemate.inventory.alert-cron:0 0 9 * * *}",zone="${storemate.timezone:Asia/Seoul}") @Transactional public void scan(){
  for(var p:products.findAll(org.springframework.data.domain.Sort.by("store.id","id"))){
   locks.lock(p.getStore());if(p.isDeleted())continue;var s=settings.findById(p.getStore().getId()).orElse(new StoreOperationSettings(p.getStore().getId()));var today=LocalDate.now();
   if(p.getStock()<= (p.getMinStock()>0?p.getMinStock():s.getLowStockThresholdCount()))send(p,"stock",today.toString(),p.getName()+" 재고가 부족해요","현재 "+p.getStock()+"개");
   boolean expiry=templates==null||templates.findById(p.getStore().getId()).map(StoreTemplate::isExpiryEnabled).orElse(StoreTemplateController.preset(p.getStore().getType()).expiryEnabled());
   if(expiry&&p.getStock()>0&&p.getExpiry()!=null&&!p.getExpiry().isAfter(today.plusDays(s.getExpirationAlertDays())))send(p,"expiry",today+":"+p.getExpiry(),p.getName()+" 유통기한을 확인해주세요","가장 빠른 유통기한 "+p.getExpiry()+" · 입고 묶음별 재고를 확인해주세요");
  }
 }
 private void send(Product p,String kind,String suffix,String title,String sub){String key=p.getId()+":"+kind+":"+suffix;if(events.existsById(key))return;events.save(new InventoryAlertDay(key));for(Role role:Role.values())notifier.system(p.getStore(),role,kind,title,sub);}
}

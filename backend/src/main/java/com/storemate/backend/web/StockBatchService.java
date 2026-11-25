package com.storemate.backend.web;

import com.storemate.backend.domain.*;
import com.storemate.backend.repo.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.*;

@Service
public class StockBatchService {
 private final StockBatchRepository batches;
 private final EntityManager em;
 public StockBatchService(StockBatchRepository batches,EntityManager em){this.batches=batches;this.em=em;}
 public void lock(Store store){em.lock(store,LockModeType.PESSIMISTIC_WRITE);}
 public List<StockBatch> initialize(Product product){
  var list=new ArrayList<>(batches.findByProductOrderByReceivedAtAscIdAsc(product));
  if(list.isEmpty()&&product.getStock()>0)list.add(batches.save(new StockBatch(product,product.getStock(),product.getExpiry(),"LEGACY")));
  return list;
 }
 public void receive(Product product,int quantity,LocalDate expiry){
  var list=initialize(product);list.add(batches.save(new StockBatch(product,quantity,expiry,"RECEIPT")));sync(product,list);
 }
 public void adjust(Product product,int target){
  var list=initialize(product);int difference=target-product.getStock();
  if(difference>0)list.add(batches.save(new StockBatch(product,difference,null,"ADJUSTMENT")));
  if(difference<0){int remaining=-difference;list.sort(Comparator.comparing(StockBatch::getExpiry,Comparator.nullsLast(Comparator.naturalOrder())).thenComparing(StockBatch::getReceivedAt));
   for(var batch:list){int take=Math.min(batch.getQuantity(),remaining);if(take>0)batch.update(batch.getQuantity()-take,batch.getExpiry());remaining-=take;}
  }
  sync(product,list);
 }
 public void discardExpired(Product product){var list=initialize(product);for(var batch:list)if(batch.getExpiry()!=null&&batch.getExpiry().isBefore(LocalDate.now())&&batch.getQuantity()>0)batch.update(0,batch.getExpiry());sync(product,list);}
 public List<StockBatch> list(Product product){return batches.findByProductOrderByReceivedAtAscIdAsc(product);}
 public void update(Product product,long id,long revision,int quantity,LocalDate expiry){
  if(quantity<0||quantity>1000000)throw new ApiException(HttpStatus.BAD_REQUEST,"수량은 0~1,000,000개로 입력해주세요");
  var list=initialize(product);var batch=(id==0?list.stream().filter(b->"LEGACY".equals(b.getSource())):list.stream().filter(b->b.getId()==id)).findFirst().orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"입고 묶음을 찾을 수 없어요"));
  if(batch.getRevision()!=revision)throw new ApiException(HttpStatus.CONFLICT,"재고가 변경됐어요. 새로고침 후 다시 확인해주세요");
  batch.update(quantity,expiry);sync(product,list);
 }
 private void sync(Product product,List<StockBatch> list){
  long total=list.stream().mapToLong(StockBatch::getQuantity).sum();if(total>1000000)throw new ApiException(HttpStatus.BAD_REQUEST,"총 재고는 1,000,000개를 넘을 수 없어요");
  product.setStock((int)total);product.setExpiry(list.stream().filter(b->b.getQuantity()>0).map(StockBatch::getExpiry).filter(Objects::nonNull).min(LocalDate::compareTo).orElse(null));
 }
}

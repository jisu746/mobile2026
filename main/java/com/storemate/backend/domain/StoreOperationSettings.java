package com.storemate.backend.domain;
import jakarta.persistence.*;import java.util.*;
@Entity @Table(name="store_operation_settings") public class StoreOperationSettings {
 @Id private Long storeId;private int expirationAlertDays=3,lowStockThresholdCount=3;private long revision;
 @ElementCollection @CollectionTable(name="store_work_parts",joinColumns=@JoinColumn(name="settings_id")) @OrderColumn(name="part_index") private List<Part> workParts=new ArrayList<>();
 protected StoreOperationSettings(){}public StoreOperationSettings(Long id){storeId=id;workParts.add(new Part("morning","오전 파트","10:00","14:00"));workParts.add(new Part("afternoon","오후 파트","14:00","20:00"));workParts.add(new Part("closing","마감 파트","18:00","24:00"));}
 public int getExpirationAlertDays(){return expirationAlertDays;}public int getLowStockThresholdCount(){return lowStockThresholdCount;}public long getRevision(){return revision;}public List<Part> getWorkParts(){return workParts;}
 public void update(int days,int threshold,List<Part> parts){expirationAlertDays=days;lowStockThresholdCount=threshold;workParts.clear();workParts.addAll(parts);revision++;}
 @Embeddable public static class Part {
  @Column(length=30) private String partId;@Column(length=30) private String name;@Column(length=5) private String startTime,endTime;
  protected Part(){}public Part(String id,String name,String start,String end){partId=id;this.name=name;startTime=start;endTime=end;}
  public String getId(){return partId;}public String getName(){return name;}public String getStart(){return startTime;}public String getEnd(){return endTime;}
 }
}

package com.storemate.backend.domain;
import jakarta.persistence.*;import java.util.*;
@Entity @Table(name="store_templates") public class StoreTemplate {
 @Id private Long storeId;@Column(length=30) private String industry;private boolean expiryEnabled;
 @ElementCollection @CollectionTable(name="store_template_categories",joinColumns=@JoinColumn(name="store_id")) @OrderColumn(name="position") @Column(length=30) private List<String> categories=new ArrayList<>();
 @ElementCollection @CollectionTable(name="store_template_tasks",joinColumns=@JoinColumn(name="store_id")) @OrderColumn(name="position") @Column(length=100) private List<String> examples=new ArrayList<>();
 private long revision;protected StoreTemplate(){}public StoreTemplate(Long id){storeId=id;}
 public String getIndustry(){return industry;}public boolean isExpiryEnabled(){return expiryEnabled;}public List<String> getCategories(){return categories;}public List<String> getExamples(){return examples;}public long getRevision(){return revision;}
 public void update(String industry,boolean expiry,List<String> categories,List<String> examples){this.industry=industry;expiryEnabled=expiry;this.categories.clear();this.categories.addAll(categories);this.examples.clear();this.examples.addAll(examples);revision++;}
}

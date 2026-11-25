package com.storemate.backend.domain;
import jakarta.persistence.*;

/** Kept out of product list queries so thumbnails do not inflate inventory responses. */
@Entity @Table(name="product_photos")
public class ProductPhoto {
 @Id private Long productId;
 @Lob @Column(nullable=false,length=1048576) private byte[] image;
 @Column(length=80,nullable=false) private String requestKey;
 @Column(length=64,nullable=false) private String fingerprint;
 protected ProductPhoto(){}
 public ProductPhoto(Long productId,byte[] image,String requestKey,String fingerprint){this.productId=productId;replace(image,requestKey,fingerprint);}
 public byte[] getImage(){return image;}
 public String getRequestKey(){return requestKey;}
 public String getFingerprint(){return fingerprint;}
 public void replace(byte[] image,String requestKey,String fingerprint){this.image=image;this.requestKey=requestKey;this.fingerprint=fingerprint;}
}

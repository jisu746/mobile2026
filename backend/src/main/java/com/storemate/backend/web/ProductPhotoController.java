package com.storemate.backend.web;

import com.storemate.backend.domain.*;
import com.storemate.backend.repo.*;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.*;
import java.util.*;
import java.security.MessageDigest;

@RestController @RequestMapping("/api/stores/{storeId}/products/{barcode}/photo")
public class ProductPhotoController {
 private final StoreAccess access;private final ProductRepository products;private final ProductPhotoRepository photos;private final StockBatchService locks;
 public ProductPhotoController(StoreAccess access,ProductRepository products,ProductPhotoRepository photos,StockBatchService locks){this.access=access;this.products=products;this.photos=photos;this.locks=locks;}
 public record Upload(String imageBase64,String expectedVersion,String requestKey){}
 public record Photo(String version,String contentType,String imageBase64){}
 private Product find(Store store,String barcode){return products.findByStoreAndBarcode(store,barcode).filter(p->!p.isDeleted()).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"등록되지 않은 상품이에요"));}
 private Photo view(Product p,ProductPhoto photo){return new Photo(p.getPhotoVersion(),"image/jpeg",Base64.getEncoder().encodeToString(photo.getImage()));}
 @GetMapping @Transactional(readOnly=true)
 public Photo get(@RequestAttribute(AuthInterceptor.ACCOUNT)Account actor,@PathVariable Long storeId,@PathVariable String barcode){
  Product p=find(access.requireMember(actor,storeId),barcode);if(p.getPhotoVersion()==null)throw new ApiException(HttpStatus.NOT_FOUND,"등록된 상품 사진이 없어요");
  return view(p,photos.findById(p.getId()).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"등록된 상품 사진이 없어요")));
 }
 @PutMapping @Transactional
 public Photo put(@RequestAttribute(AuthInterceptor.ACCOUNT)Account actor,@PathVariable Long storeId,@PathVariable String barcode,@RequestBody Upload request){
  Store store=access.requireMember(actor,storeId);
  if(request.requestKey()==null||!request.requestKey().matches("[A-Za-z0-9_-]{8,80}"))throw new ApiException(HttpStatus.BAD_REQUEST,"사진 저장 요청을 다시 확인해주세요");
  if(request.imageBase64()==null||request.imageBase64().length()>5600000)throw new ApiException(HttpStatus.BAD_REQUEST,"사진은 4MB 이하로 촬영해주세요");
  byte[] bytes;try{bytes=Base64.getDecoder().decode(request.imageBase64());}catch(IllegalArgumentException e){throw new ApiException(HttpStatus.BAD_REQUEST,"사진 형식을 확인해주세요");}
  if(bytes.length<8||bytes.length>4194304)throw new ApiException(HttpStatus.BAD_REQUEST,"사진은 4MB 이하의 JPEG·PNG를 사용해주세요");
  String fingerprint;try{fingerprint=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));}catch(Exception e){throw new IllegalStateException(e);}
  byte[] thumbnail=thumbnail(bytes); // Decode/resize before holding the store lock.
  locks.lock(store);Product p=find(store,barcode);ProductPhoto photo=photos.findById(p.getId()).orElse(null);
  if(photo!=null&&p.getPhotoVersion()!=null&&photo.getRequestKey().equals(request.requestKey())){
   if(!photo.getFingerprint().equals(fingerprint))throw new ApiException(HttpStatus.CONFLICT,"같은 요청의 사진 내용이 달라요. 다시 촬영해주세요");
   return view(p,photo);
  }
  if(!Objects.equals(request.expectedVersion(),p.getPhotoVersion()))throw new ApiException(HttpStatus.CONFLICT,"다른 화면에서 상품 사진이 변경됐어요. 목록을 다시 연 뒤 촬영해주세요");
  if(photo==null)photo=new ProductPhoto(p.getId(),thumbnail,request.requestKey(),fingerprint);else photo.replace(thumbnail,request.requestKey(),fingerprint);
  photos.save(photo);p.setPhotoVersion(UUID.randomUUID().toString());return view(p,photo);
 }
 static byte[] thumbnail(byte[] source){
  try(var input=ImageIO.createImageInputStream(new ByteArrayInputStream(source))){
   var readers=ImageIO.getImageReaders(input);if(!readers.hasNext())throw new IOException();var reader=readers.next();
   BufferedImage original;
   try{reader.setInput(input,true,true);String format=reader.getFormatName();if(!format.equalsIgnoreCase("JPEG")&&!format.equalsIgnoreCase("PNG"))throw new IOException();int width=reader.getWidth(0),height=reader.getHeight(0);if(width<1||height<1||(long)width*height>20000000)throw new IOException();original=reader.read(0);}finally{reader.dispose();}
   double scale=Math.min(1,512d/Math.max(original.getWidth(),original.getHeight()));
   var resized=new BufferedImage(Math.max(1,(int)Math.round(original.getWidth()*scale)),Math.max(1,(int)Math.round(original.getHeight()*scale)),BufferedImage.TYPE_INT_RGB);
   var g=resized.createGraphics();try{g.setColor(Color.WHITE);g.fillRect(0,0,resized.getWidth(),resized.getHeight());g.setRenderingHint(RenderingHints.KEY_INTERPOLATION,RenderingHints.VALUE_INTERPOLATION_BILINEAR);g.drawImage(original,0,0,resized.getWidth(),resized.getHeight(),null);}finally{g.dispose();original.flush();}
   var out=new ByteArrayOutputStream();if(!ImageIO.write(resized,"jpeg",out))throw new IOException();resized.flush();if(out.size()>1048576)throw new IOException();return out.toByteArray();
  }catch(IOException|RuntimeException e){throw new ApiException(HttpStatus.BAD_REQUEST,"사진을 읽을 수 없어요. 2천만 화소 이하의 JPEG·PNG로 다시 촬영해주세요");}
 }
}

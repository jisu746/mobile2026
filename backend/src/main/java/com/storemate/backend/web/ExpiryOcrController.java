package com.storemate.backend.web;
import com.storemate.backend.domain.Account;import org.springframework.web.bind.annotation.*;import org.springframework.http.HttpStatus;import org.springframework.beans.factory.annotation.Value;import org.springframework.web.client.RestClient;import org.springframework.http.client.JdkClientHttpRequestFactory;
import java.time.*;import java.util.*;import java.util.regex.*;
@RestController @RequestMapping("/api/stores/{storeId}/expiry-ocr") public class ExpiryOcrController {
 private final StoreAccess access;private final String key;private final RestClient http;
 private final java.util.concurrent.ConcurrentHashMap<Long,Long> lastRequest=new java.util.concurrent.ConcurrentHashMap<>();
 public ExpiryOcrController(StoreAccess access,@Value("${storemate.ocr.google-api-key:${GOOGLE_VISION_API_KEY:}}")String key){this.access=access;this.key=key;var factory=new JdkClientHttpRequestFactory(java.net.http.HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build());factory.setReadTimeout(Duration.ofSeconds(15));http=RestClient.builder().requestFactory(factory).baseUrl("https://vision.googleapis.com").build();}
 public record Request(String imageBase64){} public record Result(List<String> candidates,String recognizedText){public Result(List<String> candidates){this(candidates,"");}}
 @GetMapping public Map<String,Boolean> status(@RequestAttribute(AuthInterceptor.ACCOUNT)Account account,@PathVariable Long storeId){access.requireMember(account,storeId);return Map.of("configured",!key.isBlank());}
 public static List<String> dates(String text){
  var found=new LinkedHashSet<String>();
  for(String pattern:List.of("(?<!\\d)(20\\d{2})\\s*[.년/\\-]\\s*(1[0-2]|0?[1-9])\\s*[.월/\\-]\\s*(3[01]|[12]\\d|0?[1-9])(?:\\s*일)?(?!\\d)","(?<!\\d)(20\\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\\d|3[01])(?!\\d)")){
   var matcher=Pattern.compile(pattern).matcher(text);
   while(matcher.find())try{found.add(LocalDate.of(Integer.parseInt(matcher.group(1)),Integer.parseInt(matcher.group(2)),Integer.parseInt(matcher.group(3))).toString());}catch(DateTimeException ignored){}
  }
  return List.copyOf(found);
 }
 @PostMapping public Result recognize(@RequestAttribute(AuthInterceptor.ACCOUNT)Account account,@PathVariable Long storeId,@RequestBody Request r){
  access.requireMember(account,storeId);if(key.isBlank())throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,"촬영 인식 서버 연결이 필요해요. 지금은 유통기한을 직접 입력해주세요");
  if(r.imageBase64()==null||r.imageBase64().length()>5600000)throw new ApiException(HttpStatus.BAD_REQUEST,"사진은 4MB 이하로 촬영해주세요");
  byte[] image;try{image=Base64.getDecoder().decode(r.imageBase64());}catch(IllegalArgumentException e){throw new ApiException(HttpStatus.BAD_REQUEST,"사진 형식을 확인해주세요");}
  if(image.length<8||image.length>4194304||!((image[0]==(byte)0xff&&image[1]==(byte)0xd8)||(image[0]==(byte)0x89&&image[1]==0x50&&image[2]==0x4e&&image[3]==0x47)))throw new ApiException(HttpStatus.BAD_REQUEST,"JPEG 또는 PNG 사진을 사용해주세요");
  long now=System.currentTimeMillis();Long previous=lastRequest.putIfAbsent(account.getId(),now);if(previous!=null){if(now-previous<3000||!lastRequest.replace(account.getId(),previous,now))throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,"잠시 후 다시 촬영해주세요");}if(lastRequest.size()>10000)lastRequest.entrySet().removeIf(e->now-e.getValue()>60000);
  try{
   Map<?,?> response=http.post().uri("/v1/images:annotate").header("X-Goog-Api-Key",key).body(Map.of("requests",List.of(Map.of("image",Map.of("content",r.imageBase64()),"features",List.of(Map.of("type","TEXT_DETECTION")),"imageContext",Map.of("languageHints",List.of("ko","en")))))).retrieve().body(Map.class);
   if(response==null||!(response.get("responses") instanceof List<?> list)||list.isEmpty()||!(list.getFirst() instanceof Map<?,?> result))throw new IllegalStateException();
   if(result.get("error") instanceof Map<?,?> error){int code=error.get("code") instanceof Number n?n.intValue():502;code=switch(code){case 3->400;case 7->403;case 8->429;case 14->503;case 16->401;default->code;};throw new ApiException(HttpStatus.BAD_GATEWAY,OcrFailure.message(code,error));}
   String text=result.get("fullTextAnnotation") instanceof Map<?,?> annotation?(annotation.get("text") instanceof String value?value:""):"";
   return new Result(dates(text),text.substring(0,Math.min(2000,text.length())));
  }catch(ApiException e){throw e;}
  catch(org.springframework.web.client.RestClientResponseException e){throw new ApiException(HttpStatus.BAD_GATEWAY,OcrFailure.message(e.getStatusCode().value(),e.getResponseBodyAsString()));}
  catch(org.springframework.web.client.ResourceAccessException e){throw new ApiException(HttpStatus.BAD_GATEWAY,"서버에서 Google OCR에 연결하지 못했어요. 노트북 네트워크·VPN·방화벽을 확인해주세요. (OCR_NETWORK)");}
  catch(Exception e){throw new ApiException(HttpStatus.BAD_GATEWAY,"사진 인식 응답을 처리하지 못했어요. 다시 촬영해주세요. (OCR_RESPONSE)");}
 }
}

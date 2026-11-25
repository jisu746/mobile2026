package com.storemate.backend.web;
import com.storemate.backend.domain.*;import com.storemate.backend.repo.*;
import org.junit.jupiter.api.*;import org.springframework.beans.factory.annotation.Autowired;import org.springframework.boot.test.context.SpringBootTest;import org.springframework.boot.test.web.server.LocalServerPort;import org.springframework.web.client.*;import org.springframework.http.*;
import java.time.*;import java.util.*;import static org.junit.jupiter.api.Assertions.*;
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties="spring.datasource.url=jdbc:h2:mem:api-smoke;MODE=MySQL;NON_KEYWORDS=DAY;DB_CLOSE_DELAY=-1")
class ApiSmokeIntegrationTest {
 @LocalServerPort int port;@Autowired AccountRepository accounts;@Autowired StoreRepository stores;@Autowired StoreMemberRepository members;@Autowired AuthTokenRepository tokens;
 Account owner,staff;Store store;StoreMember member;String ownerToken,staffToken;RestClient http;
 @BeforeEach void setup(){String key=UUID.randomUUID().toString().substring(0,8);owner=accounts.save(new Account("sm-ow-"+key,"test",Role.OWNER,"사장","20000101"));staff=accounts.save(new Account("sm-wk-"+key,"test",Role.STAFF,"직원","20000101"));store=stores.save(new Store("테스트","기타",null,null,null,"09:00","22:00",key,owner));members.save(new StoreMember(owner,store,Role.OWNER,MemberStatus.APPROVED));member=members.save(new StoreMember(staff,store,Role.STAFF,MemberStatus.APPROVED));ownerToken=UUID.randomUUID().toString();staffToken=UUID.randomUUID().toString();tokens.save(new AuthToken(ownerToken,owner));tokens.save(new AuthToken(staffToken,staff));http=RestClient.create("http://localhost:"+port);}
 private Map<?,?> get(String token,String path){return http.get().uri(path).headers(h->h.setBearerAuth(token)).retrieve().body(Map.class);}
 private Map<?,?> post(String token,String path,Object body){return http.post().uri(path).headers(h->h.setBearerAuth(token)).body(body).retrieve().body(Map.class);}
 private String base(){return "/api/stores/"+store.getId();}
 @Test void missingTokenIsRejected(){var e=assertThrows(HttpClientErrorException.class,()->http.get().uri(base()+"/products").retrieve().toBodilessEntity());assertEquals(HttpStatus.UNAUTHORIZED,e.getStatusCode());}
 @Test void receiptAndBatchEndpointsSerializeAndKeepExpiryGroups(){var request=Map.of("clientKey","smoke-receipt-001","items",List.of(Map.of("barcode","SMOKE-01","name","테스트","category","기타","qty",3,"expiry",LocalDate.now().plusDays(3).toString())));var result=http.post().uri(base()+"/receipts").headers(h->h.setBearerAuth(ownerToken)).body(request).retrieve().body(List.class);assertEquals(1,result.size());var product=get(staffToken,base()+"/products/SMOKE-01");assertEquals(3,((Number)product.get("stock")).intValue());var batch=http.get().uri(base()+"/products/SMOKE-01/batches").headers(h->h.setBearerAuth(staffToken)).retrieve().body(List.class);assertEquals(1,batch.size());}
 @Test void validExpoTokenCanActuallyRegisterThroughAuthentication(){http.post().uri("/api/me/push-devices").headers(h->h.setBearerAuth(staffToken)).body(Map.of("token","ExpoPushToken[abcdefghijklmnop]","timezone","Asia/Seoul")).retrieve().toBodilessEntity();}
 @Test void ocrWithoutServerCredentialFailsClearly(){assertEquals(false,get(staffToken,base()+"/expiry-ocr").get("configured"));var e=assertThrows(RestClientResponseException.class,()->post(staffToken,base()+"/expiry-ocr",Map.of("imageBase64","invalid")));assertEquals(HttpStatus.SERVICE_UNAVAILABLE,e.getStatusCode());}
 @Test void settingsAreSharedButOnlyOwnerCanWrite(){var before=get(ownerToken,base()+"/operation-settings");var update=new HashMap<String,Object>();before.forEach((k,v)->update.put(k.toString(),v));update.put("expirationAlertDays",7);http.put().uri(base()+"/operation-settings").headers(h->h.setBearerAuth(ownerToken)).body(update).retrieve().toBodilessEntity();assertEquals(7,((Number)get(staffToken,base()+"/operation-settings").get("expirationAlertDays")).intValue());var e=assertThrows(HttpClientErrorException.class,()->http.put().uri(base()+"/operation-settings").headers(h->h.setBearerAuth(staffToken)).body(update).retrieve().toBodilessEntity());assertEquals(HttpStatus.FORBIDDEN,e.getStatusCode());}
 @Test void payrollEntriesAreVisibleToTheirEmployeeAndCannotBeWrittenByEmployee(){String month=YearMonth.now().toString();String path=base()+"/staff/"+member.getId()+"/payroll/entries?month="+month;post(ownerToken,path,Map.of("kind","OTHER","reason","확인한 지급","amount",1200,"clientKey","smoke-payroll-01"));assertEquals(1200,((Number)get(staffToken,base()+"/payroll/me?month="+month).get("netPay")).intValue());var e=assertThrows(HttpClientErrorException.class,()->post(staffToken,path,Map.of("kind","OTHER","reason","불가","amount",1200,"clientKey","smoke-payroll-02")));assertEquals(HttpStatus.FORBIDDEN,e.getStatusCode());}
 @Test void statutorySettingsTravelThroughRealHttpAndBindDates(){
  String path=base()+"/staff/"+member.getId()+"/payroll/automatic?month=2026-10";
  assertEquals(0,((Number)get(ownerToken,path).get("revision")).intValue());
  var wk=new StatutoryPayCalculator.Week(LocalDate.of(2026,10,11),60,4,20,10000,true,true,true,true,null,3.0);
  var settings=new StatutoryPayCalculator.Settings(true,false,true,false,1,List.of(),List.of(wk),List.of(),true);
  var saved=http.put().uri(path).headers(h->h.setBearerAuth(ownerToken)).body(new StatutoryPayrollController.Save(0,settings)).retrieve().body(Map.class);
  var result=post(ownerToken,base()+"/staff/"+member.getId()+"/payroll/automatic/apply?month=2026-10",Map.of("hash",saved.get("hash")));
  assertEquals(true,result.get("applied"));assertEquals(30000,((Number)get(staffToken,base()+"/payroll/me?month=2026-10").get("netPay")).intValue());
  var denied=assertThrows(HttpClientErrorException.class,()->get(staffToken,path));assertEquals(HttpStatus.FORBIDDEN,denied.getStatusCode());
 }
 @Test void productPhotoIsAvailableToApprovedEmployeeThroughHttp() throws Exception {
  http.post().uri(base()+"/receipts").headers(h->h.setBearerAuth(ownerToken)).body(Map.of("clientKey","photo-smoke-receipt","items",List.of(Map.of("barcode","PHOTO-HTTP","name","테스트 상품","category","기타","qty",1)))).retrieve().toBodilessEntity();
  String path=base()+"/products/PHOTO-HTTP/photo";
  var saved=http.put().uri(path).headers(h->h.setBearerAuth(ownerToken)).body(new ProductPhotoController.Upload(ProductPhotoIntegrationTest.picture(40,20),null,"photo-smoke-001")).retrieve().body(Map.class);
  assertEquals("image/jpeg",saved.get("contentType"));assertEquals(saved.get("version"),get(staffToken,path).get("version"));assertEquals(saved.get("version"),get(staffToken,base()+"/products/PHOTO-HTTP").get("photoVersion"));
 }
}

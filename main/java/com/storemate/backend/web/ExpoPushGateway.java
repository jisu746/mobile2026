package com.storemate.backend.web;
import com.storemate.backend.domain.*;
import org.springframework.stereotype.Component;import org.springframework.beans.factory.annotation.Value;import org.springframework.web.client.RestClient;import org.springframework.http.client.JdkClientHttpRequestFactory;
import java.time.*;import java.util.*;
@Component public class ExpoPushGateway {
 private final RestClient http;private final String accessToken;
 public record Ticket(String id,boolean invalidDevice){}
 public enum Receipt {PENDING,DELIVERED,INVALID_DEVICE,FAILED}
 public ExpoPushGateway(@Value("${storemate.push.access-token:${EXPO_ACCESS_TOKEN:}}")String accessToken){this.accessToken=accessToken;var factory=new JdkClientHttpRequestFactory(java.net.http.HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build());factory.setReadTimeout(Duration.ofSeconds(10));http=RestClient.builder().requestFactory(factory).baseUrl("https://exp.host/--/api/v2/push").build();}
 public Ticket send(PushDevice device,Notification n){
  Map<?,?> response=http.post().uri("/send").headers(h->{if(!accessToken.isBlank())h.setBearerAuth(accessToken);}).body(Map.of("to",device.getToken(),"title",n.getTitle(),"body",n.getSub()==null?"":n.getSub(),"sound","default","channelId","default","data",Map.of("notificationId",n.getId(),"storeId",n.getStore().getId(),"kind",n.getKind()))).retrieve().body(Map.class);
  if(response!=null&&response.get("data") instanceof Map<?,?> data){if("ok".equals(data.get("status"))&&data.get("id") instanceof String id)return new Ticket(id,false);if(data.get("details") instanceof Map<?,?> details&&"DeviceNotRegistered".equals(details.get("error")))return new Ticket(null,true);}
  throw new IllegalStateException("Push service did not accept the message");
 }
 public Receipt receipt(String ticket){
  Map<?,?> response=http.post().uri("/getReceipts").headers(h->{if(!accessToken.isBlank())h.setBearerAuth(accessToken);}).body(Map.of("ids",List.of(ticket))).retrieve().body(Map.class);
  if(response==null||!(response.get("data") instanceof Map<?,?> data)||!(data.get(ticket) instanceof Map<?,?> item))return Receipt.PENDING;
  if("ok".equals(item.get("status")))return Receipt.DELIVERED;if(item.get("details") instanceof Map<?,?> details&&"DeviceNotRegistered".equals(details.get("error")))return Receipt.INVALID_DEVICE;return Receipt.FAILED;
 }
}

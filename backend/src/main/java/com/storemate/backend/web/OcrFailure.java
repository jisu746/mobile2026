package com.storemate.backend.web;

import java.util.*;
import tools.jackson.databind.json.JsonMapper;

/** Converts provider diagnostics to fixed, credential-free messages. */
final class OcrFailure {
    private static final JsonMapper JSON=JsonMapper.builder().build();
    private static final Set<String> REASONS=Set.of("API_KEY_INVALID","API_KEY_EXPIRED","API_KEY_SERVICE_BLOCKED","API_KEY_HTTP_REFERRER_BLOCKED","API_KEY_IP_ADDRESS_BLOCKED","API_KEY_ANDROID_APP_BLOCKED","API_KEY_IOS_APP_BLOCKED","SERVICE_DISABLED","BILLING_DISABLED","BILLING_NOT_ACTIVE","RATE_LIMIT_EXCEEDED","QUOTA_EXCEEDED");
    static String reason(Object value,int depth){
        if(depth>12)return "UNKNOWN";
        if(value instanceof Map<?,?> map){
            Object reason=map.get("reason");if(reason instanceof String text&&REASONS.contains(text))return text;
            for(Object child:map.values()){String found=reason(child,depth+1);if(!found.equals("UNKNOWN"))return found;}
        }else if(value instanceof List<?> list)for(Object child:list){String found=reason(child,depth+1);if(!found.equals("UNKNOWN"))return found;}
        return "UNKNOWN";
    }
    static String message(int status,String body){Object parsed;try{parsed=JSON.readValue(body,Object.class);}catch(Exception ignored){parsed=Map.of();}return message(status,parsed);}
    static String message(int status,Object body){
        String reason=reason(body,0);
        String text=switch(reason){
            case "API_KEY_INVALID","API_KEY_EXPIRED" -> "Google이 OCR 키를 거부했어요. 새 키와 서버에 입력한 키가 같은지 확인해주세요.";
            case "BILLING_DISABLED","BILLING_NOT_ACTIVE" -> "Google Cloud 프로젝트에 활성 결제 계정이 연결되어 있지 않아요. 결제 설정을 확인해주세요.";
            case "SERVICE_DISABLED" -> "이 키의 프로젝트에서 Cloud Vision API를 사용 설정해주세요. 방금 설정했다면 잠시 후 다시 촬영해주세요.";
            case "API_KEY_SERVICE_BLOCKED" -> "API 키의 API 제한에서 Cloud Vision API가 허용되어 있는지 확인해주세요.";
            case "API_KEY_HTTP_REFERRER_BLOCKED","API_KEY_IP_ADDRESS_BLOCKED","API_KEY_ANDROID_APP_BLOCKED","API_KEY_IOS_APP_BLOCKED" -> "API 키의 애플리케이션 제한이 현재 서버 요청을 차단하고 있어요. 서버용 키 제한을 확인해주세요.";
            case "RATE_LIMIT_EXCEEDED","QUOTA_EXCEEDED" -> "Google OCR 호출 한도를 초과했어요. 할당량을 확인하거나 잠시 후 다시 시도해주세요.";
            default -> switch(status){
                case 401 -> "Google OCR 인증에 실패했어요. 서버 키 설정을 확인해주세요.";
                case 403 -> "Google이 OCR 요청을 허용하지 않았어요. 프로젝트의 결제·API 사용 설정·키 제한을 확인해주세요.";
                case 429 -> "Google OCR 호출 한도를 초과했어요. 잠시 후 다시 시도해주세요.";
                case 400 -> "Google이 사진 요청을 처리하지 못했어요. 사진을 다시 촬영해주세요.";
                default -> "Google OCR 서비스 응답에 문제가 있어요. 잠시 후 다시 촬영해주세요.";
            };
        };
        return text+" (OCR_"+(reason.equals("UNKNOWN")?status:reason)+")";
    }
    private OcrFailure(){}
}

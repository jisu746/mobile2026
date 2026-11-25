package com.storemate.backend.web;
import org.junit.jupiter.api.Test;import java.util.*;import static org.junit.jupiter.api.Assertions.*;
class OcrFailureTest {
 private String body(String reason){return "{\"error\":{\"code\":403,\"message\":\"SECRET_TEST_TOKEN raw provider text\",\"details\":[{\"reason\":\""+reason+"\"}]}}";}
 @Test void billingFailureIsExplicit(){assertTrue(OcrFailure.message(403,body("BILLING_DISABLED")).contains("활성 결제 계정"));}
 @Test void keyAndServiceErrorsHaveDifferentActions(){assertTrue(OcrFailure.message(400,body("API_KEY_INVALID")).contains("키를 거부"));assertTrue(OcrFailure.message(403,body("SERVICE_DISABLED")).contains("사용 설정"));assertTrue(OcrFailure.message(403,body("API_KEY_SERVICE_BLOCKED")).contains("API 제한"));}
 @Test void applicationRestrictionsAreRecognized(){assertTrue(OcrFailure.message(403,body("API_KEY_IP_ADDRESS_BLOCKED")).contains("애플리케이션 제한"));}
 @Test void rateLimitIsNotShownAsInvalidKey(){assertTrue(OcrFailure.message(429,"{}").contains("호출 한도"));}
 @Test void unknownAndMalformedResponsesNeverExposeRawContent(){for(String body:List.of(body("CUSTOM_SECRET_TEST_TOKEN"),"SECRET_TEST_TOKEN not-json")){String result=OcrFailure.message(403,body);assertFalse(result.contains("SECRET_TEST_TOKEN"));assertTrue(result.contains("OCR_403"));}}
 @Test void perImageErrorMapUsesSameSafeMapping(){String text=OcrFailure.message(403,Map.of("details",List.of(Map.of("reason","BILLING_DISABLED"))));assertTrue(text.contains("OCR_BILLING_DISABLED"));}
}

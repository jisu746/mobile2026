// 모든 /api 요청의 토큰(Authorization: Bearer)을 확인해 로그인한 계정을 붙여 주는 문지기
package com.storemate.backend.web;

import com.storemate.backend.repo.AuthTokenRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class AuthInterceptor implements HandlerInterceptor {
    public static final String ACCOUNT = "account";
    public static final String TOKEN = "token";

    private final AuthTokenRepository tokens;

    public AuthInterceptor(AuthTokenRepository tokens) {
        this.tokens = tokens;
    }

    @Override
    public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) {
        if ("OPTIONS".equals(req.getMethod())) return true; // CORS 사전 요청
        String header = req.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "로그인이 필요해요");
        }
        String token = header.substring(7);
        var found = tokens.findById(token).orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "로그인이 만료됐어요"));
        req.setAttribute(ACCOUNT, found.getAccount());
        req.setAttribute(TOKEN, token);
        return true;
    }
}

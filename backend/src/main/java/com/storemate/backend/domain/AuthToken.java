package com.storemate.backend.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;

// 로그인하면 발급하는 토큰. 앱이 저장해 두었다가 요청마다 Authorization 헤더로 보낸다.
@Entity
@Table(name = "auth_tokens")
public class AuthToken {

    @Id
    @Column(length = 64)
    private String token;

    // 인터셉터가 세션 밖에서 계정을 꺼내 쓰므로 바로 함께 읽는다
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    private Account account;

    private LocalDateTime createdAt = LocalDateTime.now();

    protected AuthToken() {
    }

    public AuthToken(String token, Account account) {
        this.token = token;
        this.account = account;
    }

    public String getToken() { return token; }
    public Account getAccount() { return account; }
}

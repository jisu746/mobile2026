// 로그인 토큰 테이블 조회·저장 창구
package com.storemate.backend.repo;

import com.storemate.backend.domain.AuthToken;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuthTokenRepository extends JpaRepository<AuthToken, String> {
}

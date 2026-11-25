# Google·카카오 로그인 설정

코드는 구현되어 있으나 실제 공급자 계정·키가 연결되지 않은 상태에서는 버튼을 비활성화한다. Google/Kakao 콘솔에서 앱을 만들고 웹 OAuth 클라이언트를 설정한다. 서버에만 아래 값을 지정하며 소스 저장소나 모바일 앱에 secret을 포함하지 않는다.

```
SOCIAL_BASE_URL=https://서비스도메인
GOOGLE_OAUTH_CLIENT_ID=콘솔에서발급
GOOGLE_OAUTH_CLIENT_SECRET=서버전용
KAKAO_OAUTH_CLIENT_ID=REST_API_KEY
KAKAO_OAUTH_CLIENT_SECRET=서버전용
```

허용 Redirect URI:

- Google: `https://서비스도메인/api/auth/social/google/callback`
- Kakao: `https://서비스도메인/api/auth/social/kakao/callback`

카카오 로그인 활성화 및 Client Secret 사용 설정을 함께 확인한다. 개발 시 `http://localhost:포트`도 허용하지만 모바일 브라우저에서 서버의 콜백에 접근할 수 있어야 한다. 운영은 HTTPS를 사용한다.

흐름: 사용자 유형 선택 → 서버가 state와 별도 결과 조회 비밀값 발급 → 시스템 브라우저 로그인 → 서버에서 코드 교환 → 앱이 비밀값으로 결과 조회 → 앱 인증 토큰 1회 발급. 대기 상태는 5분 후 만료되며 서버 재시작 또는 다른 인스턴스 콜백 시 다시 시작해야 한다. 다중 서버 운영에는 공유 상태 저장소가 필요하다.

처음 로그인하면 선택한 역할의 별도 계정을 생성한다. 이메일로 기존 계정을 임의 연결하지 않는다. 기존 비밀번호 계정과 자동 병합하지 않는다.

자동 검사는 공급자 응답을 대역 처리하여 state·일회성·비밀값·계정 생성을 검증한다. 실제 Google/Kakao 로그인, 취소, 재시도, 앱 복귀는 위 설정 후 실제 기기에서 검증해야 한다.

공식 문서:
- https://developers.google.com/identity/protocols/oauth2/web-server
- https://developers.kakao.com/docs/latest/ko/kakaologin/rest-api

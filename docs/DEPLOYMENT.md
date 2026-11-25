# 실행·배포 준비

## 로컬 변경본 실행

원래 사용하던 `src/main/resources/application.properties`의 DB 접속 정보는 보존한다. 새 엔티티가 추가되므로 중요한 DB는 먼저 백업한다. 운영 DB의 스키마를 무검증으로 갱신하지 않는다.

백엔드 명령 프롬프트에서 기존 서버를 종료한 후:

```bat
gradlew.bat bootRun
```

프론트 `mobile` 폴더에서:

```bat
npm install
npx expo start --clear --go
```

Expo Go로 기존 기능은 확인할 수 있다. 실제 푸시와 설치 앱 동작은 아래 설치 빌드가 필요하다. 개발 서버 주소는 개인 `.env.local`의 `EXPO_PUBLIC_API_URL`로 지정한다. 이 파일과 DB 비밀번호는 팀 공유 ZIP에 포함하지 않는다.

## 운영 환경

`backend/.env.example`을 `.env`로 복사하고 실제 값으로 설정한다. 서버 비밀 키와 DB 암호는 서버 환경 변수에만 둔다. `EXPO_PUBLIC_*` 변수에는 비밀 키를 넣지 않는다.

- DB_URL / DB_USERNAME / DB_PASSWORD: 운영 MySQL
- API_DOMAIN: 소유하고 서버를 가리키는 실제 도메인
- GOOGLE_VISION_API_KEY: Google Vision API에만 제한한 서버 전용 키
- PUSH_ENABLED: 자격 증명 연결과 테스트 후 true
- EXPO_ACCESS_TOKEN: Expo 프로젝트의 푸시 보안 설정에 맞는 서버 전용 토큰

Docker가 설치된 서버에서 제공한 `compose.yaml`과 `Caddyfile`을 사용할 수 있다. DB는 외부 포트를 공개하지 않고 프록시가 HTTPS를 담당한다. 서버 방화벽과 DNS에서 80/443 접근을 준비해야 한다.

```sh
docker compose build backend
docker compose up -d db
```

**최초 스키마/마이그레이션**: `application-prod.properties`는 기본적으로 `ddl-auto=validate`이므로 스키마가 없거나 다르면 시작을 중단한다. 기존 DB는 덤프·복구 검증과 스테이징 마이그레이션을 먼저 한다. 새 빈 개발/스테이징 DB에서만 다음 일회성 초기화를 사용할 수 있다.

```sh
docker compose run --rm --entrypoint java backend -Duser.timezone=Asia/Seoul -jar /app/app.jar --spring.profiles.active=prod --spring.jpa.hibernate.ddl-auto=update --storemate.automation.enabled=false --spring.main.web-application-type=none
```

이 명령은 프로세스가 계속 실행될 수 있다. 스키마 생성 성공을 확인하고 종료한 다음 기본 validate 설정으로 실행한다. 실제 운영 DB에는 검토한 마이그레이션 SQL을 적용한다.

```sh
docker compose up -d backend proxy
```

실제 서버 생성·운영 DB 변경·도메인 연결은 이 작업에서 실행하지 않았다. 개발 자동 승인/아무 QR 허용 옵션은 운영 프로필에서 꺼져 있다.

## 푸시와 OCR

- [Expo 푸시 설치 안내](https://docs.expo.dev/push-notifications/push-notifications-setup/): 프로젝트 ID와 FCM/Apple 자격 증명, 설치 앱이 필요하다.
- [Expo Go 푸시 제한](https://docs.expo.dev/push-notifications/faq/): Expo Go에서 원격 푸시 테스트를 완료했다고 판단하지 않는다.
- [Google Vision OCR](https://docs.cloud.google.com/vision/docs/ocr): 사진은 base64로 서버를 통해 전송한다. 과금·API 사용 설정·키 제한을 관리해야 한다.

## 운영 전 확인

- 백업 SQL을 별도 빈 DB에 복구할 수 있는지 확인
- 앱 계정별 권한, 푸시 로그아웃 차단, 잠금 화면/백그라운드 수신 확인
- 실제 근로계약에 맞는 수당·휴게·공제 기준 검토
- 퇴근 자동 마감 정책을 직원에게 안내하고 실제 근무시간 정정 절차 확인
- 원격 알림은 재전송 중 중복될 가능성이 있으므로 기기 수신을 보장하는 수단으로 단독 사용하지 않기

# StoreMate

매장의 출퇴근·근무 일정·급여·재고·인수인계를 관리하는 앱입니다. 사장님과 직원 화면이 있습니다.

## 실행 방법

Java 21, Node.js, MySQL 이 필요합니다. 경로는 내려받은 위치에 맞게 바꿔 주세요.

### 1. DB 준비

MySQL 을 켜고, 처음 한 번만 데이터베이스를 만듭니다.

```sql
CREATE DATABASE smartstore;
```

DB 접속 정보는 `backend/src/main/resources/application.properties` 에서 설정합니다.
테이블은 서버를 켤 때 자동으로 만들어지고 갱신됩니다(`ddl-auto=update`). **지우면 안 되는 데이터가 있으면 `git pull` 후 서버를 켜기 전에 백업하세요.**

### 2. 서버 (명령 프롬프트 1)

```bat
cd /d C:\mobile2026\backend
gradlew.bat bootRun
```

기본 주소는 `http://localhost:8080` 입니다.

### 3. 앱 (명령 프롬프트 2)

```bat
cd /d C:\mobile2026\mobile
npm install
npx expo start --web
```

`npm install` 은 처음 실행할 때와 `package.json` 이 바뀌었을 때 필요합니다. 서버와 앱 창은 계속 열어 둡니다.

| 실행 환경 | 방법 | 서버 주소 |
|---|---|---|
| 웹 | `npx expo start --web` | 설정 없이 `localhost:8080` |
| 안드로이드 에뮬레이터 | Android Studio 에서 에뮬레이터를 켠 뒤 `npx expo start --go --android` | 설정 없이 `10.0.2.2:8080` |
| 실제 휴대폰 (같은 Wi-Fi) | `npx expo start --go` | `mobile/.env.local` 에 `EXPO_PUBLIC_API_URL=http://PC의_IP:8080` |

설치용 APK 와 네이티브 빌드(`npm run android`)는 [mobile/BUILDING.md](mobile/BUILDING.md) 를 참고하세요.

## 파일 구조

```text
mobile2026/
├─ mobile/                React Native(Expo) 앱: 화면과 서버 호출
│  ├─ App.tsx             로그인 상태와 화면 전환
│  ├─ src/                화면(.tsx)과 서버 연동·계산(.ts)
│  └─ assets/             아이콘, 글꼴
├─ backend/               Spring Boot API 서버
│  ├─ docs/               배포, 급여 계산, 소셜 로그인 문서
│  └─ src/main/java/com/storemate/backend/
│     ├─ web/             요청을 받는 곳(Controller)과 업무 처리
│     ├─ repo/            DB 조회·저장 인터페이스
│     └─ domain/          DB 테이블 엔티티
└─ readme.md
```

앱에서 자주 쓰는 공용 파일입니다.

| 파일 | 역할 |
|---|---|
| `src/api.ts` | 서버 호출 공통 통로, 오류 문구 변환(`errorText`) |
| `src/ui.tsx` | 색상과 공용 컴포넌트 |
| `src/font.tsx` | 글꼴이 적용된 `Text`, `TextInput` |
| `src/work.ts` | 출퇴근·근무 기록, 날짜·시간·금액 표기 |

## 개발 설정

`application.properties` 의 개발용 스위치입니다. 지금 저장소의 값은 모두 `true` 입니다.

| 설정 | `true` 일 때 |
|---|---|
| `storemate.dev.auto-approve` | 직원 참여 요청이 승인 없이 처리됨 |
| `storemate.dev.any-qr` | QR·바코드에 아무 값이나 입력해도 통과 |
| `storemate.dev.seed-products` | 샘플 상품이 만들어짐 |

촬영 인식과 푸시 알림은 외부 서비스 키가 필요합니다. 설정 이름은 `application.properties.example` 을 참고하세요.
**실제 비밀 키는 `application.properties` 에 적어 커밋하지 마세요.** 이 파일은 git 이 추적합니다.

## 검사

커밋 전에 실행합니다.

```bat
cd /d C:\mobile2026\mobile
npx tsc --noEmit
npx prettier@3.6.2 --write App.tsx index.ts "src/**/*.{ts,tsx}"

cd /d C:\mobile2026\backend
gradlew.bat test
```

- 코드 모양은 Prettier 설정(`mobile/.prettierrc`)을 따릅니다.
- 서버 테스트는 메모리 DB 를 사용하므로 MySQL 데이터에 영향이 없습니다.
- 앱에는 자동 화면 테스트가 없습니다. 바꾼 화면은 직접 실행해서 확인합니다.

## 작업 방법 (Git)

1. `main` 이 기준입니다. 시작하기 전에 `git switch main` → `git pull`
2. 기능마다 새 브랜치를 만듭니다. 예: `feature/owner-alerts`, `fix/clock-in`
3. 작업이 끝나면 푸시하고 PR 을 올립니다. `main` 에 바로 푸시하지 않습니다.
4. 병합한 브랜치는 삭제하고, 다음 작업은 최신 `main` 에서 새로 시작합니다.
5. 충돌이 나면 한쪽 파일을 통째로 덮어쓰지 말고 양쪽 기능을 모두 확인합니다. 어려우면 팀에 알립니다.
6. GitHub 웹의 파일 업로드와 zip 업로드는 사용하지 않습니다. 파일 위치가 틀어지거나 일부가 빠질 수 있습니다.
7. 처음 한 번, 내 PC 의 git 이름과 이메일이 본인 것인지 확인합니다.

## 남은 작업

### 앱

- **근로계약서 관리(사장님):** 직원 목록이 샘플 데이터이고, 계약서는 기기에만 저장됩니다. 서버 연동이 필요합니다.
- 사장님 재고 알림의 읽음 상태가 기기에만 저장됩니다.
- 발주 방식 확인: 재고 탭의 "발주" 버튼은 앱의 발주·입고 계획 화면을 열고, 사장님 홈의 발주 업무는 쿠팡으로 연결하도록 되어 있습니다. 하나로 맞출지 결정이 필요합니다.

### 외부 연결이 필요한 검증

자세한 절차는 [backend/docs](backend/docs) 에 있습니다.

- 촬영 인식(OCR): Google Vision API 키
- 푸시 알림: Expo 프로젝트와 Android FCM 자격 증명, 설치 앱
- 소셜 로그인: [SOCIAL_LOGIN.md](backend/docs/SOCIAL_LOGIN.md)
- 실제 Android 기기의 카메라·위치·권한·알림·전체 흐름
- 급여 계산은 입력한 약정과 설정을 바탕으로 한 계산 기능입니다. 법정 급여 정산을 보장하지 않습니다. [PAYROLL_AUTOMATIC.md](backend/docs/PAYROLL_AUTOMATIC.md)

### 배포 전

- 개발용 스위치를 모두 `false` 로 변경
- DB 접속 정보를 환경 변수로 분리 ([DEPLOYMENT.md](backend/docs/DEPLOYMENT.md))
- 서버 CORS 가 모든 주소를 허용 중이므로(`WebConfig`) 앱 주소만 허용하도록 제한
- 테스트 계정과 테스트 데이터 정리

## 화면 기준

- 360 × 800 (Android)

## 테스트 계정

계정은 각자의 MySQL 데이터에 따라 다릅니다. 새 DB 에서는 회원가입과 매장 등록부터 진행합니다.
기존에 쓰던 팀 테스트 계정은 `owner1`, `staff1`, `owner2`, `staff2` 입니다.

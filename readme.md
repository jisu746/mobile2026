## 실행 방법: command prompt, MySQL실행
프론트
 1. cd C:\mobile2026\mobile
 2. npx expo start --web
백
 1. cd C:\mobile2026\backend
 2. gradlew bootrun

## 화면 정보: 360*800 android

관리자 화면 구현부분: 직원 화면과 동일한 창
  -알림
  -main화면
  -하단바와 하단바의 바코드 입고, 재고 발주 창 

**확인할 부분**
  하단바에서 알림 항목 삭제하고 프로필 옆으로 옮겼습니다.
  알림 있던 위치엔 MY창 추가

## 테스트 계정(accounts테이블): owner1/abc123!(매장 있음), staff1/abc123!, owner2, staff2

## 파일 구조 설명
mobile2026
├─ mobile/     React Native(Expo) 앱: 화면 + 서버호출
├─ backend/    Spring Boot 서버: API + DB 저장
└─ readme.md(현재)

폴더	설명
web/	요청을 받는 곳(Controller)과 공통 처리
repo/	DB를 읽고 쓰는 창구(인터페이스만 있음)
domain/	DB 테이블 엔티티(테이블 하나에 파일 하나)

resources/application.properties: DB접속정보, 개발용 스위치



## TODO 목록

> 코드의 `TODO:` 주석과 아직 못 한 일을 모았습니다. 줄 번호는 작성 시점(2026-11-19) 기준입니다.

### 1. 코드에 `TODO:`로 남은 곳

| 위치 | 내용 |
| `mobile/src/api.ts:18` | 폰에서는 로그인 토큰을 `expo-secure-store`에 보관 (지금은 웹과 같은 AsyncStorage) |
| `mobile/src/inventory.ts:44` | 유통기한 임박 기준(D-3)이 고정값 → 매장 설정값 사용 (업무 생성, 재고 탭, 입고 화면의 임박 알림 문구가 모두 이 값을 씀) |
| `mobile/src/BarcodeFlow.tsx:204` | 촬영 인식(OCR) |
| `mobile/src/StoreSetup.tsx:183` | 초대 QR 이미지 저장 (미디어 권한 필요) |
| `mobile/src/NotificationSettings.tsx:8` | 알림 설정이 기기에만 저장됨 → 계정 설정으로 서버에 저장 |
| `mobile/src/NotificationSettings.tsx:65` | 방해 금지 시간 설정 화면 |
| `mobile/src/Profile.tsx:64` | 프로필 수정 화면 |
| `mobile/src/Profile.tsx:103` | 근로계약서 화면 |
| `mobile/src/Profile.tsx:111` | MY의 "알림 설정" 항목 연결 (알림 화면의 톱니바퀴로는 이미 열림) |

### 2. 사장님(관리자) 화면이 없어서 못 쓰는 기능
서버 API는 이미 있고, 화면만 만들면 연결됩니다.

| 기능 | API |
| 직원 참여 승인/거절 | `GET /stores/{id}/requests`, `POST /members/{memberId}/approve` 또는 `reject` |
| 직원 목록 | `GET /stores/{id}/staff` |
| 직원 시급 설정 | `PUT /stores/{id}/staff/{memberId}/wage` (`{hourlyWage}`) |
| 직원 근무 일정 조회·저장 | `GET`, `PUT /stores/{id}/staff/{memberId}/shifts` (`{shifts:[{date,start,end}]}`) |

- 시급을 정하기 전에는 직원 화면이 2026년 최저시급(10,320원)으로 계산하고 "(기본)"을 붙입니다.
- 일정이 없으면 직원 홈에 "오늘은 근무 일정이 없어요"가 뜹니다.

### 3. 서버에서 더 만들 것

| 항목 | 설명 |
| 퇴근 누락 자동 마감 | 퇴근을 안 누르면 근무가 계속 열려 있고, 다른 매장에 출근도 못 함 |
| 알림 종류 | 유통기한 임박·재고 부족(매일 오전 스케줄러), 업무 배정·승인/반려, 근무표 확정 알림이 아직 안 만들어짐 |
| 알림 설정 반영·푸시 | 종류별 on/off와 방해 금지 시간을 서버가 적용, 푸시 전송, MY의 안읽음 점을 실제 개수와 연결 |
| 업무 배정·승인 | 담당자 지정 → 완료 보고 → 사장님 승인/반려. 일반 업무("좌석 정리")도 서버로 |
| 인수인계 | 수정·삭제, 긴급 메모를 누가 확인했는지 기록, "직전 파트" 기준 조회 |
| 유통기한 로트 | 상품당 유통기한이 하나뿐이고 폐기하면 재고 전체가 폐기됨 → 입고 묶음 단위로 관리 |
| 신규 상품 적정 재고 | 입고로 등록한 상품은 적정 재고가 0이라 "발주 필요" 업무가 안 생김 (재고 수정 화면에서 지정하면 됨) |
| 계정 | 토큰 만료, 비밀번호 변경·재설정, 프로필 수정 API, 직원 매장 탈퇴 |
| 발주 | 지금은 "발주" 버튼이 쿠팡 메인(`https://www.coupang.com`)을 엶. 실제 발주 기록·추천은 팀원 작업 |
| 출근 QR | 규격이 정해지면 별도 출근 QR 발급(만료/회전) |

### 4. 배포·GitHub 전 정리

- `backend/src/main/resources/application.properties`는 git이 추적 중이고 DB 비밀번호(`1234`)가 들어 있음
- 같은 파일의 개발용 스위치를 배포 전에 `false`로
  - `storemate.dev.auto-approve`: 사장님 승인 화면을 만든 뒤
  - `storemate.dev.any-qr`: QR·바코드 규격이 정해지면 (QR·바코드 형식 검사와 출근 QR 비교가 다시 켜짐)
  - `storemate.dev.seed-products`: 샘플 상품이 필요 없어지면
- 서버 CORS가 모든 주소를 허용 중(`WebConfig`) → 앱 주소만 허용하도록 제한

### 완료한 것 (참고)
근무 일정·시급·입사일 서버 적용, 적정 재고 수정, 두 매장 동시 출근 차단(출근 누르면 바로 안내창), 출근 전 화면 알림 종 제거, "발주 관리 현황" 클릭 시 첫 발주·임박 상품으로 스크롤, "발주" 버튼 → 쿠팡 메인

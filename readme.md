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

> 코드에 `TODO:`로 남겨 둔 곳입니다. 줄 번호는 작성 시점 기준입니다.

### 서버 연결이 남은 곳
`mobile/src/Profile.tsx:18` | MY 화면의 파트·입사일·근무 시간·예상 급여·근속이 샘플 데이터 → 서버 값으로 교체
`mobile/src/StaffHome.tsx:16` | 직원 홈의 근무 시간(14:00 – 20:00)이 샘플 데이터 → 근무 일정 기능 구현 후 서버 값으로 교체
`mobile/src/NotificationSettings.tsx:7` 알림 설정이 기기 저장소에만 저장됨 → 계정 설정으로 서버에 저장 
`mobile/src/work.ts:6` 시급이 10,030원 고정값 → 직원 정보에서 가져오기 |

### 매장 설정값으로 바꿔야 하는 곳
`mobile/src/inventory.ts:43` | 유통기한 임박 기준(D-3)이 고정값 → 매장 설정값 사용 (업무 생성과 재고 탭이 이 값을 씀)
`mobile/src/BarcodeFlow.tsx:29` | 입고 시 임박 알림 기준(D-3)이 코드에 직접 박혀 있음 → 매장 설정값 사용 (위와 같은 값)

### 화면 연결이 남은 곳
`mobile/src/InventoryTab.tsx:74` | "발주 관리 현황" 카드의 상세 화면 연결
`mobile/src/InventoryTab.tsx:111` | 상품 카드의 "발주" 버튼 동작 → 쿠팡 메인화면으로 연결
`mobile/src/Profile.tsx:45` | 프로필 수정 화면
`mobile/src/Profile.tsx:82` | 근로계약서 화면
`mobile/src/Profile.tsx:90` | 알림 설정 화면 연결 (※ 알림 화면 안의 설정 버튼은 이미 연결됨, 확인 필요) |
`mobile/src/NotificationSettings.tsx:65` | 방해 금지 시간 설정 화면
`mobile/src/StaffHome.tsx:96` | 알림 목록 화면 연결

### 기능 구현이 남은 곳
`mobile/src/BarcodeFlow.tsx:206` | 촬영 인식(OCR)
`mobile/src/StoreSetup.tsx:182` | QR 이미지 저장 (미디어 권한 필요)

### 보안·배포 전 정리
`mobile/src/api.ts:17` | 폰에서는 로그인 토큰을 `expo-secure-store`에 보관 (지금은 웹과 같은 AsyncStorage) |

### 코드에 주석은 없지만 같이 챙길 것
`backend/src/main/resources/application.properties`의 개발용 스위치 3개를 배포 전에 `false`로 바꾸기
  - `storemate.dev.auto-approve`: 사장님 승인 화면을 만든 뒤 `false`
  - `storemate.dev.any-qr`: QR·바코드 규격이 정해지면 `false`
  - `storemate.dev.seed-products`: 샘플 상품이 필요 없어지면 `false`
같은 파일의 DB 비밀번호(`1234`)는 GitHub에 올리기 전에 정리
서버의 CORS가 모든 주소를 허용 중(`WebConfig`) → 배포 전에 앱 주소만 허용하도록 제한
직원 참여 요청을 승인/거절하는 앱 화면이 없음(서버 API는 있음)
`readme.md`에 화면 크기가 340×800으로 적혀 있는데 실제는 360×800



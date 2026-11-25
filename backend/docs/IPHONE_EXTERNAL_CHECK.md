# 아이폰 실제 검증과 외부 연결 준비

## 계정 준비 상태 확인

1. Google Cloud Console (https://console.cloud.google.com/) 로그인 후 프로젝트 선택 목록을 확인한다. 사용할 프로젝트에서 Cloud Vision API 활성화와 결제 계정 연결 여부를 확인한다. 아직 준비되지 않았으면 계정/프로젝트가 없다고 기록한다.
2. Expo (https://expo.dev/) 로그인 후 계정의 Projects 목록에서 StoreMate 프로젝트를 확인한다. 프로젝트를 연결한 뒤 공개 project ID를 모바일 EXPO_PUBLIC_EAS_PROJECT_ID로 지정한다.
3. Apple Developer (https://developer.apple.com/account/)에서 Membership details의 Apple Developer Program 상태와 기기 빌드 권한을 확인한다. 일반 Apple ID 로그인만으로 유료 프로그램 가입이 완료된 것은 아니다.

비밀번호·API 키·서명 키는 채팅이나 소스 ZIP에 넣지 않는다. 서버 전용 Vision 키는 로컬 환경 변수 GOOGLE_VISION_API_KEY 또는 서버 비공개 설정에 넣는다. 키는 Cloud Vision API로 사용 범위를 제한한다. 결제 연결·유료 가입·키 생성은 사용자가 계정에서 직접 확인하고 진행한다.

## 먼저 할 수 있는 실제 기기 확인

노트북과 아이폰을 같은 Wi-Fi에 연결하고 아이폰 Expo Go에서 Metro의 QR을 연다. 모바일 서버 주소 EXPO_PUBLIC_API_URL은 아이폰에서 접근 가능한 노트북의 LAN 주소와 8080 포트를 사용한다. 10.0.2.2는 Android 에뮬레이터용이라 아이폰에 사용할 수 없다. 학교 Wi-Fi에서 기기 간 통신을 차단하면 공통 핫스팟 또는 HTTPS 테스트 서버가 필요하다. Metro 터널만으로 백엔드까지 외부에 공개되지는 않는다.

앱 로그인 → 카메라 허용 → 실제 상품 바코드/출퇴근 QR → 사진 저장 → 키보드 선택/스크롤을 확인한다. 실사·발주 입고는 테스트 매장·상품에서 확인하고 운영 재고를 테스트용으로 바꾸지 않는다. OCR 키 연결 후 날짜가 적힌 상품 사진을 촬영해 제조일과 소비/유통기한이 섞여도 사용자가 올바른 날짜를 선택할 수 있는지 확인한다. 이름 인식은 선택한 문구가 입력되고 수정 가능한지 확인한다.

## 실제 푸시

현재 Expo Go에서 실제 원격 푸시를 검증하지 않는다. Expo 프로젝트·iOS 서명·APNs 자격 증명을 연결하고 EAS iOS development build를 아이폰에 설치한다. 해당 기기를 등록한 뒤 서버 PUSH_ENABLED=true로 시작한다. iOS 실제 기기용 EAS 빌드/푸시 자격 증명에는 활성 Apple Developer Program 계정이 필요하다. Windows에서도 EAS 클라우드 빌드 준비는 가능하지만 이 자료에서는 실제 서명·설치 성공을 주장하지 않는다.

설치 앱 MY → 알림 설정 → 이 기기 푸시 연결. 다른 테스트 계정으로 업무 배정/완료 보고를 발생시켜 수신을 확인한다. 전경·백그라운드·화면 잠금·방해 금지·알림 유형 끄기·로그아웃 후 미수신을 확인한다. 알림 목록 저장과 실제 기기 수신은 별개의 확인 항목이다.

## 공식 안내

- Cloud Vision 준비: https://docs.cloud.google.com/vision/docs/setup
- Expo 푸시 설정: https://docs.expo.dev/push-notifications/push-notifications-setup/
- Expo Go 제한: https://docs.expo.dev/push-notifications/faq/
- iOS 실기기 빌드: https://docs.expo.dev/tutorial/eas/ios-development-build-for-devices/

이 문서는 준비 절차이며 실제 외부 서비스 연결 완료 기록이 아니다.

# 설치 앱 만들기

`eas.json`과 `app.config.js`를 추가했다. 기존 앱 ID는 `com.storemate.app`이다.

## Expo Go에서 개발 화면 확인

```bat
npm install
npx expo start --clear --go
```

## 설치 빌드

본인의 Expo 프로젝트에 로그인하고 프로젝트를 연결한다. 타인의 프로젝트 ID나 서명 키를 임의로 사용하지 않는다.

```bat
npx eas-cli login
npx eas-cli init
```

배포 빌드 환경에 다음 공개 변수를 설정한다.

- `EXPO_PUBLIC_API_URL`: 실제 HTTPS 서버 주소
- `EXPO_PUBLIC_EAS_PROJECT_ID`: 연결한 프로젝트의 ID
- GOOGLE_SERVICES_FILE: Android Firebase 프로젝트의 google-services.json 파일 경로 (EAS 파일 변수로 연결)

프로젝트 ID는 공개 설정이며 비밀번호가 아니다. DB 암호, Google Vision 키, 서버 Expo 접근 토큰을 여기에 넣지 않는다. 설치용 preview/production 빌드는 HTTPS 서버 주소가 없으면 설정 단계에서 중단한다.

Android 설치용 APK:

```bat
npx eas-cli build --platform android --profile preview
```

스토어 제출용 Android App Bundle:

```bat
npx eas-cli build --platform android --profile production
```

개발용 네이티브 빌드:

```bat
npx expo run:android
```

개발 APK는 개발 서버가 필요한 앱이며, 외부 서버에 연결한 독립 설치용 preview APK와 다르다. 실제 푸시를 받으려면 FCM 자격 증명을 연결하고 앱의 알림 설정에서 기기를 등록해야 한다.

iOS 설정과 번들 생성 검사는 포함하지만 Windows에서 iOS 설치 앱을 직접 빌드·설치 검증한 것은 아니다. iOS 서명과 실제 기기 검증은 Apple 계정 및 해당 빌드 환경이 필요하다.

## 검증 범위

TypeScript 검사, 서버 단위/통합 검사, Android/iOS/web JavaScript 번들 생성 검사를 수행한다. 번들 생성 성공은 APK 빌드 성공이나 실제 휴대폰에서의 정상 동작을 의미하지 않는다. 최종 결과는 통합 작업 정리의 검사 결과를 따른다.

## Windows 경로 길이 제한

로컬 네이티브 빌드에서 파일 경로가 너무 길다는 오류가 나면 빌드 전에 명령 프롬프트에서 다음 변수를 지정할 수 있습니다. 프로젝트에 포함한 설정 플러그인이 이 경로를 사용합니다.

```bat
set STOREMATE_NATIVE_BUILD_ROOT=%USERPROFILE%\Documents\Codex\_smnative
npx expo run:android
```

빌드 캐시 경로도 짧게 두어야 하는 Windows 환경에서는 `GRADLE_USER_HOME`을 `%USERPROFILE%\Documents\Codex\_smgradle`처럼 짧은 폴더로 지정할 수 있습니다. 기존 CMake 캐시에 이전 절대 경로가 남아 있으면 새 경로에서 생성된 빌드 캐시로 다시 구성합니다. 소스나 데이터베이스 파일을 정리 대상으로 삼지 않습니다.

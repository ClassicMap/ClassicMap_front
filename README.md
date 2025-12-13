# ClassicMap

클래식 음악 입문자를 위한 로드맵 서비스

## 소개

ClassicMap은 클래식 음악에 입문하는 사람들을 위한 통합 플랫폼입니다. 연주자/작곡가 정보, 공연 정보, 그리고 유튜브 영상 구간별 비교 기능을 제공하여 클래식 음악을 더 쉽게 접근할 수 있도록 돕습니다.

- 웹: <https://kang1027.com/classicmap>
- 모바일: 앱스토어/플레이스토어 심사 중

## 주요 기능

- **연주자/작곡가 데이터베이스**: 아티스트 정보 및 작곡가 타임라인 제공
- **공연 정보**: KOPIS API를 활용한 클래식 공연 정보
- **앨범 연동**: Apple Music, Spotify API를 통한 실시간 앨범 정보 제공
- **영상 비교**: 유튜브 영상의 특정 구간을 비교하여 연주자별 해석 차이를 확인

## 기술 스택

- **React Native** - 크로스 플랫폼 모바일 앱 개발
- **Expo** - React Native 개발 플랫폼
- **TypeScript** - 정적 타입 검사
- **Expo Router** - 파일 기반 라우팅
- **TanStack Query** - 서버 상태 관리
- **NativeWind** - Tailwind CSS for React Native
- **Clerk** - 사용자 인증

## 시작하기

### 필수 요구사항

- Node.js 18 이상
- npm 또는 yarn
- Expo CLI

### 설치

```bash
npm install
```

### 환경 변수 설정

`.env.example` 파일을 복사하여 `.env` 파일을 생성하고 필요한 값을 입력하세요.

```bash
cp .env.example .env
```

### 개발 서버 실행

```bash
# 개발 서버 시작
npm run dev

# iOS 시뮬레이터
npm run ios

# Android 에뮬레이터
npm run android

# 웹 브라우저
npm run web
```

## 프로젝트 구조

```
├── app/                    # Expo Router 기반 페이지
│   ├── (auth)/            # 인증 관련 페이지
│   ├── (tabs)/            # 탭 네비게이션 페이지
│   │   ├── home.tsx       # 홈
│   │   ├── artists.tsx    # 아티스트 목록
│   │   ├── concerts.tsx   # 공연 정보
│   │   ├── compare.tsx    # 영상 비교
│   │   └── timeline.tsx   # 작곡가 타임라인
│   ├── artist/            # 아티스트 상세
│   ├── composer/          # 작곡가 상세
│   └── concert/           # 공연 상세
├── components/            # 재사용 가능한 컴포넌트
├── lib/                   # 유틸리티 및 설정
└── assets/               # 이미지, 폰트 등 정적 파일
```

## 배포

### iOS (Prebuild 방식)

iOS는 prebuild가 필수입니다. Expo 빌드만 가능합니다.

```bash
# Prebuild 실행
npx expo prebuild --platform ios

# Xcode에서 프로젝트 열기
open ios/ClassicMap_front.xcworkspace
```

Xcode에서 빌드 및 배포를 진행하세요.

### Android (Prebuild 방식)

```bash
# Prebuild 실행
npx expo prebuild --platform android

# Release 빌드
cd android
./gradlew bundleRelease
```

### Docker

```bash
docker compose up
```

### EAS Build (선택사항)

```bash
# iOS
eas build --platform ios

# Android
eas build --platform android
```

## 라이선스

Copyright © 2025 강(kang). All rights reserved.

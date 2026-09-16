# ClassicMap 프론트엔드 리디자인 보고서

- 작성일: 2026-09-10
- **개정: 2026-09-12 — 시드 데이터 최신화 반영 (1.6절 신설, 4.1.3 / 7.1~7.6 / 10장 수정)**
- **개정: 2026-09-16 — 2차 데이터 최신화 + 시안 검증 반영 (0.4 / 1.7 / 4.7 / 7.3 / 7.7 / 부록 D 신설)**
- 대상: `ClassicMap_front` (Expo SDK 54 / React Native 0.81 / expo-router 6 / NativeWind 4)
- 목적: 현재의 "모바일 화면을 웹으로 늘린" 구조를 벗어나, 2026년 기준 프로덕트 디자인 언어로 앱과 웹을 각각 재설계하기 위한 실행 가능한 기준 문서
- 이 문서의 범위: 디자인 방향 정의, 디자인 토큰 스펙, 플랫폼 분기 전략, 화면별 리디자인 스펙, 컴포넌트 인벤토리, 구현 로드맵
- 이 문서의 범위 밖: 새로 추가해야 할 기능 제안 → `2026-09-10-classicmap-feature-additions.md` 참고

> **다른 에이전트가 이 문서만 읽고 작업할 수 있도록** 현재 코드 상태를 1장에 전부 인벤토리해 두었습니다. 코드를 다시 읽지 않아도 어느 파일의 어느 부분을 어떻게 바꿔야 하는지 판단할 수 있어야 합니다.

---

## 0. 요약 (Executive Summary)

### 0.1 지금 상태 한 줄 진단

**기능은 이미 프로덕트급인데, 시각 언어는 shadcn 기본 테마 그대로이고, 레이아웃은 전 플랫폼이 단일 세로 스크롤 카드 스택입니다.**

- 색: `global.css`의 색상 변수가 shadcn/ui 기본값(`0 0% 100%` / `0 0% 3.9%`)에서 한 글자도 바뀌지 않았습니다. 즉 브랜드 색이 존재하지 않습니다.
- 구조: 5개 탭 전부 `<ScrollView><View className="gap-6 p-4">…</View></ScrollView>` 한 가지 패턴입니다. 데스크톱 1920px에서도 콘텐츠가 화면 전폭으로 늘어난 카드 리스트입니다.
- 밀도: 카드마다 `p-4`, 섹션 간 `gap-6`. 모바일에 맞춘 여백을 데스크톱에서 그대로 쓰기 때문에 1화면당 정보량이 극도로 낮습니다.
- 일관성: 같은 "칩"이 화면마다 `Button size="sm" variant="outline" className="rounded-full"`(compare), `SectorChip`(별도 컴포넌트), 인라인 `View className="rounded-full bg-primary/10 px-3 py-1.5"`(composer 상세)로 세 번 따로 구현되어 있습니다.
- 하드코딩: `#FFD700`, `#C0C0C0`, `#CD7F32`, `#ef4444`, `#22c55e`, `#3b82f6`, `#9ca3af` 등 상태·랭킹 색이 컴포넌트 안에 직접 박혀 있어 테마를 따르지 않습니다.

### 0.2 제안하는 방향

| 축 | 방향 |
|---|---|
| 시각 언어 | **Dark-first, 저채도 warm neutral + 단일 브랜드 액센트(Brass Gold)**. Raycast·Linear 계열의 "보더로만 구획, 그림자 최소, 타이트한 밀도" 규율을 따르되, 클래식 음악 도메인에 맞는 따뜻한 뉴트럴로 차별화 |
| 시대 색 | 기존 6개 시대 컬러는 **데이터 카테고리 팔레트로 격리**. UI 크롬(버튼·보더·포커스)에는 절대 사용하지 않고 타임라인·작곡가 아이덴티티에만 사용 |
| 웹 | **데스크톱 전용 앱 셸로 완전 분리**. 좌측 Side Nav + 메인 + (선택) 우측 Inspector 3열, ⌘K 커맨드 팔레트, 밀도 높은 리스트/테이블 뷰 |
| 앱 | 탭 구조 유지. iOS 26 Liquid Glass 기조에 맞춰 **반투명 크롬 + 컨텐츠 우선**, 다만 Expo/RN 제약상 "유사 표현"까지만 (5.4 참고) |
| 시스템 | Astryx(Meta)는 **직접 의존하지 않고 규격 참조만**. 이유는 5.5에 상술 |
| 구현 방식 | NativeWind 토큰 재정의 → 프리미티브 확장 → 웹 셸 신설 → 화면별 이관. 기존 로직·API·라우트는 보존 |

### 0.3 2026-09-12 데이터 최신화 반영 — 설계 변경 요약

프로덕션 API(`https://api.kang1027.com/classicmap/api`)를 전수 조사한 결과, **골격(다크 우선 토큰 체계, 웹 셸, 밀도 전략, 컴포넌트 인벤토리)은 그대로 유효**하지만 화면 단위 스펙 6곳을 고쳤습니다. 근거 데이터는 1.6절에 있습니다.

| # | 기존 설계 | 변경 | 사유 |
|---|---|---|---|
| C1 | 비교 데스크톱 **2×2 그리드(4슬롯)** | **3열 그리드(3슬롯)** + 5개일 때 3+2 | 실측 섹터당 연주 수가 **3개(12섹터) 또는 5개(3섹터)**. 4개인 섹터는 하나도 없음 |
| C2 | 섹터를 항상 **탭으로** 표시 | 섹터 **1개면 탭 숨김**, 2개 이상일 때만 탭 | 비교 보유 8곡 중 **5곡이 섹터 1개("전곡")** |
| C3 | 시대 팔레트·타임라인·홈 타일 **6종** | **4종 실재** + 중세·르네상스는 빈 상태 처리 | 작곡가 112명이 바로크/고전/낭만/근현대에만 분포. 중세·르네상스 **0명** |
| C4 | 작곡가 상세에서 **작품 목록 나열** | **검색 + 가상화 필수**, 상단 "비교 가능" 우선 정렬 | 바흐 **1,695곡 / 566KB**를 pagination 없이 단일 응답으로 반환 |
| C5 | 아티스트 필터 칩 **한글 7종** | 실제 `category` 값 기반 + **`orchestra` 별도 처리** | 실제 값이 영문 slug 12종이고 `orchestra`가 47건(사람 아님). 한글/영문 혼입도 있음 |
| C6 | 상세 화면 **커버 히어로 h-64** | **블러 배경 + 초상 카드** 방식으로 대체 | 작곡가 **110/112(98%)가 `coverImageUrl == avatarUrl`**. 세로 초상화를 와이드 커버로 쓰면 얼굴이 잘림 |

추가로, 리디자인과 별개로 **지금 깨져 있는 것 3건**을 발견했습니다 (1.6.6 참고).

### 0.4 2026-09-16 2차 데이터 최신화 반영 — 설계 변경 요약

2차 전수 조사에서 작곡가·아티스트·작품 규모가 2~3배로 늘었지만 **비교 데이터는 한 건도 늘지 않았습니다.** 골격과 0.3절의 C1~C6은 그대로 유효하고, 화면 스펙 5곳을 추가로 고쳤습니다. 근거 데이터는 1.7절에 있습니다.

| # | 기존 설계 | 변경 | 사유 |
|---|---|---|---|
| C7 | 목록 기본 정렬은 API 기본값을 그대로 사용 | **`추천순`을 기본 정렬로 신설** (tier S>A>없음>B>C → 채움률 → 작품 수) | `/composers?offset=0&limit=20`이 `birthYear` 오름차순이라 첫 화면이 곰베르·카베손·세르통·다저로 채워집니다. 이미지도 없고 대중에게 낯선 이름만 보입니다 |
| C8 | 작품 메타데이터는 채워져 있음 (0.3절 B6 해소) | **B6 해소를 철회합니다.** 작품 카드는 제목·작곡가만 보장하고 나머지는 있을 때만 표시 | 신규 작품을 포함한 전체 기준 메타데이터 채움률이 약 10%입니다 |
| C9 | 아티스트 필터 칩은 실제 `category` 값 12종 기반 (C5) | **표시용 정규화 맵을 필수로 둡니다** | `category`가 29종으로 늘었고 같은 악기가 `pianist` 58 / `피아노` 43 / `피아니스트` 5로 세 갈래로 쪼개졌습니다 |
| C10 | 아바타는 대체로 존재한다고 가정 | **폴백 타일을 1급 컴포넌트로 승격** (`components/ui/fallback-art.tsx`) | 작곡가 이미지 보유 31%, 아티스트 48%. 목록의 절반 이상이 폴백입니다 |
| C11 | 비교 데스크톱 3열 그리드 (C1) | **유지 확정** | 섹터당 연주 수가 2차 조사에서도 3개 또는 5개이고, 4개인 섹터는 여전히 없습니다 |

### 0.5 성공 기준

1. 1920×1080 웹에서 홈 첫 화면에 보이는 유효 항목 수가 현재 대비 2배 이상.
2. 색상 하드코딩(`#RRGGBB` 리터럴)이 화면·컴포넌트 코드에서 0건. 전부 토큰 경유.
3. 라이트/다크 전환 시 대비 실패(WCAG AA 미만) 0건.
4. `npx tsc --noEmit`, `npx expo export --platform web` 통과.
5. 네이티브(iOS/Android) 회귀 없음 — 특히 비교 화면 영상 재생, 타임라인 제스처.

---

## 1. 현재 상태 인벤토리

### 1.1 기술 스택

```
expo ^54.0.0            react-native 0.81.5        react 19.1.0
expo-router ~6.0.10     nativewind ^4.2.1          tailwindcss ^3.4.14
@tanstack/react-query ^5.90.10                     @clerk/clerk-expo ^2.16.1
@rn-primitives/* (avatar, label, popover, portal, select, separator, slot)
lucide-react-native ^0.545.0
react-native-reanimated ~4.1.1  react-native-gesture-handler ^2.29.1
react-native-youtube-iframe ^2.4.1  react-native-webview ^13.16.0
react-native-web ^0.21.0
```

UI 기반은 **react-native-reusables**(shadcn/ui의 RN 포팅)입니다. `components/ui/`에 button, card, text, input, avatar, icon, label, popover, select, separator가 있습니다.

웹 배포는 `expo export --platform web` (static output), 서브패스 `/classicmap`, nginx + Docker.

### 1.2 라우트 맵

```
app/
├── _layout.tsx                 QueryClientProvider > ClerkProvider > ThemeProvider > Stack
├── index.tsx                   온보딩 모달 + /(tabs)/home 리다이렉트
├── +html.tsx                   웹 루트 HTML. <base href="/classicmap/">, ScrollViewStyleReset
├── +not-found.tsx
├── (auth)/
│   ├── sign-in.tsx   sign-up/   forgot-password.tsx   reset-password.tsx
├── (tabs)/
│   ├── _layout.tsx             Tabs. headerLeft=ThemeToggle, headerRight=UserMenu, headerTitle=''
│   ├── home.tsx        (598줄)  가로 캐러셀 3개 (아티스트/공연/비교)
│   ├── artists.tsx     (444줄)  검색 + 무한스크롤 세로 카드 리스트
│   ├── concerts.tsx   (1051줄)  필터 패널 + 박스오피스 TOP3 캐러셀 + 세로 카드 리스트
│   ├── compare.tsx    (1438줄)  작곡가 선택 → 곡 선택 → 섹터 칩 → 연주 가로 캐러셀
│   └── timeline.tsx   (1321줄)  가로 스크롤 타임라인(캔버스형) + 하단 작곡가 리스트 + 모달 2종
├── artist/[id].tsx     (840줄)  커버 + 프로필 + 카드 스택
├── composer/[id].tsx  (1034줄)  커버 + 프로필 + 작품 목록
├── concert/[id].tsx    (703줄)  포스터 + 정보 카드 스택
├── my-page.tsx         (205줄)  탭 4개 (ratings/favorites/collections/profile). max-w-5xl 적용됨
├── users/[id].tsx      (166줄)  공개 프로필
├── settings.tsx / edit-profile.tsx / change-password.tsx / delete-account.tsx
└── help.tsx / terms-of-service.tsx / privacy-policy.tsx
```

**주목**: `my-page.tsx`만 `mx-auto w-full max-w-5xl`로 웹 폭 제한이 걸려 있습니다. 나머지 전 화면은 폭 제한이 없습니다. 이것이 "웹이 모바일 뷰를 늘린 형태"의 직접 원인입니다.

### 1.3 화면별 현재 레이아웃

#### home (`app/(tabs)/home.tsx`)
- 루트: `ScrollView` + `View className="gap-6 p-4 pb-20"`
- 인사말 블록: `showGreeting` 상태로 3초 뒤 페이드아웃되는 "안녕하세요 OOO님! 👋". `Animated` 손 흔들기 루프.
- 섹션 3개, 전부 동일 패턴: `제목(text-xl font-bold) + 전체보기 버튼` 헤더 → 가로 `FlatList`
  - 주목받는 아티스트: `ArtistCard` (w-160, 아바타 64 + 이름 + 카테고리)
  - 다가오는 공연: `ConcertCard` (w-200, 3:4 포스터 + 제목 2줄 + 날짜 + 장소 + 예매 버튼)
  - 인기 연주 비교: `ComparisonCard` (w-200, 작곡가 아바타 + 곡명 + 아티스트명 + "비교 듣기")
- 로딩 상태가 `loadingX` / `errorX` / `!imagesLoaded` 3단으로 중첩되어 섹션마다 `ActivityIndicator`가 뜹니다.
- 레거시 변환 레이어: API 응답을 `LegacyArtist/LegacyConcert/LegacyComparison`으로 재매핑하는 `useEffect`가 있습니다.

#### artists (`app/(tabs)/artists.tsx`)
- 헤더: `Text variant="h1" className="text-3xl font-bold"` "아티스트 DB" + 설명 + (관리자) 추가 버튼
- 검색: `Input` + 절대배치 `SearchIcon`
- 리스트: `ArtistCard` — `Card p-4` 안에 `flex-row` (아바타 64 / 이름·카테고리·국적 / 삭제버튼)
- 무한스크롤은 `ScrollView`의 `onScroll` 수동 계산 + 1초 쿨다운. `FlatList` 가상화를 쓰지 않습니다.
- 검색 결과와 페이지네이션 결과가 별도 상태(`searchResults` vs `data.pages`)로 이원화되어 있습니다.

#### concerts (`app/(tabs)/concerts.tsx`)
- 접이식 필터 패널 (`FilterIcon` 토글): 날짜(DateTimePicker), 지역 드롭다운(직접 구현한 `TouchableOpacity` + `▼` 문자), 상태/평점 칩
- 박스오피스 TOP3: 가로 스크롤, 랭킹별 하드코딩 색상 테두리(`#FFD700`/`#C0C0C0`/`#CD7F32`) + 원형 배지
- 전체 공연: `ConcertCard` — 높이 250 고정, `flex-row` (w-32 포스터 / 정보). 상태 배지 색상 하드코딩(`#ef4444`, `#9ca3af`, `#22c55e`, `#3b82f6`)

#### compare (`app/(tabs)/compare.tsx`) — 제품의 핵심 화면
- 4단계 세로 스택:
  1. **작곡가 선택**: 헤더 + 원형 토글 버튼(Plus/Check) → 펼치면 검색 Input + 시대 필터 칩 7개(하드코딩 7번 반복) + 최대높이 500 스크롤 리스트. 접으면 선택된 작곡가 카드 1개
  2. **곡 선택**: 동일 패턴 (최대높이 400)
  3. **선택된 곡 정보**: `Card bg-primary/5` 안에 곡명(text-2xl) + 작곡가·시대 + 설명
  4. **연주 비교**: 섹터 칩 wrap → 가로 `FlatList` (pagingEnabled, snapToInterval 350+10) + 하단 페이지 인디케이터
- 연주 카드: 폭 350 고정. 헤더(아바타 32 + 아티스트명 + 관리 버튼) / 영상 196px / 특징 인용문
- 펼침/접힘은 `Animated.View`의 `maxHeight` + `opacity` 보간 2개를 겹쳐서 구현 (`useNativeDriver: false`)

#### timeline (`app/(tabs)/timeline.tsx`)
- 상단: 캔버스형 가로 스크롤 타임라인. `SCREEN_HEIGHT * 0.4` 높이, 5개 레인에 작곡가 아바타 배치, 시대별 배경 색 밴드, 연도 마커
- 밀집 영역은 2초마다 아바타가 로테이션되고, 탭하면 "작곡가 밀집 영역 모달"이 뜹니다
- 하단: 검색 + 작곡가 카드 리스트
- 모달 2종: 시대 정보 모달, 작곡가 영역 모달 (둘 다 `Modal` + Reanimated `SlideInDown`)
- 다크 모드를 `useColorScheme`(RN)과 `window.matchMedia`로 **직접 재감지**합니다 — NativeWind 테마와 이원화된 상태입니다

#### 상세 화면 3종 (artist / composer / concert)
- artist·composer: 커버 이미지 h-64 → 그라디언트 오버레이 → 상단 오버레이 컨트롤(테마토글·유저메뉴) → 좌하단 back 버튼 → `-mt-12`로 겹친 아바타 96 → 이름/영문명 → 카드 스택(기본정보 / 수상 / 통계 / 소개 / 스타일 / 작품·앨범 / 비교 섹션)
- concert: 커버 없음. 상단 컨트롤 → 중앙 제목 → 상태 배지 → 포스터(`width: '80%', maxWidth: 320`) → 정보 카드 스택
- 전부 세로 1열. 데스크톱에서 아무 것도 달라지지 않습니다.

### 1.4 현재 디자인 토큰 상태

`global.css` / `lib/theme.ts` — **shadcn/ui neutral 기본값 그대로**:

```
light: background 0 0% 100%   foreground 0 0% 3.9%   primary 0 0% 9%
       muted 0 0% 96.1%       border 0 0% 89.8%      radius 0.625rem
dark:  background 0 0% 3.9%   foreground 0 0% 98%    primary 0 0% 98%
       muted 0 0% 14.9%       border 0 0% 14.9%
```

문제점:
1. **채도 0**. 브랜드가 없습니다. `primary`가 다크에서 흰색이라 "주요 액션"과 "본문"이 같은 색입니다.
2. **surface 레벨이 1개**. `card`와 `background`가 다크에서 둘 다 `3.9%`로 동일합니다. 카드가 배경에서 분리되지 않고 오직 보더로만 구분됩니다.
3. `chart-1~5`가 정의돼 있으나 사용처가 없습니다.
4. `--ring: 300 0% 45%` — hue 300인데 채도 0이라 의미 없는 값입니다.
5. 시대 색(`lib/data/periods.ts`의 `ERA_COLORS`)은 토큰 체계 밖에 있습니다.

`lib/theme.ts`의 `THEME` 객체는 `global.css`의 값을 **손으로 복제**한 것입니다. 두 파일이 항상 동기화되어야 하는데 강제 장치가 없습니다.

### 1.5 문제 진단 요약

| # | 문제 | 근거 | 영향 |
|---|---|---|---|
| P1 | 웹 전용 레이아웃 부재 | `my-page.tsx` 외 전 화면 폭 무제한, `(tabs)/_layout.tsx`가 웹에서도 하단 탭바 | 데스크톱에서 정보 밀도 극저, 프로덕트로 안 보임 |
| P2 | 브랜드 아이덴티티 부재 | 색상 변수가 shadcn 기본값 | 어떤 앱인지 시각적으로 식별 불가 |
| P3 | 색상 하드코딩 산재 | concerts(랭킹/상태), timeline(시대), compare(시대), artist(수상 amber) | 테마 미준수, 다크모드 대비 사고 (이미 sector-chip에서 1건 발생 — `design-qa.md` 참고) |
| P4 | 컴포넌트 중복 구현 | chip 3종, 검색 input 5곳, 로딩 상태 12곳 이상, empty 상태 8곳 이상 | 변경 비용 증가, 일관성 붕괴 |
| P5 | 밀도 설계 없음 | 전 화면 `p-4` + `gap-6` 고정 | 정보량 대비 스크롤 길이 과다 |
| P6 | 상태 표현 빈약 | `ActivityIndicator` + 텍스트만. 스켈레톤 없음 | 로딩 시 레이아웃 점프, 체감 성능 저하 |
| P7 | 리스트 가상화 미적용 | artists/concerts가 `ScrollView` + `.map()` | 대량 시드 데이터에서 성능 저하 (국제 시드 확장 중이므로 곧 문제) |
| P8 | 다크모드 감지 이원화 | timeline이 `matchMedia`를 직접 씀 | 테마 토글과 불일치 가능 |
| P9 | 타이포 스케일 미정의 | `text-xl font-bold`, `text-3xl font-bold`, `variant="h1"` 혼용 | 위계가 화면마다 다름 |
| P10 | 웹 접근성/키보드 | 포커스 링은 있으나 키보드 내비게이션 경로 없음, ⌘K 없음 | 데스크톱 사용성 |

### 1.6 데이터 현황 실측 (2026-09-12)

조사 대상: `https://api.kang1027.com/classicmap/api` (`.env`의 `EXPO_PUBLIC_API_URL`. 코드 기본값 `http://34.60.221.92:1028/api`는 이제 폴백일 뿐입니다). 전 엔드포인트 직접 호출로 확인한 실측치입니다.

#### 1.6.1 규모

| 리소스 | 수량 | 비고 |
|---|---|---|
| 작곡가 | **112명** | `limit` 200/500/1000 모두 112 → 전량 |
| 작품 | **11,294곡** (작곡가별 `pieceCount` 합) | 최대 보유: 바흐 1,695 / 슈베르트 1,168 |
| 아티스트 | **185명** | 이 중 `orchestra` 카테고리 47건 |
| 공연 | **500건 이상** | `limit=500`이 꽉 참. 상한 미확인 |
| 음반 | 아티스트당 수십 건 | 조성진 18건 |
| **비교 보유 곡** | **8곡** | 전체 작품의 **0.07%** |
| 비교 섹터 | **15개** | |
| 비교 연주 | **51개** | |

#### 1.6.2 작곡가

```
period 분포: 바로크 9 · 고전주의 12 · 낭만주의 49 · 근현대 42
             (중세 0 · 르네상스 0)
tier 분포  : S 22 · A 36 · B 36 · C 9 · null 9        ← 새로 채워짐
채움률     : avatarUrl 99% · coverImageUrl 99% · bio 99% · style 99% · influence 99%
             birthYear 100% · deathYear 100% · nationality 100%
avatarUrl == coverImageUrl : 110/112 (98%)
연대 범위  : 최초 1567년(몬테베르디) ~ 현대
```

- **중세·르네상스 작곡가가 0명**입니다. 몬테베르디(1567년생)조차 `period`가 `"바로크"`로 들어갑니다.
- `bio` / `style` / `influence`가 모두 **긴 서술형**입니다. 몬테베르디 `bio`는 200자 이상, `style`은 `"제2작법(Seconda pratica), 감정의 격렬한 표현(Stile concitato), …"` 처럼 쉼표 구분 나열입니다 → `composer/[id].tsx`가 `style`을 쉼표로 쪼개 칩으로 렌더하는 현재 로직은 유효하지만, 항목이 6개 이상이라 **칩 wrap 높이**를 고려해야 합니다.
- `composer/{id}` 상세 응답의 **`majorPieces`가 빈 배열**입니다 (몬테베르디·라흐마니노프 모두 `[]`). 작품 목록은 반드시 `/composers/{id}/pieces`를 써야 합니다.

#### 1.6.3 아티스트

```
category: pianist 58 · orchestra 47 · violinist 26 · cellist 13 · conductor 13
          soprano 9 · tenor 5 · clarinetist 2 · flutist 2 · oboist 1
          피아니스트 5 · 피아노 4          ← 한글 값 혼입 (총 9건)
tier    : S 55 · A 96 · B 18 · Rising 16
국적    : South Korea 37 · USA 17 · Germany 15 · UK 11 · Russia 11 · France 10 …
채움률  : imageUrl 97% · coverImageUrl 97% · bio 97% · style 97% · birthYear 100%
          concertCount 97% · albumCount 97%
          topAwardId 0% · awards 0%        ← 목록 응답에 미포함
rating  : 문자열 86건("0.0") · null 99건   ← 타입은 number로 선언되어 있음
```

- **`category`가 영문 slug입니다.** 보고서 7.2의 한글 필터 칩(`피아노 / 바이올린 …`)은 그대로 쓸 수 없습니다. 표시용 한글 라벨 ↔ 값 매핑 테이블이 필요합니다.
- **`orchestra` 47건**은 사람이 아닙니다. 아바타 원형·생년·국적 표시를 그대로 적용하면 어색합니다.
- `피아니스트`(5) / `피아노`(4) 9건은 **`pianist`로 정규화되어야 할 데이터 오염**입니다.
- `rating`이 문자열 또는 null인데 `lib/types/models.ts`는 `rating: number`로 선언합니다. `Number(...)` 변환이 이미 화면 곳곳에 있으나, 타입 차원에서 `string | number | null`로 좁히는 편이 안전합니다.

#### 1.6.4 작품 — **B6 해소**

`/pieces/226` (라흐마니노프 피협 3번) 실제 응답:

```json
{ "id": 226, "composerId": 51,
  "title": "피아노 협주곡 3번 D단조",
  "titleEn": "Piano Concerto No. 3 in D minor",
  "type": "album",
  "description": "피아니스트에게 극한의 기교와 지구력을 요구하는… 영화 <샤인>을 통해…",
  "opusNumber": "Op. 30", "compositionYear": 1909,
  "difficultyLevel": 10, "durationMinutes": 40,
  "spotifyUrl": "https://open.spotify.com/album/4no6O3D7VpSoyf6mzM1FZJ",
  "appleMusicUrl": "https://music.apple.com/us/album/…",
  "youtubeMusicUrl": null }
```

**기능 제안서의 B6(“`difficultyLevel`/`durationMinutes`/`compositionYear` 채움률 확인 필요”)이 해소되었습니다.** 라흐마니노프 152곡을 표본으로 확인한 결과 이 필드들이 전부 채워져 있습니다. 따라서 작품 상세 화면(기능 제안서 2번)을 **축소 없이 원안대로** 만들 수 있습니다.

- `difficultyLevel`은 **1~10 스케일**로 보입니다(관측 최대 10). 별 5개가 아니라 10단계 막대 또는 `10/10` 수치 표기가 정확합니다.
- 곡 단위 `spotifyUrl` / `appleMusicUrl`이 실재합니다 → 곡 상세에서 스트리밍 연결 가능.

**성능 주의**: `/composers/4/pieces`(바흐)는 **1,695개 / 566KB를 한 응답으로 반환**합니다(서버 응답 자체는 0.43초로 빠름). pagination 파라미터가 없습니다. 이는 프로젝트 지침 *"전체 작품과 녹음을 한 번에 요청하지 않습니다"* 와 충돌하며, 현재 `compare.tsx`의 곡 선택 리스트와 `composer/[id].tsx`의 작품 목록이 이 응답을 통째로 렌더합니다.

#### 1.6.5 비교 데이터 — 가장 중요한 실측

비교 영상이 있는 곡 **전체 8개**입니다.

| pieceId | 작곡가 | 곡 | 연주 | 섹터 구성 |
|---|---|---|---|---|
| 129 | 쇼팽 | 발라드 1번 G단조 | **15** | 서주&제1주제(5) / 제2주제(5) / 코다(5) |
| 226 | 라흐마니노프 | 피아노 협주곡 3번 D단조 | **12** | 1악장 카덴챠(3) / 2악장(3) / 3악장-도입부(3) / 3악장-클라이맥스(3) |
| 225 | 라흐마니노프 | 피아노 협주곡 2번 C단조 | **9** | 1악장(3) / 2악장(3) / 3악장(3) |
| 461 | 바흐 | Goldberg-Variationen, BWV 988 | 3 | 제1변주 전곡(3) |
| 463 | 쇼팽 | Études, op. 25 | 3 | 전곡(3) |
| 465 | 쇼팽 | 24 Préludes, op. 28 | 3 | 전곡(3) |
| 462 | 그리그 | Lyriske stykker | 3 | 전곡(3) |
| 464 | 슈만 | Kinderszenen, op. 15 | 3 | 전곡(3) |

```
섹터당 연주 수 분포: 3개 → 12섹터 · 5개 → 3섹터 · (4개인 섹터 없음)
섹터가 1개뿐인 곡  : 8곡 중 5곡 (섹터명이 전부 "전곡" 또는 "제1변주 전곡")
비교 보유 작곡가   : 5명 (쇼팽 3곡 · 라흐마니노프 2곡 · 바흐 · 그리그 · 슈만)
장르 편중          : 8곡 전부 피아노 레퍼토리
```

여기서 세 가지가 도출됩니다.

1. **2×2 그리드는 실제 데이터에 맞지 않습니다.** 3개면 한 칸이 비고 5개면 한 줄이 잘립니다. → **3열 그리드**가 정답 (C1).
2. **섹터 1개인 곡이 절반 이상**이므로 섹터 탭을 항상 그리면 탭 하나짜리 UI가 됩니다 → 섹터 ≥2일 때만 탭 렌더 (C2).
3. **작곡가 112명 / 작품 11,294곡 중 비교 가능한 건 5명 / 8곡**입니다. 비교 화면에서 작곡가·곡을 그냥 나열하면 사용자가 "0개의 연주 비교 가능"만 계속 마주칩니다 → **"비교 가능한 것만" 필터가 필수**입니다 (기능 제안서에 P0로 추가).

**`Performance` 실제 응답** (`/sectors/14/performances`):

```json
{ "id": 32, "sectorId": 14, "pieceId": 226, "artistId": 187,
  "videoPlatform": "youtube", "videoId": "DPJL488cfRw",
  "startTime": 670, "endTime": 771,
  "characteristic": "오리지널 카덴챠",
  "viewCount": 0, "rating": 0.0 }
```

- **`characteristic`에 해석 차이 라벨이 들어옵니다.** 라흐 3번 1악장 카덴챠 섹터는 `"오리지널 카덴챠"` / `"오시아 카덴챠"` / `"오리지널 카덴챠"`로 세 연주가 구분됩니다. 이건 이 제품에서 가장 가치 있는 메타데이터입니다 → 기존 설계의 "특징 인용문"에서 **슬롯 상단 배지로 승격**합니다 (7.4 수정).
- `viewCount` / `rating`은 전 레코드 0입니다 → 기능 제안서 **B4 해소: 현재 미사용 필드**입니다. 투표 기능(제안 13)은 새 개념을 만들어도 충돌하지 않습니다.

**`ComparisonPerformance` 계약은 아직 미구현입니다.**

| 계약 문서상 엔드포인트 | 실제 |
|---|---|
| `GET /pieces/{id}/comparison-sectors` | **404** (구현된 건 `/pieces/{id}/sectors`) |
| `GET /sectors/{id}/comparison-performances` | **404** (구현된 건 `/sectors/{id}/performances`) |
| `GET /artists/{id}/comparison-performances` | **200이지만 항상 `{"items":[],"nextCursor":null}`** |

→ `clipStatus`, `clipUrl`, `credits`, `startMs`/`endMs`를 **아직 아무 데서도 받을 수 없습니다.** 현재 받는 건 `artistId` 단일값과 초 단위 `startTime`/`endTime`뿐이라 지휘자·오케스트라 동시 표기가 불가능합니다.

**설계 영향**: 본 보고서에서 `clipStatus` 기반 게이팅과 credit Inspector를 전제한 부분은 **계약 구현 후 활성화되는 조건부 스펙**으로 읽어야 합니다. 그전까지는 기존 `Performance`(videoId + startTime/endTime) 경로로 동작시키고, UI 자리만 만들어 둡니다. 프로젝트 지침에 따라 **없는 필드를 추측해 채우지 않습니다.**

#### 1.6.6 지금 깨져 있는 것 (리디자인과 별개의 버그)

| # | 증상 | 근거 |
|---|---|---|
| **D1** | **공연 지역 필터가 동작하지 않음** | `concerts.tsx:264`의 `AREA_CODE_MAP` 키는 축약형(`서울`, `부산`)인데 `/concerts/areas`는 풀네임(`서울특별시`, `부산광역시`)을 반환 → `AREA_CODE_MAP[city]`가 항상 `undefined` → 박스오피스 TOP3가 언제나 전국 기준 |
| **D2** | **아티스트 상세의 "이 아티스트의 연주 비교"가 항상 빈 상태** | `/artists/{id}/comparison-performances`가 빈 배열 반환. 임윤찬(187)은 `/artists/187/performances`로는 연주 4개가 나오는데 comparison 경로로는 0개 |
| **D3** | **`PeriodAPI.getAll()`이 항상 실패** | `/periods` **404**. 화면은 로컬 `getAllPeriods()`(`lib/data/mockDTO.ts`)를 쓰고 있어 표면화되지 않은 죽은 코드 |

부가 데이터 품질 이슈:
- `/concerts/areas` 응답에 `"대구광역시, 대구광역시"`, `"대전광역시, 대전광역시"` 중복 문자열과 `"전남광주통합특별시"` 비표준 값이 섞여 있습니다.
- 공연 **목록** 응답은 경량화되어 `artists`, `ticketVendors`, `priceInfo`, `program`, `synopsis`, `ratingCount`, `boxofficeRanking`이 **전부 빠져 있습니다**(상세에서만 제공). 그런데 현재 `ConcertCard`는 `concert.artists`와 `concert.ratingCount`를 렌더합니다 → 목록에서 항상 빈 값입니다. 7.3의 카드/테이블 스펙을 실제 제공 필드로 재정의했습니다.

```
공연 목록 실제 제공 필드:
id · title · posterUrl · startDate · endDate · concertTime
venueId · facilityName · area · genre · status · rating
isFestival · isOpenRun · isVisit
```

---

### 1.7 2차 데이터 실측 (2026-09-16)

1.6절과 동일한 방법으로 다시 전수 조사한 결과입니다. 재현 방법은 부록 C와 같습니다.

#### 1.7.1 규모 변화

| 리소스 | 2026-09-12 | 2026-09-16 | 배수 |
|---|---:|---:|---:|
| 작곡가 | 112 | **358** | 3.2× |
| 아티스트 | 185 | **372** | 2.0× |
| 작품 | 11,294 | **18,642** | 1.65× |
| 비교 보유 곡 | 8 | **8** | 1.0× |
| 비교 섹터 | 15 | **15** | 1.0× |
| 비교 연주 | 51 | **51** | 1.0× |
| **비교 커버리지** | 0.07% | **0.043%** | 오히려 하락 |

제품의 차별점인 비교 데이터가 전혀 늘지 않은 채 분모만 커졌습니다. **"비교 가능한 것부터 보여 준다"는 정렬·필터 원칙이 1차 조사 때보다 더 중요해졌습니다.** 추가 기능 문서의 제안 #19(비교 보유 항목만 보기 필터)는 P0을 유지합니다.

#### 1.7.2 신규 레코드는 대부분 골격만 있음

```
작곡가 358명 — 이미지·bio 보유 31%     (1차 112명 때는 99%)
아티스트 372명 — 이미지 보유 48%        (1차 185명 때는 97%)
작품 18,642곡 — 메타데이터 보유 약 10%
tier 분포 — S 22 · A 36 · B 282 · C 9 · 없음 9
```

- **S·A 58명은 전 필드가 완성**돼 있고, **B 282명이 대부분 골격**입니다. tier는 완성도의 대리 지표로 쓸 수 있습니다.
- `tier`가 **없음**인 9명은 초기 바로크 거장들입니다. 점수 산정에서 빠진 것이지 중요도가 낮은 게 아니므로, **정렬에서 맨 뒤로 보내면 안 됩니다.** 추천순 정렬 키를 `S > A > 없음 > B > C`로 두는 이유가 이것입니다.
- 결과적으로 **폴백 타일이 예외가 아니라 기본 상태**입니다. 이미지가 없을 때의 화면이 곧 목록의 평균 모습이므로, 폴백은 별도 컴포넌트로 승격하고 그라디언트 끝색이 배경에 묻히지 않도록 명도를 올려야 합니다(시안에서 실제로 아랫변이 잘려 보이는 착시가 발생했습니다).
- 이니셜 폴백은 **앞 두 글자가 아니라 성(姓)** 을 씁니다. `안스네스 → "안스"`는 읽히지 않고 `→ "안"`이 읽힙니다.

#### 1.7.3 카테고리 파편화 (C9 근거)

```
category 29종. 같은 악기가 세 갈래로 분리:
  pianist 58 · 피아노 43 · 피아니스트 5
```

칩을 원본 값 그대로 노출하면 같은 악기가 세 번 나옵니다. **표시용 정규화 맵을 프론트에 두되, 정규화 결과를 서버로 되돌려 보내지 않습니다**(필터 질의는 원본 값 집합으로 보냅니다). 정규화 맵은 `lib/design/category.ts`에 둡니다.

#### 1.7.4 정렬 문제 — 첫 화면이 낯선 이름으로 채워짐

`/composers`의 기본 정렬은 `birthYear` 오름차순입니다. 그래서 목록 진입 시 첫 화면이 이렇게 보입니다.

```
곰베르 · 카베손 · 세르통 · 다저 …   (영문 표기, 이미지 없음, 비교 데이터 없음)
```

아티스트 목록은 같은 문제가 없습니다(정렬 기준이 다름). 작곡가 목록만 해당됩니다.

**`추천순` 정렬 정의 (기본값):**

1. `tier` — `S > A > 없음 > B > C`
2. 완성도 — `avatarUrl`·`bio`·`period` 보유 수
3. `pieceCount` 내림차순

`pieceCount` 단독 정렬은 쓰지 않습니다. 실제로 적용해 보면 **2위 Bear McCreary, 4위 Frank Zappa**가 나옵니다. 데이터상 사실이지만 클래식 앱의 진입 화면으로는 성립하지 않습니다.

#### 1.7.5 재확인 — 설계가 그대로 유효한 항목

- 섹터당 연주 수는 여전히 **3개 또는 5개**이고 4개는 없습니다 → C1의 3열 그리드 유지.
- 계약 엔드포인트는 **여전히 404 또는 빈 배열**입니다. `/periods`도 404 그대로입니다 → 시대 팔레트는 계속 프론트 상수로 둡니다.
- 1.6.6의 버그 D1~D3은 **아직 해소되지 않았습니다.**

---

## 2. 리서치: 2026년 프로덕트 디자인 기준선

### 2.1 Raycast / Linear / Vercel 계열 — "정밀함과 밀도"

2026년 시점에서 개발자·프로슈머 도구가 수렴한 미학은 명확합니다.

- **밀도 우선**: 타이트한 간격, 균일한 행 높이, 최소 gap. 정보를 우선하는 레이아웃.
- **보더 온리(flat)**: Linear와 Raycast는 그림자를 거의 쓰지 않고 미묘한 보더로 영역을 구분합니다.
- **다크 기본 + 단일 액센트**: Linear 퍼플, Raycast 레드처럼 **하나의 액센트를 절제해서** 사용합니다. 규율은 다크 모드 자체가 아니라 액센트 하나로 버티는 것에 있습니다.
- **키보드 우선**: Raycast는 "마우스에 손을 뻗지 않도록" 설계됐습니다. 커맨드 팔레트와 리스트 내비게이션에 최적화된 시스템이지, 포인터 기반 대시보드가 아닙니다.

Raycast 디자인 시스템의 실제 수치(참고용):

```
배경 #07080a   Surface100 #101111   Card #1b1c1e   Border hsl(195 5% 15%)
텍스트 #f9f9f9 / #cecece / #9c9c9d / #6a6b6c
브랜드 #FF6363 (hsl 0 100% 69%)  파랑 hsl(202 100% 67%)  초록 hsl(151 59% 59%)
폰트 Inter (feature: calt kern liga ss03) + GeistMono
스페이싱 8px 기반, 실제 스케일 1/2/3/4/8/10/12/16/20/24/32/40
반경 2-3 미세 / 4-5 키캡 / 6 버튼·배지 / 8 인풋 / 12 카드 / 16 대형카드 / 20 히어로
그림자 카드: rgb(27,28,30) 0 0 0 1px + rgb(7,8,10) 0 0 0 1px inset (더블 링)
버튼: rgba(255,255,255,0.1) 0 1px 0 0 inset
```

**우리가 가져올 것**: 밀도 규율, 보더-온리 구획, 단일 액센트, 더블 링 카드 처리, 반경 스케일.
**우리가 바꿀 것**: Raycast의 차가운 청회색(hue 195~202) → 클래식 도메인에 맞는 따뜻한 뉴트럴(hue 30~40).

### 2.2 Astryx (Meta) — 2026년의 "에이전트 대응형" 디자인 시스템

Meta가 2026년 6월 28일 MIT 라이선스로 공개한 React 디자인 시스템입니다. 사용자가 언급한 "메타가 낸 피그마 플러그인"은 이것의 Figma 라이브러리를 가리킵니다.

- Meta 모노레포에서 8년간 13,000개 이상 내부 앱(Facebook, Instagram, Threads 포함)을 지탱해 온 시스템
- **150개 이상 접근성 컴포넌트**, 7~10개 내장 테마, 다크 모드, 프로덕션 템플릿
- **React 19 이상 + StyleX** 기반, 외부 의존성 없음. 코어 패키지 `@astryxdesign/core`
- **CLI + MCP 서버**를 처음부터 포함. `--dense` 플래그로 LLM 컨텍스트에 최적화된 문서 페이로드를 냅니다
- 테마는 색상·타이포·모션·간격·컴포넌트별 조정을 선언적 설정으로 관리. 컴포넌트는 최상위 API에 잠기지 않고 모든 레벨에서 조합 가능하며, `swizzle`로 소스를 프로젝트에 추출할 수 있습니다
- Figma 라이브러리는 Figma MCP에 연결된 "Figma Librarian" 에이전트가 dot 릴리스마다 자동 유지합니다

**컴포넌트 목록(우리에게 직접 참고가 되는 것)**:

```
레이아웃:   App Shell, Layout, Layout Header, Layout Content, Layout Panel, Layout Footer,
            Section, Stack, Stack Item, H Stack, V Stack, Center, Grid, Grid Span,
            Aspect Ratio, Divider, Form Layout
내비게이션: Side Nav (+ Item / Section / Heading / Collapse Button),
            Top Nav (+ Item / Heading / Menu / Mega Menu / Mega Menu Item / Featured Card),
            Mobile Nav, Mobile Nav Toggle, Breadcrumbs, Tab List, Tab, Tab Menu,
            Stepper, Step, Pagination, Outline
데이터:     Table (+ Body/Header/Row/Cell + 훅), List, List Item,
            Metadata List, Metadata List Item, Tree List, Overflow List,
            Card, Selectable Card, Clickable Card
패턴:       Command Palette, Dialog, Popover, Bottom Sheet, Lightbox, Tooltip,
            Chat Layout, Chat Composer, Chat Message, Chat Message Bubble
```

**결론: Astryx를 의존성으로 넣지 않습니다.** 이유는 5.5에 상술합니다. 대신 위 **컴포넌트 분류 체계와 명명을 그대로 차용**해서 NativeWind 기반으로 자체 구현합니다. 특히 `App Shell` / `Side Nav` / `Layout Panel` / `Metadata List` / `Command Palette` 네 가지가 이번 웹 리디자인의 골격이 됩니다.

### 2.3 Aside — 2026년 신생 제품의 UI 감각

2026년 6월 23일 출시된 macOS 15+ 전용 AI 브라우저입니다. 참고할 만한 UX 결정:

- **작업 강도 선택기**(Low / Medium / High / Ultrabrowse) — 시스템의 자율성 수준을 사용자가 명시적으로 고릅니다. "숨기지 않고 선택지로 노출"하는 방식.
- **편집 가능한 로컬 마크다운 메모리** — 시스템 내부 상태를 사용자가 직접 읽고 고칠 수 있는 형태로 노출.
- **승인 게이트** — 민감한 동작 전에 짧은 선택지와 함께 사람의 승인을 받습니다.

**우리가 가져올 것**: 시스템의 상태와 한계를 숨기지 않고 노출하는 태도. ClassicMap에서는 `clipStatus`, 데이터 출처(YouTube / Invidious 클립 / KOPIS / Apple Music), 영상 구간의 원본 타임코드 대비 클립 타임코드 차이 같은 것들이 여기 해당합니다. 프로젝트 지침 "플랫폼 출처와 영상 출처를 숨기지 않습니다"와 정확히 같은 방향입니다.

### 2.4 2026년 UI 트렌드 중 채택/기각

| 트렌드 | 판단 | 근거 |
|---|---|---|
| Calm UI (인지 부하 감소) | **채택** | 클래식 입문자가 타깃. 현재 홈의 3초 인사말 애니메이션·손 흔들기는 정확히 반대 방향 |
| 설명하는 모션 (performative → explanatory) | **채택** | 비교 화면의 섹터 전환, 타임라인 줌에 적용 |
| 토큰 기반 확장형 디자인 시스템 | **채택** | 이번 작업의 핵심 |
| 접근성 우선 | **채택** | 이미 `design-qa.md`에서 대비 사고를 겪음 |
| 공간감/깊이 (glassmorphism 부활, z축) | **부분 채택** | 앱 크롬(탭바·헤더)에 한정. 콘텐츠 영역에는 사용하지 않음 |
| Bento grid | **부분 채택** | 웹 홈 대시보드에만 |
| AI-native 인터페이스 / 대화형 UI | **보류** | 별도 문서의 기능 제안으로 분리 |
| 온보딩 캐러셀 | **기각** | 2026년 기준 사장. 현재 `OnboardingModal` 재설계 대상 |

### 2.5 Apple Liquid Glass (iOS 26) — 네이티브 앱 관련 제약

- 2025년 6월 발표, iOS 26/macOS 26의 기본 디자인 언어. 반투명 재질이 빛과 색을 통과시켜 콘텐츠에 초점을 맞춥니다. 탭바·내비게이션 버튼·툴바에 적용됩니다.
- **일정**: 2026년 6월 2일부터 업데이트되는 앱 컨테이너는 기본적으로 Liquid Glass가 켜지고, 2026년 8월 말까지 기존 컨테이너가 전부 전환되며, **2026년 9월까지 모든 iOS 앱이 완전 지원해야 합니다.**
- 다만 채택률은 역대 최저인 45% 수준이며 가독성·사용성 트레이드오프 비판이 있습니다.

**우리 상황**: Expo/React Native는 SwiftUI/UIKit의 Liquid Glass API를 직접 쓰지 않습니다. `expo-blur` 같은 모듈로 유사 표현만 가능합니다. 따라서:
- iOS 네이티브 크롬(탭바·헤더)은 **반투명 + 블러 + 콘텐츠 스크롤 언더** 형태로 근사합니다.
- 콘텐츠 영역은 불투명하게 유지합니다 (가독성 우선).
- **9월 마감은 "앱이 크래시 없이 동작하고 크롬이 어색하지 않을 것" 수준의 대응**을 의미하며, 이 리디자인의 크롬 재설계로 충족합니다. 리스크는 10.2에 기재합니다.

### 2.6 반응형 기준선 (2026)

- 2026년 반응형은 네 가지 도구의 조합: **미디어 쿼리(페이지 구조)**, **컨테이너 쿼리(컴포넌트)**, **`clamp()`(유동 타입·간격)**, **내재적 CSS Grid(브레이크포인트 불필요 레이아웃)**
- 널리 쓰이는 브레이크포인트: 480 / 768 / 1024 / 1280 / 1536
- **1280px이 3~4열 레이아웃과 사이드바를 도입하는 지점**입니다
- 사이드바를 본문 아래로 내리는 것 같은 **페이지 레벨 구조 변경은 미디어 쿼리**가 맞는 도구입니다

**RN/Expo 제약**: 컨테이너 쿼리와 `clamp()`는 react-native-web에서 신뢰할 수 없습니다. 따라서 우리는 **`useWindowDimensions` 기반 브레이크포인트 훅 + NativeWind의 `web:`/`md:`/`lg:` variant** 조합으로 갑니다 (6.2 참고).

---

## 3. ClassicMap 디자인 방향

### 3.1 제품 정체성 재정의

ClassicMap은 "클래식 음악 입문자를 위한 로드맵"이며, 다른 클래식 앱과 구분되는 유일한 기능은 **같은 곡의 같은 구간을 연주자별로 나란히 비교**하는 것입니다. IDAGIO나 Apple Music Classical은 스트리밍 카탈로그이지 비교 도구가 아닙니다.

따라서 디자인의 중심 은유는 **"청취 비교 워크벤치"**입니다. 감상용 미디어 앱이 아니라, 대상을 나란히 놓고 차이를 읽어내는 도구입니다. 이것이 Raycast/Linear 계열의 밀도 높은 도구 미학을 채택하는 근거이기도 합니다.

### 3.2 디자인 원칙 5개

1. **비교가 항상 한 화면 안에 있다.** 두 연주를 보려고 스크롤하거나 페이지를 넘기면 안 됩니다. (현재 비교 화면은 가로 페이징이라 한 번에 하나만 보입니다 — 7.4에서 해결)
2. **크롬은 조용하고 콘텐츠는 선명하다.** 액센트 색은 "지금 선택된 것"과 "다음에 할 일"에만 씁니다. 장식으로 쓰지 않습니다.
3. **출처를 숨기지 않는다.** 영상 플랫폼, 클립 상태, 데이터 소스(KOPIS/Apple Music/Spotify)를 표면에 둡니다.
4. **밀도는 플랫폼에 따라 다르다.** 모바일은 터치 타깃 44pt를 지키고, 데스크톱은 행 높이를 32~40px로 줄여 정보량을 2배로 만듭니다.
5. **모션은 설명한다.** 상태 변화(섹터 전환, 필터 적용, 로딩→완료)에만 모션을 쓰고, 인사말이나 손 흔들기 같은 장식 모션은 제거합니다.

### 3.3 무드

- **다크 기본**: 영상 재생이 중심 경험이므로 어두운 배경이 콘텐츠를 살립니다. 라이트 모드는 동등하게 지원하되 다크에서 먼저 설계합니다.
- **따뜻한 뉴트럴**: 순수 회색(hue 0) 대신 hue 30~40의 저채도 뉴트럴. 콘서트홀 조명, 악보 종이, 황동 악기의 색조를 암시합니다. Raycast의 청회색과 명확히 구분됩니다.
- **Brass Gold 단일 액센트**: 브랜드 색은 황동 골드 하나입니다. 시대 색 6종과 채도·명도가 충분히 구분되고, 클래식 도메인의 관습(금박 프로그램북, 관악기)과 맞습니다.
- **활자 중심**: 이미지가 부족한 데이터(작곡가 초상, 공연 포스터 품질 편차)를 감안해 타이포그래피가 화면을 지탱하도록 설계합니다.

---

## 4. 디자인 시스템 스펙

### 4.1 색상 토큰

기존 구조(HSL 채널 값 + `hsl(var(--x))`)를 그대로 유지합니다. 마이그레이션 비용이 0에 가깝고 NativeWind 4와 호환됩니다.

#### 4.1.1 다크 (기본)

```css
.dark:root {
  /* 표면 — 3단계 레벨 */
  --background:        30 8% 4%;     /* #0B0A09  앱 바탕 */
  --surface-1:         30 7% 7%;     /* #131211  카드/패널 */
  --surface-2:         30 7% 10%;    /* #1B1917  팝오버/모달/호버 */
  --surface-3:         30 6% 14%;    /* #262321  선택된 행, 인풋 채움 */

  /* shadcn 호환 별칭 (기존 클래스가 계속 동작하도록 유지) */
  --card:              30 7% 7%;
  --card-foreground:   40 12% 96%;
  --popover:           30 7% 10%;
  --popover-foreground:40 12% 96%;

  /* 전경 — 4단계 위계 */
  --foreground:        40 12% 96%;   /* #F7F4F0  본문/제목 */
  --foreground-muted:  35 7% 64%;    /* #A9A29A  보조 설명 */
  --foreground-subtle: 33 6% 46%;    /* #7B756E  메타/캡션 */
  --foreground-faint:  32 5% 32%;    /* #56514C  비활성 */
  --muted:             30 7% 12%;
  --muted-foreground:  35 7% 64%;

  /* 보더 — 2단계 */
  --border:            32 6% 16%;    /* #2B2724  기본 구획 */
  --border-strong:     32 6% 26%;    /* #47413B  강조/포커스 대기 */
  --input:             32 6% 20%;

  /* 브랜드 액센트 — Brass Gold */
  --primary:           38 62% 60%;   /* #DDAA55 */
  --primary-foreground:30 25% 8%;    /* #1A140D  골드 위 텍스트 */
  --primary-muted:     38 55% 22%;   /* #5C441D  골드 배경 채움 */
  --ring:              38 62% 60%;

  /* 보조 (중립 액션) */
  --secondary:         30 7% 12%;
  --secondary-foreground: 40 12% 96%;
  --accent:            30 7% 14%;    /* 호버 배경 */
  --accent-foreground: 40 12% 96%;

  /* 상태 */
  --success:           152 48% 48%;  /* #3FBE83 */
  --success-foreground:152 60% 10%;
  --warning:            38 92% 56%;  /* #F5A524 */
  --warning-foreground: 38 80% 10%;
  --destructive:         4 72% 58%;  /* #E2564B */
  --destructive-foreground: 0 0% 100%;
  --info:              205 72% 58%;  /* #4CA3E0 */
  --info-foreground:   205 70% 10%;

  --radius: 0.625rem;
}
```

#### 4.1.2 라이트

```css
:root {
  --background:        40 24% 98%;   /* #FBFAF7  아이보리 */
  --surface-1:          0  0% 100%;  /* #FFFFFF */
  --surface-2:         40 20% 96%;   /* #F6F4EF */
  --surface-3:         38 18% 92%;   /* #EDE9E1 */

  --card:               0  0% 100%;
  --card-foreground:   30 10% 10%;
  --popover:            0  0% 100%;
  --popover-foreground:30 10% 10%;

  --foreground:        30 10% 10%;   /* #1C1917 */
  --foreground-muted:  33 7% 40%;    /* #6B635B */
  --foreground-subtle: 33 6% 52%;    /* #8B8279 */
  --foreground-faint:  33 5% 68%;    /* #B4ADA6 */
  --muted:             40 20% 96%;
  --muted-foreground:  33 7% 40%;

  --border:            36 14% 88%;   /* #E5E0D8 */
  --border-strong:     36 12% 76%;   /* #C7C0B5 */
  --input:             36 14% 84%;

  --primary:           36 62% 40%;   /* #A67426  라이트에선 어둡게 */
  --primary-foreground: 40 30% 98%;
  --primary-muted:     38 62% 92%;   /* #F5E7CE */
  --ring:              36 62% 40%;

  --secondary:         40 20% 95%;
  --secondary-foreground: 30 10% 10%;
  --accent:            38 20% 93%;
  --accent-foreground: 30 10% 10%;

  --success:           152 52% 34%;
  --warning:            34 88% 42%;
  --destructive:         4 68% 48%;
  --info:              205 70% 42%;
  /* *-foreground는 전부 40 30% 98% */

  --radius: 0.625rem;
}
```

#### 4.1.3 시대 팔레트 (데이터 카테고리 — UI 크롬 금지)

기존 값을 유지하되 다크/라이트 각각의 대비 안전값을 함께 정의합니다. 사용처는 **타임라인 밴드, 작곡가 아바타 링, 시대 필터 칩의 좌측 도트**로 한정합니다.

> **2026-09-12 개정 (C3)**: 실제 데이터에는 **바로크·고전주의·낭만주의·근현대 4종만** 존재합니다(1.6.2). 중세·르네상스는 작곡가 0명입니다. 팔레트 정의는 6종 모두 유지하되(데이터가 추가될 수 있으므로), **UI에서는 실제 작곡가가 있는 시대만 렌더**합니다. 구현 규칙:
> - 시대 필터 칩·홈 "시대별 둘러보기" 타일: `composers`에서 실제 등장한 `period` 집합으로 생성. 하드코딩 금지
> - 타임라인 밴드: 6종 밴드를 그리되 작곡가 0명인 구간은 `foreground-faint` 해치 패턴 + "아직 등록된 작곡가가 없어요" 라벨 (빈 구간을 숨기면 연대 축이 왜곡됩니다)
> - 홈 타일 개수가 6 → 4로 줄므로 데스크톱 Bento의 "시대별 둘러보기" 칼럼 높이를 4개 기준으로 잡습니다

| 시대 | base (기존) | dark-on (다크 배경 위 텍스트/아이콘) | dark-bg (다크 배경 채움 12%) | light-on | light-bg |
|---|---|---|---|---|---|
| 중세 | `#b45309` | `#E0954A` | `#b45309` @ 14% | `#8A3F07` | `#b45309` @ 10% |
| 르네상스 | `#0f766e` | `#3FB5AA` | `#0f766e` @ 16% | `#0B5A54` | `#0f766e` @ 10% |
| 바로크 | `#9333ea` | `#B77BF0` | `#9333ea` @ 16% | `#7726BE` | `#9333ea` @ 10% |
| 고전주의 | `#3b82f6` | `#7BAAF9` | `#3b82f6` @ 16% | `#2A64C7` | `#3b82f6` @ 10% |
| 낭만주의 | `#ec4899` | `#F281BC` | `#ec4899` @ 16% | `#C22B75` | `#ec4899` @ 10% |
| 근현대 | `#22c55e` | `#5FD98D` | `#22c55e` @ 16% | `#177F3C` | `#22c55e` @ 10% |

구현 위치: `lib/design/era-palette.ts` 신설. `lib/data/periods.ts`의 `ERA_COLORS`는 이 파일을 재수출하도록 변경합니다(기존 import 경로 보존).

#### 4.1.4 랭킹 팔레트 (박스오피스 전용)

현재 `concerts.tsx`에 하드코딩된 금·은·동을 토큰화합니다.

```ts
// lib/design/rank-palette.ts
export const RANK_PALETTE = {
  1: { base: '#D4AF37', onDark: '#E8C766', onLight: '#8A6E12' },
  2: { base: '#B8B8BD', onDark: '#D2D2D6', onLight: '#6B6B70' },
  3: { base: '#C08442', onDark: '#D6A067', onLight: '#7A5426' },
  default: { base: 'hsl(var(--foreground-subtle))', onDark: '', onLight: '' },
} as const;
```

### 4.2 타이포그래피

#### 4.2.1 서체

| 용도 | 웹 | iOS | Android |
|---|---|---|---|
| 본문/UI (한글) | Pretendard Variable | Pretendard Variable | Pretendard Variable |
| 본문/UI (라틴·숫자) | Inter Variable | Inter Variable | Inter Variable |
| 숫자·타임코드·Opus 번호 | JetBrains Mono / Geist Mono | 동일 | 동일 |

- 로딩: `expo-font`로 Pretendard Variable, Inter Variable, 모노 1종을 번들. 웹은 `+html.tsx`에 `<link rel="preload">` 추가.
- 폰트 feature: 웹에서 `font-feature-settings: 'calt', 'kern', 'liga', 'tnum'`. 특히 **`tnum`(고정폭 숫자)** 은 타임코드·연도·평점 정렬에 필수입니다.
- 폴백: `system-ui, -apple-system, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif`

> 서체 도입은 번들 크기(각 Variable 폰트 약 100~300KB)와 웹 초기 로딩에 영향을 줍니다. 최소한 **본문 1종(Pretendard) + 모노 1종**만 도입하고 Inter는 웹 전용 서브셋으로 제한하는 것을 권장합니다.

#### 4.2.2 스케일

Tailwind 확장으로 정의합니다. 이름은 의미 기반으로 짓고, `text-xl font-bold` 같은 조합 사용을 금지합니다.

| 토큰 | size / line-height / weight / tracking | 용도 |
|---|---|---|
| `text-display` | 38 / 1.1 / 700 / -0.02em | 웹 히어로, 상세 화면 대제목 |
| `text-title-1` | 30 / 1.15 / 700 / -0.02em | 화면 제목 |
| `text-title-2` | 24 / 1.2 / 650 / -0.015em | 상세 섹션 대제목 |
| `text-title-3` | 20 / 1.25 / 600 / -0.01em | 섹션 제목 |
| `text-headline` | 16 / 1.35 / 600 / -0.005em | 카드 제목, 리스트 항목 제목 |
| `text-body` | 15 / 1.55 / 400 / 0 | 본문 (모바일 16, 데스크톱 15) |
| `text-body-sm` | 14 / 1.5 / 400 / 0 | 조밀한 본문 |
| `text-label` | 13 / 1.35 / 500 / 0 | 폼 라벨, 칩, 버튼 |
| `text-caption` | 12 / 1.35 / 500 / 0.01em | 메타데이터, 배지 |
| `text-micro` | 11 / 1.3 / 600 / 0.02em | 카운트, 오버라인 (대문자 처리 가능) |
| `text-mono-sm` | 12 / 1.4 / 500 / 0 (mono, tnum) | 타임코드, Opus 번호 |

**플랫폼 조정**: 네이티브에서는 `text-body`를 16으로 올립니다 (`Platform.select`로 `tailwind.config.js`가 아니라 `text.tsx` variant에서 처리).

### 4.3 스페이싱 & 밀도

4px 기반. 두 개의 밀도 모드를 정의합니다.

| 토큰 | comfortable (모바일 기본) | compact (데스크톱 기본) |
|---|---|---|
| 화면 좌우 패딩 | 16 | 24 (셸 내부), 32 (≥1536) |
| 섹션 간격 | 24 | 20 |
| 카드 내부 패딩 | 16 | 12 |
| 리스트 행 높이 | 64 (아바타 있음) / 48 | 44 (아바타 있음) / 36 |
| 리스트 행 간격 | 8 | 0 (구분선으로 대체) |
| 칩 높이 | 32 | 26 |
| 버튼 높이 (default) | 40 | 32 |
| 인풋 높이 | 40 | 32 |
| 아이콘 기본 | 20 | 16 |

구현: `lib/design/density.ts`에 `useDensity()` 훅을 두고 브레이크포인트에서 자동 결정 + 사용자 설정으로 오버라이드 가능하게 합니다.

```ts
export type Density = 'comfortable' | 'compact';
// width >= 1024 && Platform.OS === 'web' → 'compact', 그 외 'comfortable'
```

### 4.4 반경

| 토큰 | 값 | 용도 |
|---|---|---|
| `rounded-xs` | 4 | 배지, 마이크로 태그 |
| `rounded-sm` | 6 | 버튼, 칩, 인풋 (compact) |
| `rounded-md` | 8 | 인풋, 버튼 (comfortable) |
| `rounded-lg` | 10 | 카드 (= 현재 `--radius`) |
| `rounded-xl` | 14 | 패널, 모달, 대형 카드 |
| `rounded-2xl` | 20 | 히어로, 바텀시트 상단 |
| `rounded-full` | 9999 | 아바타, 필 칩 |

### 4.5 보더 · 표면 · 그림자

**다크**: 그림자를 쓰지 않습니다. 대신 Raycast식 **더블 링**으로 카드를 띄웁니다.

```
카드(다크):  border 1px hsl(var(--border))
             + inset 0 1px 0 0 rgba(255,255,255,0.04)   ← 상단 하이라이트
팝오버(다크): background surface-2
             + border 1px hsl(var(--border-strong))
             + shadow 0 16px 48px -12px rgba(0,0,0,0.7)  ← 오버레이만 그림자 허용
```

**라이트**: 아주 옅은 그림자 1단계만 허용합니다.

```
카드(라이트): border 1px hsl(var(--border)) + shadow 0 1px 2px rgba(28,25,23,0.04)
팝오버(라이트): shadow 0 12px 32px -8px rgba(28,25,23,0.14)
```

**금지**: 콘텐츠 카드에 2px 이상 보더, 컬러 보더(랭킹 카드 제외), elevation 5 이상.

### 4.6 모션

| 토큰 | duration | easing | 용도 |
|---|---|---|---|
| `motion-instant` | 90ms | `cubic-bezier(0.2, 0, 0, 1)` | 호버, 포커스, 색 변화 |
| `motion-fast` | 140ms | `cubic-bezier(0.2, 0, 0, 1)` | 칩 선택, 토글, 툴팁 |
| `motion-base` | 200ms | `cubic-bezier(0.2, 0, 0, 1)` | 패널 열림, 탭 전환 |
| `motion-slow` | 320ms | `cubic-bezier(0.16, 1, 0.3, 1)` | 모달, 바텀시트, 라우트 전환 |

- 네이티브는 Reanimated `withTiming` / `withSpring(damping 22, stiffness 220)`.
- `prefers-reduced-motion` 존중: 웹에서 duration을 0으로, 네이티브는 `AccessibilityInfo.isReduceMotionEnabled()`.
- **삭제 대상 모션**: 홈 인사말 페이드+손 흔들기 루프, 타임라인 2초 아바타 로테이션(→ 사용자 조작 기반으로 변경).

### 4.7 아이콘

#### 4.7.1 두 계층으로 나눕니다

| 계층 | 출처 | 범위 |
|---|---|---|
| 범용 | `lucide-react-native` (유지) | 홈·검색·닫기·화살표·달력 등 뜻이 이미 굳어진 기호 |
| 고유 | `components/ui/icons/` (신규) | ClassicMap에만 있는 개념 — lucide에 대응물이 없습니다 |

lucide를 걷어내지 않습니다. 고유 아이콘은 **대응물이 없는 개념에만** 만들고, 같은 뜻을 두 벌로 유지하지 않습니다.

#### 4.7.2 공통 규격

- 캔버스 **24×24**, stroke **1.75**, `linecap`/`linejoin` 모두 `round`, 기본 `fill:none`.
- 렌더 크기는 **12 / 14 / 16 / 20 / 24**만 사용합니다.
- 색은 `currentColor`로 흐릅니다. NativeWind `className`(`text-foreground` 등)이 그대로 동작합니다.
- 클릭 대상은 글리프 크기와 별개로 **최소 36px**을 확보합니다(플레이어 바 기준: 글리프 18 / 대상 36 / 주버튼 44).
- 아이콘 단독 버튼은 `accessibilityLabel` 필수입니다.
- **16px에서 뭉개지면 요소를 덜어냅니다.** 단, 덜어낸 결과가 다른 아이콘과 헷갈리면 덜어내지 않습니다(4.7.4의 연주자 사례).

#### 4.7.3 고유 아이콘 목록

`components/ui/icons/index.ts`에서 내보냅니다. 기하는 시안(`classicmap-mockup.html`)과 동일한 값입니다.

| 컴포넌트 | 뜻 | 형태와 이유 |
|---|---|---|
| `CompareIcon` | 비교 | 두 줄의 타임라인 위에 어긋난 위치의 원 두 개. 제품의 축을 그대로 그린 기호입니다 |
| `EraIcon` | 시대 | 연대축 하나에 길이가 다른 눈금 세 개. 눈금 높이가 작품 밀도를 뜻합니다 |
| `RepertoireIcon` | 레퍼토리 | 책갈피 + 목록선 두 줄. 담긴 상태는 목록선을 지우고 면으로 채웁니다(`filled`). 하트·별을 쓰지 않는 이유는 **보관이지 평가가 아니기** 때문입니다 |
| `SectionNoteIcon` | 구간 길이 | 8분·4분·2분·온음표. 4.7.5 참고 |
| `SwitchTakeIcon` | 연주 전환 | 업보우(⊓) + 다운보우(∨). A/B 토글 사이에 놓입니다. 두 기호 끝 높이가 다른 것은 실제 악보 기호 그대로입니다 |
| `TicketIcon` | 예매 | 가운데 절취선이 있는 티켓. 외부 예매처로 나가는 동작이라 재생 계열과 형태를 겹치지 않게 했습니다 |
| `ComposerKindIcon` | 작곡가 | 오선 위 펜촉 |
| `PerformerKindIcon` | 연주자 | 음표에서 퍼지는 음파 |
| `PrevSectionIcon` / `NextSectionIcon` | 이전·다음 **구간** | 굵은 세로선(구간 경계) + 삼각형(방향) |

#### 4.7.4 두 가지 고정 규칙

**(1) 이전/다음은 곡이 아니라 구간입니다.** 민 삼각형만 쓰면 빨리감기와 구분되지 않습니다. 맨 앞의 세로선을 **stroke 2.6**으로, 삼각형을 **1.75**로 두어 "경계까지 되감기"를 형태로 말합니다.

**(2) 연주자 아이콘의 음파 호는 반드시 두 줄입니다.** 반경 4.2와 8.4 두 개를 유지합니다. 한 줄로 줄이면 12px에서 **8분음표 꼬리로 읽혀** 작곡가(펜)와의 짝 구분이 무너집니다. 시안 검증에서 실제로 발생했던 문제입니다.

#### 4.7.5 구간 배지 = 음표 값

구간 라벨에 A·B·C·D를 쓰지 않습니다. 곡마다 구간 구성이 달라 **항목별로만 의미가 있는 임의 라벨**이기 때문입니다. 대신 구간 길이를 음표 값으로 보여 줍니다.

| 음표 | 길이 | 형태 |
|---|---|---|
| 8분음표 | 3분 미만 | 채운 머리 + 기둥 + 꼬리 |
| 4분음표 | 3~6분 | 채운 머리 + 기둥 |
| 2분음표 | 6~10분 | 빈 머리 + 기둥 |
| 온음표 | 10분 이상 | 빈 머리만 (기둥이 없어 가늘어 보이므로 stroke를 2.3으로 올림) |

**작은 크기에서 네 값이 갈리게 하는 두 가지.** 기본 기하로 그리면 16px에서 8분↔4분이 12px(5%), 4분↔2분이 **1px** 차이라 사실상 구분되지 않습니다. 실측으로 확인한 뒤 다음을 적용했습니다.

- **깃발은 기둥보다 굵게(2.2) 그리고 길게.** 8분과 4분의 차이는 깃발 하나뿐입니다. 실제 악보 조판도 깃발이 기둥보다 무겁습니다.
- **빈 머리는 키우고(rx 5.5 / ry 3.9) 선을 얇게(1.5).** 그대로 두면 구멍이 메워져 채운 머리와 같아집니다.

적용 후 실측(16px 기준): 8분↔4분 10px(잉크의 22~29%), 4분↔2분 35px(100%), 나머지 네 쌍은 전부 잉크량을 넘는 차이. 2분음표 구멍은 16px에서도 20px가 막히지 않습니다.

- 배지는 **20×20**, 기본 `opacity .62`, 선택 시 `1`.
- **길이는 백엔드 필드가 아닙니다.** `PerformanceSector`에는 길이 필드가 없으므로 해당 구간 연주들의 `endMs - startMs` **중앙값**에서 파생합니다(`sectionNoteValueFromClips`). 구간마다 연주 길이가 조금씩 달라 평균 대신 중앙값을 씁니다.
- 파생값이므로 서버로 되돌려 보내지 않습니다.

### 4.8 상태 표현 규격

| 상태 | 규격 |
|---|---|
| 로딩 | **스켈레톤 우선**. 리스트는 행 스켈레톤 5개, 카드 그리드는 카드 스켈레톤. `ActivityIndicator`는 버튼 내부 인라인·pull-to-refresh에만 |
| 빈 상태 | 아이콘(32, `foreground-faint`) + 제목(`text-headline`) + 설명(`text-body-sm`, `foreground-muted`) + **행동 버튼 1개**. 프로젝트 지침대로 "다음에 할 수 있는 행동" 포함 |
| 오류 | 빈 상태와 동일 골격 + `destructive` 아이콘 + "다시 시도" 버튼. 메시지는 해요체 |
| 부분 실패 | 섹션 단위로 인라인 표시. 화면 전체를 오류로 덮지 않음 |
| 준비 중(clipStatus ≠ ready) | 재생 UI를 렌더하지 않고 "준비 중" 배지 + 원본 링크 |

---

## 5. 플랫폼 분기 전략

### 5.1 원칙

**공유하는 것**: 데이터 훅(`lib/query/hooks/*`), API 클라이언트, 타입, 디자인 토큰, 프리미티브 컴포넌트(Button/Text/Card/Input/Chip/Badge), 도메인 컴포넌트의 표현 로직.

**분기하는 것**: 셸(내비게이션 구조), 페이지 레이아웃(1열 vs 다열), 밀도, 입력 방식(터치 vs 키보드/포인터).

### 5.2 파일 분기 방법

expo-router는 플랫폼별 확장자를 지원합니다. 아래 두 방식을 병행합니다.

1. **레이아웃 파일 분기** — 구조가 근본적으로 다른 경우
   ```
   app/(tabs)/_layout.tsx        ← 네이티브 + 좁은 웹 (탭)
   app/(tabs)/_layout.web.tsx    ← 웹 (셸 분기: 넓으면 Side Nav, 좁으면 탭)
   ```
2. **컴포넌트 내부 분기** — 같은 페이지의 열 구성만 다른 경우
   ```tsx
   const { layout } = useBreakpoint();  // 'mobile' | 'tablet' | 'desktop' | 'wide'
   if (layout === 'desktop' || layout === 'wide') return <ArtistsDesktop … />;
   return <ArtistsMobile … />;
   ```

**중요**: 페이지 컴포넌트를 통째로 두 벌 만들지 않습니다. 데이터 로직은 페이지 파일에 남기고, `*.mobile.tsx` / `*.desktop.tsx` **뷰 컴포넌트만** 분리합니다. 그렇지 않으면 `compare.tsx`의 1438줄이 2876줄이 됩니다.

### 5.3 웹 셸 진입점

`app/_layout.tsx`는 그대로 두고, `(tabs)/_layout.web.tsx`에서 분기합니다.

```tsx
// app/(tabs)/_layout.web.tsx (개념)
export default function TabsLayoutWeb() {
  const { layout } = useBreakpoint();
  if (layout === 'mobile') return <MobileTabsLayout />;   // 기존과 동일
  return (
    <AppShell>
      <AppShell.Nav><SideNav /></AppShell.Nav>
      <AppShell.Header><TopBar /></AppShell.Header>       {/* 검색 트리거 + 유저 + 테마 */}
      <AppShell.Content><Slot /></AppShell.Content>
    </AppShell>
  );
}
```

`Slot`을 쓰면 expo-router의 탭 라우팅을 유지하면서 크롬만 교체할 수 있습니다. 탭바 대신 Side Nav가 라우팅을 담당합니다.

### 5.4 네이티브 크롬 (iOS 26 대응)

- 탭바: `tabBarStyle`에 `position: 'absolute'` + `expo-blur`의 `BlurView` 배경 (`intensity 80`, `tint` = colorScheme). 콘텐츠는 하단 패딩 `tabBarHeight + insets.bottom`.
- 헤더: `headerTransparent: true` + BlurView. 현재는 `headerStyle.backgroundColor`가 `#000`/`#fff`로 하드코딩되어 있는데 이것도 토큰으로 교체합니다.
- Android: 블러 대신 `surface-1` 불투명 + `elevation 0` + 상단 hairline 보더.
- `expo-blur` 추가 필요 (현재 미설치).

### 5.5 Astryx를 도입하지 않는 이유

기술적으로 **혼용은 가능하지만 비용이 이익을 넘습니다.**

| 항목 | 문제 |
|---|---|
| 렌더러 | Astryx는 React DOM 전용. 우리 웹은 react-native-web을 통해 `View`→`div`로 렌더됩니다. Astryx 컴포넌트를 쓰려면 그 서브트리만 순수 DOM으로 다뤄야 합니다 (현재 `<video>` 태그처럼) |
| 스타일 | StyleX는 빌드타임 아토믹 CSS를 생성합니다. Metro 번들러 + NativeWind(Tailwind) 파이프라인에 StyleX 컴파일러를 추가해야 하고, 두 스타일 시스템의 캐스케이드 충돌을 관리해야 합니다 |
| 토큰 | Astryx 테마와 NativeWind CSS 변수를 동기화하는 브리지를 직접 만들어야 합니다 |
| 코드 공유 | Astryx로 만든 웹 화면은 네이티브에서 재사용 불가. 우리가 노리는 "로직 공유, 뷰만 분기" 전략과 어긋납니다 |
| 번들 | 웹 번들에 두 번째 UI 라이브러리가 통째로 들어갑니다 |

**대신 이렇게 씁니다**: Astryx의 **컴포넌트 분류·명명·조합 규칙을 설계 규격으로 차용**합니다. `AppShell`, `SideNav`, `LayoutPanel`, `MetadataList`, `CommandPalette`, `SelectableCard`, `OverflowList` 같은 이름을 그대로 쓰면 향후 팀이 커지거나 Figma 라이브러리를 붙일 때 매핑이 자연스럽습니다. Figma 쪽은 커뮤니티의 Astryx Figma 라이브러리를 참고 자료로 열어두되, 우리 토큰(4.1)으로 테마를 갈아끼운 로컬 라이브러리를 만드는 것을 권장합니다.

---

## 6. 웹 데스크톱 레이아웃 설계

### 6.1 셸 구조

```
┌──────────────────────────────────────────────────────────────────────────┐
│ SideNav 240px │ TopBar 48px                                              │
│  (접힘 56px)  ├──────────────────────────────────────────────────────────┤
│               │                                          │                │
│  ● 홈         │           Content                        │  Inspector     │
│  ● 아티스트   │           (max-w 1280, 중앙 정렬)         │  320px         │
│  ● 공연       │                                          │  (선택적)      │
│  ● 비교       │                                          │                │
│  ● 타임라인   │                                          │                │
│  ─────        │                                          │                │
│  내 서재      │                                          │                │
│  ─────        │                                          │                │
│  (관리)       │                                          │                │
│               │                                          │                │
│  ⌘K 힌트      │                                          │                │
│  유저/테마    │                                          │                │
└──────────────────────────────────────────────────────────────────────────┘
```

- **SideNav**: 폭 240px 고정, `surface-1` 배경, 우측 1px 보더. 항목 높이 32px, 아이콘 16 + 라벨 13px. 활성 항목은 `primary-muted` 배경 + `primary` 텍스트 + 좌측 2px 인디케이터. 하단에 `⌘K` 힌트, 테마 토글, 유저 메뉴.
- **TopBar**: 높이 48px. 좌측에 브레드크럼(현재 라우트), 중앙에 검색 트리거(클릭 시 커맨드 팔레트 오픈, 폭 360px, `⌘K` 키캡 표시), 우측에 페이지 액션(관리자 추가 버튼 등).
- **Content**: `max-w-[1280px] mx-auto px-6`. 단, 타임라인과 비교 화면은 전폭(`max-w-none`) 사용.
- **Inspector**: ≥1536px에서만 등장하는 선택적 우측 패널. 리스트에서 항목을 선택하면 상세를 여기에 띄웁니다(라우트 이동 없이). 비교 화면에서는 연주 크레딧/메타데이터 패널로 씁니다.

### 6.2 브레이크포인트

```ts
// lib/design/breakpoints.ts
export const BP = { sm: 480, md: 768, lg: 1024, xl: 1280, '2xl': 1536 } as const;

export type LayoutKind = 'mobile' | 'tablet' | 'desktop' | 'wide';

export function useBreakpoint() {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const layout: LayoutKind =
    !isWeb || width < BP.lg ? (width < BP.md ? 'mobile' : 'tablet')
    : width < BP['2xl'] ? 'desktop'
    : 'wide';
  return { width, layout, isWeb, density: layout === 'mobile' || layout === 'tablet' ? 'comfortable' : 'compact' };
}
```

| 폭 | 셸 | 콘텐츠 열 |
|---|---|---|
| < 768 | 하단 탭바 (현재와 동일) | 1열 |
| 768–1023 | 하단 탭바 + 넓은 패딩 | 2열 그리드 (카드형 화면) |
| 1024–1279 | SideNav(접힘 56px) + TopBar | 2열 |
| 1280–1535 | SideNav(240px) + TopBar | 3열 또는 리스트+상세 |
| ≥ 1536 | SideNav + TopBar + Inspector | 3열 + 인스펙터 |

**주의**: `useWindowDimensions`는 SSR/static export 시 초기값이 0일 수 있습니다. 첫 렌더에서 `width === 0`이면 `desktop`을 가정하고(웹) 하이드레이션 후 보정하거나, `+html.tsx`에 인라인 스크립트로 `data-layout`을 미리 세팅하는 방법을 씁니다. 후자를 권장합니다 (레이아웃 시프트 없음).

### 6.3 커맨드 팔레트 (⌘K)

**웹 전용, 이번 리디자인의 시그니처 기능입니다.**

- 트리거: `⌘K` / `Ctrl+K`, TopBar 검색 클릭, SideNav 하단 힌트 클릭
- 구조: 모달 오버레이 + 중앙 상단 패널 (폭 640, 최대 높이 480, `surface-2`, `rounded-xl`, `border-strong`, 오버레이 그림자)
- 입력: 단일 인풋. 접두사 필터 지원
  - 접두사 없음 → 전 도메인 통합 검색
  - `@` → 아티스트, `#` → 작곡가, `>` → 액션, `:` → 곡, `!` → 공연
- 결과 그룹: 작곡가 / 작품 / 아티스트 / 공연 / 액션. 그룹당 최대 5개 + "더 보기"
- 각 행: 아바타/썸네일 16 + 제목 + 우측 메타(시대, 연도, 역할) + 우측 끝 `↵`
- 액션 예시: "다크 모드 전환", "홈으로", "이 곡 비교하기", "관리자: 아티스트 추가"
- 키보드: `↑↓` 이동, `↵` 실행, `⌘↵` 새 탭, `Esc` 닫기, `Tab` 그룹 이동
- 최근 항목: 검색어 없을 때 최근 본 5개 표시 (AsyncStorage)
- 데이터: 기존 `ArtistAPI.search` / `ComposerAPI.search` / `ConcertAPI.search`를 300ms 디바운스로 병렬 호출. **신규 백엔드 API 없이 구현 가능합니다.** (통합 검색 엔드포인트는 기능 제안 문서에 별도 항목으로 둡니다)

### 6.4 웹 전용 인터랙션 규격

- **호버**: 모든 클릭 가능한 행/카드에 `hover:bg-accent` (90ms)
- **포커스**: `focus-visible:ring-2 ring-ring ring-offset-2 ring-offset-background`. 현재 `ring-[3px]`는 2px로 줄입니다
- **키보드 내비게이션**: 리스트는 `↑↓`로 이동, `↵`로 열기. 최소한 비교 화면의 연주 카드와 섹터 칩에는 필수
- **선택 상태 유지**: 리스트에서 항목 선택 시 URL 쿼리에 반영 (`?selected=123`) → 새로고침·공유 시 복원
- **커서**: `cursor-pointer`는 실제 링크/버튼에만. 카드 전체가 클릭 가능하면 카드에 부여
- **스크롤**: `+html.tsx`의 `ScrollViewStyleReset`은 유지하되, 데스크톱 셸에서는 Content 영역만 스크롤하고 SideNav/TopBar는 고정

---

## 7. 화면별 리디자인 스펙

각 항목은 **현재 → 변경 → 파일** 순으로 기술합니다.

### 7.1 홈 (`app/(tabs)/home.tsx`)

**현재**: 인사말 애니메이션 + 가로 캐러셀 3개.

**모바일 변경**
- 인사말 블록 **제거**. 대신 상단에 고정 검색 진입 바(높이 40, `surface-1`, "작곡가·곡·아티스트 검색")를 둡니다. 탭하면 검색 화면/팔레트로.
- 섹션 순서를 재정렬: `이어서 듣기(있으면) → 오늘의 비교 → 다가오는 공연 → 주목받는 아티스트 → 시대별 둘러보기`
- "오늘의 비교"를 **히어로 카드 1장**으로 승격: 곡명 + 작곡가 + 연주자 2~3명 아바타 + 섹터명 + 큰 재생 CTA. 현재의 작은 카드 캐러셀보다 이 제품의 정체성이 훨씬 잘 드러납니다.
  > **2026-09-12**: 비교 보유 곡이 **8개뿐**이므로(1.6.5) 히어로 풀이 8개입니다. 날짜 시드 기반으로 회전시키되, 아래 "인기 연주 비교" 캐러셀과 **중복 노출을 피하도록** 히어로에 쓴 곡은 캐러셀에서 제외합니다. 소스인 `/composers/with-performances`는 `limit`과 무관하게 **최대 8건**을 반환하므로 `limit=10` 호출 그대로 두어도 됩니다.
  > 응답에 **`performanceCount` 필드가 추가**되었습니다(예: 라흐 3번 12, 발라드 1번 15). 현재 `home.tsx`의 매핑은 이 값을 버리고 있는데, 히어로와 카드에 **"연주 12개 비교"** 배지로 노출하면 클릭 동기가 훨씬 강해집니다.
- 각 캐러셀 항목 폭 통일: 아티스트 140, 공연 168, 비교 240.
- 로딩: 섹션별 스켈레톤. `imagesLoaded` 게이트 **제거** (이미지 프리페치 때문에 전체 섹션이 스피너로 덮이는 현재 동작은 체감 성능을 크게 해칩니다).

**데스크톱 변경 — Bento 대시보드**
```
┌─────────────────────────────┬───────────────────┐
│ 오늘의 비교 (히어로, 2/3폭)  │ 시대별 둘러보기   │
│  곡명 · 작곡가              │  6개 시대 타일    │
│  연주자 아바타 3 + 재생 CTA │  (세로 스택)      │
├─────────────────────────────┴───────────────────┤
│ 다가오는 공연 (가로 스크롤 또는 4열 그리드)      │
├──────────────────────────┬──────────────────────┤
│ 주목받는 아티스트 (2열)  │ 최근 추가된 비교     │
└──────────────────────────┴──────────────────────┘
```
- CSS Grid (`gridTemplateColumns: '2fr 1fr'` 등)를 react-native-web에서 쓰려면 `style={{ display: 'grid' }}`를 `Platform.OS === 'web'`에서만 적용해야 합니다. 안전하게는 flex 기반 2열로 구현합니다.

**정리 대상 코드**: `LegacyArtist/LegacyConcert/LegacyComparison` 변환 레이어를 제거하고 API 타입을 직접 사용합니다. `fadeAnim`, `waveAnim`, `showGreeting` 상태 전부 삭제.

### 7.2 아티스트 (`app/(tabs)/artists.tsx`)

**모바일**
- 헤더 "아티스트 DB" + 설명 2줄 → **한 줄 제목 + 우측 카운트 배지**로 축소 (`text-title-2`)
- 검색 인풋은 스크롤 시 상단 고정(sticky). 웹에서는 `position: sticky` 지원됨
- 필터 칩 행 추가 (`category` 기반). 현재는 필터가 전혀 없습니다
  > **2026-09-12 개정 (C5)**: 실제 `category`는 영문 slug 12종이고 한글 값이 9건 섞여 있습니다(1.6.3). 표시 라벨을 하드코딩하지 말고 매핑 테이블을 둡니다.
  > ```ts
  > // lib/design/artist-category.ts
  > export const CATEGORY_LABEL: Record<string, string> = {
  >   pianist: '피아노', violinist: '바이올린', cellist: '첼로',
  >   conductor: '지휘', soprano: '소프라노', tenor: '테너',
  >   flutist: '플루트', oboist: '오보에', clarinetist: '클라리넷',
  >   orchestra: '오케스트라',
  > };
  > // 데이터 오염 흡수 (백엔드 정규화 전까지)
  > export const CATEGORY_ALIAS: Record<string, string> = {
  >   '피아니스트': 'pianist', '피아노': 'pianist',
  > };
  > ```
  > 칩 목록은 **실제 응답에 등장한 category 집합**으로 생성하고, 건수 배지를 붙입니다(`피아노 62`). 알 수 없는 값은 원문 그대로 표시합니다.
- **`orchestra` 47건 별도 처리**: 오케스트라는 사람이 아니므로 원형 아바타·생년·"~년생" 표기를 쓰지 않습니다. 사각(`rounded-lg`) 썸네일 + 창단 연도 표기로 분기하고, 필터 칩에서도 연주자 그룹과 시각적으로 분리합니다
- 카드 → **행(row)** 으로 변경: 높이 64, 아바타 40, 이름(`text-headline`) + 카테고리·국적(`text-caption`, `foreground-subtle`), 우측에 즐겨찾기 토글. 카드 그림자·보더 제거, 행 사이 구분선(hairline)
- `ScrollView` + `.map()` → **`FlatList`(가상화)** 로 전환. 무한스크롤은 `onEndReached` 사용. 현재의 수동 `onScroll` 계산 + 1초 쿨다운 로직 제거

**데스크톱**
- 3열 그리드 카드 또는 밀도 높은 테이블. **테이블을 권장**합니다:
  | 아바타+이름 | 분류 | 국적 | 출생 | 공연 | 앨범 |
  - 행 높이 44, 헤더 고정, 열 정렬(이름/출생/공연 수) 지원
  > **2026-09-12**: 목록 응답에 `topAwardId`·`awards`가 **0%**이므로(1.6.3) "수상" 열은 제외했습니다. 수상은 상세 화면에서만 표시합니다. `rating`도 전부 `"0.0"` 또는 null이라 열로 넣을 가치가 없습니다.
  - 행 클릭 → Inspector에 상세 프리뷰 (≥1536), 더블클릭/⌘클릭 → 전체 상세 페이지
- 좌측에 필터 패널(160px) 옵션: 분류·국적·시대 체크박스

**파일**: `app/(tabs)/artists.tsx`(데이터 로직) + `components/artists/artist-list.mobile.tsx` + `components/artists/artist-table.desktop.tsx`

### 7.3 공연 (`app/(tabs)/concerts.tsx`)

**모바일**
- 접이식 필터 패널 → **상단 필터 바 + 바텀시트**. 필터 바에는 활성 필터가 칩으로 표시되고(`지역: 서울 ×`), "필터" 버튼을 누르면 바텀시트가 올라옵니다
- 지역 드롭다운의 직접 구현(`TouchableOpacity` + `▼` 문자) → `components/ui/select.tsx` 사용으로 교체
  > **2026-09-12 — 버그 D1 동시 수정**: `AREA_CODE_MAP` 키가 축약형(`서울`)인데 `/concerts/areas`는 풀네임(`서울특별시`)을 반환해 **지역별 박스오피스가 전혀 동작하지 않습니다**(1.6.6). Select로 교체할 때 매핑을 풀네임 기준으로 고치거나 정규화 함수(`서울특별시 → 서울`)를 넣어야 합니다. 응답에 `"대구광역시, 대구광역시"` 같은 중복 문자열과 `"전남광주통합특별시"`가 섞여 있으므로 **알 수 없는 값은 필터 목록에서 제외하지 말고 코드 없이 표시만** 합니다.
- **카드 표시 필드 재정의**: 목록 응답에는 `artists`·`ratingCount`·`priceInfo`가 없습니다(1.6.6). 현재 `ConcertCard`가 이들을 렌더하지만 항상 빈 값입니다. 목록에서는 `title / posterUrl / startDate~endDate / concertTime / facilityName / area / genre / status / rating`만 사용하고, 출연진·가격·프로그램은 상세에서 노출합니다
- 박스오피스 TOP3: 하드코딩 색상 → `RANK_PALETTE` 토큰. 테두리 2.5px + 그림자 → **테두리 1px + 좌상단 랭킹 배지**로 절제
- 공연 카드: 높이 250 고정 → 포스터 3:4 비율 기반 가변. 상태 배지 색상 토큰화 (`upcoming`→info, `ongoing`→success, `completed`→foreground-faint, `cancelled`→destructive)
- `FlatList` 전환 (아티스트와 동일)

**데스크톱**
- **좌측 필터 패널(220px 고정) + 우측 결과 그리드(3~4열)**. 필터가 항상 보이는 것이 데스크톱의 이점입니다
- 카드는 포스터 중심(3:4) + 하단 2줄 메타. 그리드 gap 16
- 상단에 뷰 전환 토글: `그리드 / 리스트 / 캘린더`. 캘린더 뷰는 기능 제안 문서 참고
- 박스오피스 TOP3는 필터 패널 상단이나 결과 영역 최상단 가로 밴드로

**시안 검증으로 확정된 규칙 (2026-09-16)**

- **박스오피스는 필터 결과 위에 두지 않습니다.** 박스오피스는 상단 필터(기간·지역)의 적용 대상이 아닙니다. 필터 바 바로 아래에 두면 `오늘`로 걸러 놓고 다음 달 공연을 보여 주는 모순이 생깁니다. **필터 결과 아래에 구분선(`border-top: 1px var(--line)`, `margin-top: 34px`)을 두고 배치하고, 섹션 헤더 우측에 `이번 달 · 필터와 무관`을 명시**합니다.
- 필터 축이 둘(지역·기간) 이상이므로 **축마다 라벨(`.flab`, 11px uppercase, `foreground-faint`)을 붙여 그룹으로 나눕니다.** 칩만 한 줄로 늘어놓으면 어느 축인지 읽히지 않습니다. 지역은 상위 4개 + `+N개 지역` 더보기 칩, 기간은 `오늘 / 이번 주 / 이번 달 / 날짜 지정`입니다.
- 필터 바 아래에 **결과 요약 줄**(`212건 · 클래식 · 전국 · 오늘` + `필터 초기화`)을 둡니다. 적용 상태를 문장으로 한 번 더 확인시켜 줍니다.
- **모바일은 축을 나란히 둘 공간이 없습니다.** 고정 원형 필터 버튼(36px, 적용 개수 배지) + 가로 스크롤 칩(`overflow-x:auto`, 스크롤바 숨김)으로 접습니다. 헤더와 필터 줄은 `position: sticky; top: 0`으로 고정합니다.
- **카드 그리드는 반드시 `repeat(n, minmax(0, 1fr))`** 입니다. `1fr`은 `minmax(auto, 1fr)`이라 콘텐츠 최소 폭 아래로 줄지 않습니다. 공연 제목이 길어 실제로 그리드가 프레임 밖 522px까지 밀려났습니다(부록 D).
- **포스터를 확대하지 않습니다.** KOPIS 포스터 원본은 `212~375 × 300~480`입니다. 카드 폭을 원본 폭 이상으로 잡으면 업스케일로 글자가 뭉개집니다. 실측 기준 렌더 배율이 1을 넘지 않도록 열 수를 정합니다(시안: 데스크톱 카드 174.8px, 모바일 목록 썸네일 52px, 모바일 박스오피스 112px — 모두 0.22~0.39배 축소).
- 모바일 공연 목록은 그리드가 아니라 **세로 행**입니다. 포스터 폭 52px(3:4) + 제목 2줄 클램프 + 시간·장소 1줄 + 우측 예매 버튼(34px 대상). 행 높이 85px 균일.

**박스오피스 장르 톤에 대한 판단**

박스오피스 1~3위가 게임·영화 IP 오케스트라(트릭컬 리바이브, 인터스텔라 필름콘서트)로 채워지는 경우가 있습니다. **KOPIS 원본에서 이 공연들의 `genre`가 이미 `서양음악(클래식)`이므로 장르 코드로 걸러낼 수 없습니다.** 다음과 같이 다룹니다.

- 데이터를 고치거나 특정 공연을 숨기지 않습니다. 실제 순위입니다.
- 대신 위의 배치 규칙(필터 결과 아래, 구분선 분리)으로 **시각 앵커 자리를 내주지 않습니다.** 공연 탭의 주 작업은 "오늘 뭘 보러 갈까"이지 "뭐가 잘 팔리나"가 아닙니다.
- 크로스오버를 구분하려면 세부 장르나 키워드 필드가 필요합니다. **지금 없는 필드이므로 프론트에서 제목 문자열로 추측하지 않습니다.** 백엔드 요청 항목으로 넘깁니다(추가 기능 문서 B20).

### 7.4 비교 (`app/(tabs)/compare.tsx`) — 최우선 재설계 대상

이 화면이 제품의 핵심인데 현재 구조가 가장 낡았습니다.

**현재 문제**
1. 작곡가·곡 선택이 화면 상단 절반을 차지하고, 정작 비교 대상인 영상은 스크롤해야 보입니다
2. 가로 페이징이라 **한 번에 연주 하나만 보입니다**. "비교"가 되지 않습니다
3. 펼침/접힘을 `maxHeight` 보간으로 처리해 콘텐츠가 잘리거나 빈 공간이 생깁니다
4. 시대 필터 칩 7개가 하드코딩으로 7번 반복됩니다
5. 영상 높이 196px 고정

**모바일 변경**
```
┌────────────────────────────────────┐
│ [작곡가 · 곡]  ← 상단 고정 선택 바  │  탭하면 바텀시트 피커
├────────────────────────────────────┤
│ 1악장  2악장  3악장     ← 섹터 칩   │  가로 스크롤, sticky
├────────────────────────────────────┤
│ ┌────────────────────────────────┐ │
│ │  주 영상 (16:9, 전폭)          │ │  선택된 연주 1개만 재생
│ └────────────────────────────────┘ │
│  아티스트명 · 역할 · 연도          │
│  "특징 인용문"                     │
├────────────────────────────────────┤
│ 이 구간의 다른 연주  (n)           │
│ ○ 아바타 아티스트A  4:12  [준비됨] │  ← 세로 리스트, 탭하면 주 영상 교체
│ ○ 아바타 아티스트B  4:31  [준비됨] │
│ ○ 아바타 아티스트C  4:08  [준비중] │  ← clipStatus ≠ ready면 재생 불가 표시
└────────────────────────────────────┘
```
- 상단 선택 바는 항상 접혀 있고, 탭하면 바텀시트로 작곡가/곡을 고릅니다. 현재의 인라인 펼침 2단계를 없앱니다
- 주 영상 하나 + 후보 리스트 구조로 바꾸면 프로젝트 지침("영상 하나만 선택하여 재생하고 나머지는 poster 상태로 유지")과 정확히 맞습니다
- 시대 필터 칩은 `getAllPeriods()`를 `.map()`으로 렌더 (하드코딩 7회 제거)

**데스크톱 변경 — 진짜 비교 워크벤치**
```
┌──────────┬──────────────────────────────────────────────┬──────────────┐
│ 작곡가    │ 곡명 · Op. 30 · 1909 · 40분 · 난이도 10/10    │ 연주 정보    │
│ 검색+리스트│ ──────────────────────────────────────────── │ ─────────    │
│ (240px)   │ 1악장 카덴챠 ³  2악장 ³  3악장-도입부 ³  …    │ 아티스트: …  │
│ [비교가능]│ ┌──────────┐ ┌──────────┐ ┌──────────┐      │ 구간: 11:10~ │
│           │ │ 연주 A    │ │ 연주 B    │ │ 연주 C    │      │       12:51  │
│  · 쇼팽 ³ │ │ 16:9      │ │ 16:9      │ │ 16:9      │      │ 길이: 1:41   │
│  · 라흐 ² │ │오리지널카덴│ │오시아 카덴│ │오리지널카덴│      │ ─────────    │
│  · 바흐 ¹ │ │ 임윤찬    │ │ 아티스트B │ │ 아티스트C │      │ 출처         │
│           │ └──────────┘ └──────────┘ └──────────┘      │ YouTube      │
│  곡 리스트│                                              │              │
│  (선택시) │                                              │              │
└──────────┴──────────────────────────────────────────────┴──────────────┘
```

> **2026-09-12 개정 (C1·C2) — 실측 반영**

- **3열 그리드**입니다. 2×2가 아닙니다. 실측 섹터당 연주 수는 **3개(12섹터) 또는 5개(3섹터)**이고 4개인 섹터는 존재하지 않습니다(1.6.5).
  - 3개 → 한 줄에 3개, 딱 맞음
  - 5개 → 3 + 2 (둘째 줄 2개는 첫 줄과 같은 폭 유지, 좌측 정렬)
  - 3열 슬롯 폭은 1280px 콘텐츠 기준 약 380px (16:9 → 214px 높이). 모바일 현재 350px와 비슷해 카드 내부 레이아웃을 재사용할 수 있습니다
- **섹터 탭은 2개 이상일 때만 렌더**합니다. 비교 보유 8곡 중 5곡이 섹터 1개("전곡")이므로, 탭 하나짜리 UI가 되는 걸 막습니다. 섹터 1개일 때는 곡 제목 아래에 섹터명을 보조 텍스트로만 표기합니다
- 섹터명 길이 편차가 큽니다(`"전곡"` 2자 ↔ `"서주 & 제1주제 (Introduction & First Theme)"`). 탭은 **최대 폭 200px + 말줄임 + 툴팁**으로 처리하고, 각 탭에 연주 수 배지를 답니다
- **`characteristic`을 슬롯 상단 배지로 승격**합니다. 라흐 3번 1악장 카덴챠 섹터는 `"오리지널 카덴챠"` / `"오시아 카덴챠"`로 갈리는데, 이게 바로 사용자가 비교하려는 대상입니다. 기존 설계의 "하단 인용문"보다 훨씬 위에 둡니다. `null`이면 배지를 렌더하지 않습니다
- 프로젝트 지침 "목록 진입 시 모든 영상을 동시에 로드하지 않습니다"를 지킵니다 → **기본은 포스터 상태**, 슬롯 클릭 시 로드. 재생은 한 번에 하나만(다른 슬롯 재생 시 이전 것 일시정지)
- 우측 Inspector: **현재 받을 수 있는 것만** 표시합니다 — 아티스트명(`artistId` → 아티스트 조회), 구간(`startTime`~`endTime`), 길이, `videoPlatform`. 계약 문서의 `PerformanceCredit`(지휘/오케스트라 동시 표기)과 `clipStatus`는 **아직 서빙되지 않으므로**(1.6.5) 자리만 만들고 데이터가 오면 채웁니다. 없는 필드를 추측해 채우지 않습니다
- **작곡가/곡 리스트에 "비교 가능" 필터**를 답니다. 작곡가 112명 중 비교 보유는 5명뿐이라 필터 없이는 빈손 경험이 기본값이 됩니다. 리스트 항목에 비교 보유 곡 수를 위첨자로 표기합니다

**곡 선택 리스트 — 성능 (C4)**

`/composers/{id}/pieces`는 pagination이 없고 바흐는 **1,695곡 / 566KB**를 한 번에 반환합니다(1.6.4). 현재 `compare.tsx`는 이걸 `maxHeight 400` 스크롤 안에 `.map()`으로 전부 렌더합니다. 필수 조치:

1. **`FlatList` 가상화** + `initialNumToRender: 20`
2. **클라이언트 검색을 기본 노출** (현재는 리스트를 펼쳐야 검색창이 보임)
3. **비교 보유 곡을 최상단에 고정** — `/composers/with-performances` 결과와 교차해 pin
4. 응답 자체는 `useQuery`로 캐싱하고 `staleTime`을 길게(작품 목록은 거의 안 바뀜)
5. 백엔드에 pagination 요청 (기능 제안서 B15)

**보존해야 할 로직**
- URL 파라미터 진입(`?composerId=&pieceId=`) 처리
- `clipStatus !== 'ready'` 필터링 (계약 구현 후 활성화. 현재는 필드가 오지 않음 — 1.6.5)
- 웹=클립 URL / 네이티브=YouTube IFrame 이중 재생 경로 (`components/performance-video-player.tsx`). **재생 모드 변경은 별도 승인 필요**하므로 이번 리디자인에서 건드리지 않습니다
- 관리자 편집/삭제 액션

**파일 분리 제안** (1438줄 해체)
```
app/(tabs)/compare.tsx                     라우팅 + 상태 오케스트레이션 (~250줄)
components/compare/composer-piece-picker.tsx   작곡가/곡 선택 (바텀시트 + 데스크톱 사이드)
components/compare/sector-tabs.tsx
components/compare/performance-slot.tsx        영상 슬롯 1개 (포스터 → 재생)
components/compare/performance-grid.desktop.tsx
components/compare/performance-list.mobile.tsx
components/compare/credit-inspector.tsx
lib/compare/use-compare-state.ts               선택 상태 + URL 동기화
```

### 7.5 타임라인 (`app/(tabs)/timeline.tsx`)

**유지할 것**: 가로 스크롤 타임라인이라는 발상 자체는 좋고 차별화 요소입니다.

**변경**
- 2초 자동 로테이션 **제거**. 밀집 영역은 "+N" 배지로 표시하고 탭했을 때만 펼칩니다 (calm UI 원칙)
- 다크모드 이중 감지(`matchMedia` + `useColorScheme`) 제거 → NativeWind `useColorScheme` 단일 소스
- 시대 배경 밴드 색은 `era-palette.ts`의 `*-bg` 값 사용
- 줌 레벨 도입: 세기 / 50년 / 10년 3단계. 데스크톱은 `⌘+`/`⌘-`와 트랙패드 핀치, 모바일은 핀치 제스처
- **X축 범위를 데이터에 맞춥니다 (C3)**: `lib/data/periods.ts`는 500년(중세)부터 그리도록 되어 있지만 실제 작곡가는 **1567년(몬테베르디)부터**입니다(1.6.2). 500~1560 구간 약 1,000년이 완전히 비어 있어 축의 절반 이상이 낭비됩니다.
  - 기본 뷰포트를 **실제 데이터의 min/max birthYear**로 계산해 초기 스크롤·줌을 맞춥니다
  - 중세·르네상스 밴드는 지우지 않고 `foreground-faint` 해치 + "등록된 작곡가 없음" 라벨로 남깁니다(연대 왜곡 방지). 초기 뷰포트 밖이므로 시야를 가리지 않습니다
- 하단 작곡가 리스트를 **좌측 패널(데스크톱)** 로 이동. 리스트에서 호버하면 타임라인의 해당 아바타가 하이라이트됩니다
- 시대 모달 → 데스크톱에서는 Inspector 패널로

**데스크톱 레이아웃**
```
┌──────────┬──────────────────────────────────────────────────┐
│ 작곡가    │  [세기] [50년] [10년]        ← 줌 컨트롤          │
│ 검색·필터 │ ─────────────────────────────────────────────────│
│ (240px)   │  중세 │ 르네상스 │ 바로크 │ 고전 │ 낭만 │ 근현대  │
│           │   ●        ● ●      ●●●     ●●    ●●●●    ●●     │
│  리스트   │  1400    1500   1600  1700  1800  1900  2000     │
│           │ ─────────────────────────────────────────────────│
│           │  선택된 시대 상세 (인라인 확장)                   │
└──────────┴──────────────────────────────────────────────────┘
```
- 타임라인은 전폭 사용(`max-w-none`)

### 7.6 상세 화면 — 아티스트 / 작곡가

**공통 골격 통일**. 현재 두 파일이 같은 구조를 각자 구현하고 있으므로 `components/detail/` 아래로 공통화합니다.

> **2026-09-12 개정 (C6) — 커버 이미지 전략 변경**
>
> 작곡가 **110/112(98%)** 가 `coverImageUrl == avatarUrl`입니다(1.6.2). 대부분 위키미디어의 **세로 초상화**라서 이걸 `h-64` 와이드 커버로 `resizeMode: cover` 하면 얼굴이 잘리거나 배경만 보입니다. 아티스트도 Apple Music의 **정사각** 이미지(600/1200)라 같은 문제가 있습니다.
>
> 대안: **블러 배경 + 초상 카드** 방식으로 바꿉니다.
> ```
> ┌─────────────────────────────────────┐
> │ ░░░ 같은 이미지를 blur(40) + 어둡게 ░░│  ← 배경 (h-44)
> │   ┌────────┐                        │
> │   │ 초상   │  이름                   │  ← 원본 비율 유지 카드 (3:4, 높이 128)
> │   │ 3:4    │  영문명 · 시대 · 국적    │     rounded-lg, border
> │   └────────┘                        │
> └─────────────────────────────────────┘
> ```
> - 배경 블러는 웹 `filter: blur()`, 네이티브 `expo-blur` 또는 저해상도 이미지 업스케일
> - `coverImageUrl`이 `avatarUrl`과 **다른 경우에만** 기존 와이드 커버를 씁니다 (작곡가 2명, 아티스트 144명)
> - 이미지 자체가 없는 경우(작곡가 1명, 아티스트 5명)는 시대 색 그라디언트 + 이니셜

**모바일**
- 커버 h-64 → h-44 블러 배경 + 초상 카드 (위 참고)
- 상단 오버레이 컨트롤(back / 테마 / 유저)은 back만 남기고 테마·유저는 제거 (상세 화면에서 테마를 바꿀 이유가 없습니다)
- 아바타 `-mt-12` 겹침 유지, 크기 96 → 80
- 이름 아래에 **액션 바** 추가: `즐겨찾기` / `공유` / `비교로 이동`
- 카드 스택 → **탭 구조**로: `개요 / 연주 비교 / 음반 / 공연 / 수상`. 현재는 모든 정보가 한 줄로 쌓여 있어 스크롤이 매우 깁니다
- 정보 나열은 `MetadataList` 컴포넌트로 통일 (라벨 좌 + 값 우, 행 높이 32, 구분선)

**데스크톱**
```
┌─────────────────────────────────────────────────────────┐
│ 커버 (h-64, 전폭)                                        │
├───────────────┬─────────────────────────────────────────┤
│ 아바타 120    │  이름 (text-display)                     │
│ 이름/영문명   │  영문명 · 분류 · 국적 · 출생              │
│ 액션 버튼     │  [개요] [연주 비교] [음반] [공연] [수상]  │
│ ─────────     │ ────────────────────────────────────────│
│ MetadataList  │  탭 콘텐츠                               │
│  분류         │  (개요: 소개 + 스타일 + 통계)             │
│  국적         │                                          │
│  출생         │                                          │
│  공연 수      │                                          │
│  앨범 수      │                                          │
│ (280px 고정)  │  (나머지 폭)                             │
└───────────────┴─────────────────────────────────────────┘
```

**"이 아티스트의 연주 비교" 섹션**: 계약 문서(`docs/global-seed-frontend-contract.md`)의 스펙을 그대로 지킵니다 — 작품명, 작곡가, 비교 구간명, 역할, 준비된 클립, "다른 연주자와 비교하기" 액션, 작품별 그룹핑, cursor pagination. 현재 `components/artist-comparison-section.tsx`(248줄)에 구현되어 있으므로 **표현만 새 토큰/컴포넌트로 교체**합니다.

> **2026-09-12 — 버그 D2**: `/artists/{id}/comparison-performances`가 **항상 빈 배열**을 반환합니다(1.6.6). 즉 이 섹션은 현재 프로덕션에서 **언제나 빈 상태**입니다. 임윤찬(187)은 `/artists/187/performances`로는 연주 4건이 나오는데 comparison 경로로는 0건입니다.
>
> 리디자인 시 선택지:
> 1. **(권장)** 백엔드 계약 구현을 기다리되, 그전까지 `/artists/{id}/performances` + `/pieces/{id}` + `/sectors/{id}` 조합으로 **임시 폴백**을 두지 않습니다 — 계약 문서가 명시적으로 "프론트가 performance별로 작품 API를 다시 호출하는 N+1 구조를 만들지 않습니다"라고 금지합니다
> 2. 빈 배열일 때 **섹션 자체를 숨기고**, 관리자에게만 "비교 계약 미구현" 진단 배지를 노출합니다
>
> 2번으로 구현하고, 백엔드 계약(기능 제안서 B16)이 들어오면 자동으로 켜지게 합니다.

### 7.7 상세 화면 — 공연

**모바일**
- 현재 중앙 정렬 제목 + 80% 폭 포스터 → **좌 포스터(120) + 우 정보** 상단 블록으로 변경. 스크롤 상단에서 핵심 정보(제목/날짜/장소/가격/예매)가 한 번에 보이도록
- 예매 CTA를 하단 고정 바로 (`safe-area` 고려)
- 정보 카드 스택 → `MetadataList` + 접이식 섹션(소개/캐스트/스태프/일정)

**데스크톱**
- 2열: 좌측 포스터(320) + 예매 CTA + MetadataList / 우측 소개·프로그램·출연진·평점·리뷰
- 지도(공연장 위치)는 기능 제안 문서 참고

**소개 이미지 정책 (2026-09-16 확정)**

KOPIS 공연 소개 이미지는 **세로로 매우 깁니다**(실측 `221 × 620`, 폭:높이 ≈ 1:2.8). 포스터가 아니라 세로로 긴 상세 이미지입니다.

- `background-size: cover` + 고정 높이로 넣으면 **폭을 맞추느라 2.86배 확대되고 세로 83%가 하드컷**됩니다. 시안 초기 버전에서 실제로 발생했습니다.
- 규칙: **`contain` + 폭 상한 420px + 원본 종횡비 유지 + 높이만 접기.** 접힌 아래쪽은 배경색으로 페이드(`linear-gradient(transparent, var(--s1) 88%)`)하고, `소개 전체 보기`로 펼칩니다(330px → 600px).
- **펼치기 버튼을 이미지 위에 겹치지 않습니다.** `position: absolute`로 올리면 이미지 하단을 가립니다. 이미지 블록 바깥 아래에 둡니다.
- 출연진 그리드는 **실제 인원 수에 맞춰 열을 잡습니다.** `repeat(4, …)` 고정이면 2명짜리 공연에서 오른쪽 절반이 빕니다.
- 하단에 **출처(KOPIS 공연예술통합전산망)와 공연 ID를 명시**합니다. 프로젝트 지침상 출처를 숨기지 않습니다.

### 7.8 마이페이지 · 공개 프로필

- 이미 `max-w-5xl`, 탭 구조라 상대적으로 양호합니다
- 변경: `ProfileTabs`를 공통 `TabList` 컴포넌트로 교체, `ProfileStats`를 통계 타일(4개, 숫자 `text-title-1` + 라벨 `text-caption`)로 정리
- 데스크톱: 좌측 프로필 카드(280) + 우측 탭 콘텐츠 2열

### 7.9 인증 화면

- 현재 폼이 화면 전폭입니다. `max-w-[400px] mx-auto` + 상하 중앙 정렬로 변경
- 데스크톱: 좌측 브랜드 패널(그라디언트 + 로고 + 한 줄 카피) + 우측 폼 2열 스플릿
- 소셜 로그인 버튼(`components/social-connections.tsx`)의 아이콘·간격 통일

### 7.10 관리자 폼 모달 (`components/admin/*`)

7개 모달(Artist/Composer/Concert/Performance/Piece/Recording/Sector)이 각자 구현되어 있습니다.

- 공통 `FormModal` 셸 도입: 헤더(제목 + 닫기) / 스크롤 바디 / 푸터(취소·저장, 저장 중 로딩)
- 데스크톱에서는 모달 대신 **우측 슬라이드오버 패널**(폭 480)로. 배경 리스트를 보면서 편집할 수 있습니다
- 폼 필드는 `FormField`(라벨 + 컨트롤 + 헬프/에러) 공통 컴포넌트로 통일
- 이 작업은 우선순위 낮음 (관리자 전용)

### 7.11 온보딩 (`components/OnboardingModal.tsx`)

- 2026년 기준 온보딩 캐러셀은 사장된 패턴입니다
- 변경: 첫 진입 시 **홈 화면 위의 인라인 선택 카드 1장**("좋아하는 시대를 고르면 추천이 달라져요" + 시대 6개 칩 + 건너뛰기)으로 축소. 선택하면 카드가 사라지고 홈이 개인화됩니다
- 기존 `updatePreferences` / `completeOnboarding` 로직은 그대로 재사용

---

## 8. 컴포넌트 인벤토리

### 8.1 프리미티브 (`components/ui/`) — 기존 확장

| 컴포넌트 | 상태 | 작업 |
|---|---|---|
| `text.tsx` | 있음 | variant를 4.2.2 스케일로 전면 교체. `h1~h4` → `display/title-1/title-2/title-3` |
| `button.tsx` | 있음 | size에 `xs`(26) 추가, density 대응, variant에 `subtle` 추가 |
| `card.tsx` | 있음 | 다크 더블링 처리, `interactive` prop(호버/포커스) 추가 |
| `input.tsx` | 있음 | density 대응, `leadingIcon`/`trailingIcon` prop 추가 (현재는 절대배치로 5곳에서 반복) |
| `select.tsx` | 있음 | concerts의 수동 드롭다운 교체에 사용 |
| `avatar.tsx` | 있음 | `ring` prop 추가 (시대 색 링) |
| `icon.tsx` | 있음 | 유지 |
| `popover.tsx` | 있음 | 유지 |
| `separator.tsx` | 있음 | 유지 |
| `label.tsx` | 있음 | 유지 |

### 8.2 프리미티브 — 신규

| 컴포넌트 | 용도 | 대체 대상 |
|---|---|---|
| `chip.tsx` | 필터·섹터·태그 칩 (variant: filter/tag/count, size: sm/md) | compare의 시대 칩, `sector-chip.tsx`, composer 상세의 인라인 칩 |
| `badge.tsx` | 상태·랭킹·카운트 배지 | concerts 상태 배지, 랭킹 배지, 각종 인라인 배지 |
| `skeleton.tsx` | 로딩 플레이스홀더 (`SkeletonRow`, `SkeletonCard`, `SkeletonText`) | 12곳 이상의 `ActivityIndicator` |
| `empty-state.tsx` | 빈/오류/준비중 상태 통합 | 8곳 이상의 인라인 빈 상태 |
| `metadata-list.tsx` | 라벨-값 나열 | 상세 화면 3종의 정보 카드 |
| `tab-list.tsx` | 탭 (underline / segmented 2종) | my-page `ProfileTabs`, 상세 화면 탭, 비교 섹터 |
| `tooltip.tsx` | 웹 전용 툴팁 | 없음 (신규) |
| `sheet.tsx` | 바텀시트 (모바일) / 슬라이드오버 (데스크톱) | 관리자 모달, 필터 패널, 피커 |
| `data-table.tsx` | 웹 전용 밀도 테이블 | artists/concerts 데스크톱 뷰 |
| `segmented-control.tsx` | 뷰 전환 토글 | concerts 그리드/리스트 전환 |
| `fallback-art.tsx` | 이미지가 없는 작곡가·아티스트·작품의 폴백 타일 (성 이니셜 + 결정적 그라디언트 + 노이즈) | 각 화면의 인라인 폴백. **1.7.2 기준 목록의 절반 이상이 이 상태이므로 1급 컴포넌트입니다** |
| `icons/` (디렉터리) | ClassicMap 고유 아이콘 9종. 4.7절 참고 | lucide에 대응물이 없는 개념들 |

### 8.3 셸 (`components/shell/`) — 신규, 웹 전용

| 컴포넌트 | 설명 |
|---|---|
| `app-shell.tsx` | 셸 골격. `AppShell.Nav / .Header / .Content / .Inspector` 서브컴포넌트 |
| `side-nav.tsx` | `SideNav`, `SideNavItem`, `SideNavSection`, `SideNavCollapseButton` |
| `top-bar.tsx` | 브레드크럼 + 검색 트리거 + 페이지 액션 |
| `command-palette.tsx` | ⌘K 팔레트 (6.3 스펙) |
| `inspector-panel.tsx` | 우측 상세 패널 |
| `kbd.tsx` | 키캡 표시 (`⌘K`, `↵`) |

### 8.4 도메인 컴포넌트 정리

| 현재 | 작업 |
|---|---|
| `components/artist-comparison-section.tsx` | `components/compare/artist-comparison-section.tsx`로 이동, 새 토큰 적용 |
| `components/sector-chip.tsx` | `components/ui/chip.tsx`로 흡수 후 삭제 |
| `components/StarRating.tsx` | 토큰화(amber → warning 또는 primary), 크기 variant 추가 |
| `components/optimized-image.tsx` | 스켈레톤 통합, `#f0f0f0` 하드코딩 → `muted` 토큰 |
| `components/performance-video-player.tsx` | **재생 로직 변경 금지**. 포스터 상태 + 클릭 시 로드 래퍼만 추가 |
| `components/ticket-vendors-modal.tsx` | `sheet.tsx` 기반으로 교체 |
| `components/my-page/profile-components.tsx` (714줄) | 컴포넌트별 파일로 분할 |
| `components/admin/*` | 공통 `FormModal` + `FormField` 도입 |

### 8.5 디자인 유틸 (`lib/design/`) — 신규

```
lib/design/
├── tokens.ts          토큰 TS 접근자 (theme.ts 대체, global.css 단일 소스에서 파생)
├── breakpoints.ts     useBreakpoint()
├── density.ts         useDensity()
├── era-palette.ts     시대 색 (다크/라이트 안전값 포함)
├── rank-palette.ts    박스오피스 랭킹 색
└── motion.ts          duration/easing 상수
```

**`lib/theme.ts` 중복 문제 해결**: 현재 `global.css`와 `lib/theme.ts`가 값을 이중 관리합니다. `lib/design/tokens.ts`에서 **단일 정의**를 하고, 빌드 스크립트로 `global.css`를 생성하거나(권장) 최소한 두 파일 사이의 값 일치를 검증하는 테스트를 둡니다.

---

## 9. 구현 로드맵

각 단계 = 1 커밋 (프로젝트 지침: 한 커밋에 하나의 작업 패킷, 한국어 커밋 메시지).

### 단계 0 — 준비 (0.5일)

| # | 작업 | 검증 |
|---|---|---|
| 0.1 | 현재 주요 화면 스크린샷 캡처 (라이트/다크 × 모바일/데스크톱) → `docs/redesign/baseline/` | 8장 이상 |
| 0.2 | `npx tsc --noEmit`, `npx expo export --platform web` 기준선 확인 | 통과 |

### 단계 1 — 디자인 토큰 (1일)

| # | 작업 | 파일 |
|---|---|---|
| 1.1 | `global.css` 색상 변수 전면 교체 (4.1) | `global.css` |
| 1.2 | `lib/design/tokens.ts` 신설, `lib/theme.ts`를 이것의 파생으로 | `lib/design/tokens.ts`, `lib/theme.ts` |
| 1.3 | `tailwind.config.js`에 신규 색상(surface-1~3, foreground-muted/subtle/faint, border-strong, success/warning/info, primary-muted), 타이포 스케일, 반경, 모션 확장 | `tailwind.config.js` |
| 1.4 | `era-palette.ts`, `rank-palette.ts` 신설. `periods.ts`가 재수출하도록 | `lib/design/*`, `lib/data/periods.ts` |
| 1.5 | `breakpoints.ts`, `density.ts`, `motion.ts` 신설 | `lib/design/*` |

**검증**: 기존 화면이 새 색으로 렌더되고 tsc/export 통과. 이 시점에서 앱이 이미 "다른 제품"처럼 보입니다.

### 단계 2 — 프리미티브 (1.5일)

| # | 작업 |
|---|---|
| 2.1 | `text.tsx` variant 교체 + 기존 사용처 일괄 치환 (`text-xl font-bold` → `text-title-3` 등) |
| 2.2 | `chip.tsx`, `badge.tsx` 신설 → `sector-chip.tsx` 흡수, compare 시대 칩·concerts 상태 배지 교체 |
| 2.3 | `skeleton.tsx`, `empty-state.tsx` 신설 → 로딩/빈 상태 일괄 교체 |
| 2.4 | `button.tsx`, `input.tsx`, `card.tsx` density 대응 + 아이콘 prop |
| 2.5 | `metadata-list.tsx`, `tab-list.tsx` 신설 |
| 2.6 | `lib/design/artist-category.ts` 신설 — category 라벨·alias 매핑 (C5) |

**검증**: 색상 하드코딩 grep 결과 0건 (`rg '#[0-9a-fA-F]{6}' app components --glob '!**/*.test.*'`)

### 단계 3 — 웹 셸 (2일)

| # | 작업 |
|---|---|
| 3.1 | `components/shell/app-shell.tsx`, `side-nav.tsx`, `top-bar.tsx` 신설 |
| 3.2 | `app/(tabs)/_layout.web.tsx` 신설 — 브레이크포인트 기반 셸/탭 분기 |
| 3.3 | `+html.tsx`에 초기 레이아웃 클래스 인라인 스크립트 + 폰트 preload 추가 |
| 3.4 | `command-palette.tsx` 신설 (⌘K, 기존 search API 3종 병렬 호출) |
| 3.5 | `inspector-panel.tsx` 신설 (≥1536) |

**검증**: 1920px 웹에서 SideNav 동작, ⌘K 검색 → 라우팅 성공, 모바일 웹에서 기존 탭바 유지, 네이티브 무영향

### 단계 4 — 화면 이관 (5~7일, 화면당 1커밋)

우선순위 순:

| # | 화면 | 근거 |
|---|---|---|
| 4.0 | **버그 D1 지역 필터 수정** | 리디자인과 무관하게 지금 깨져 있음. 단독 커밋 (1.6.6) |
| 4.1 | **비교** (7.4) | 제품 핵심, 현재 구조가 가장 낡음. 파일 분해 + 3열 그리드 + "비교 가능" 필터(기능 제안서 19) 포함 |
| 4.2 | **홈** (7.1) | 첫인상. 인사말 제거 + 히어로 + Bento |
| 4.3 | **아티스트** (7.2) | FlatList 전환 + 데스크톱 테이블 |
| 4.4 | **공연** (7.3) | 필터 패널 + 그리드 |
| 4.5 | **상세 3종** (7.6, 7.7) | 공통 골격화 |
| 4.6 | **타임라인** (7.5) | 로테이션 제거 + 줌 + 데스크톱 |
| 4.7 | **마이페이지·인증** (7.8, 7.9) | 폭 제한 + 스플릿 |
| 4.8 | **관리자 폼** (7.10) | 슬라이드오버 |
| 4.9 | **온보딩** (7.11) | 인라인 카드 |

### 단계 5 — 네이티브 크롬 (1일)

| # | 작업 |
|---|---|
| 5.1 | `expo-blur` 추가, 탭바/헤더 반투명 처리 (5.4) |
| 5.2 | `(tabs)/_layout.tsx`의 하드코딩 색상(`#000`/`#fff`/`#888`/`#666`/`#333`/`#e5e5e5`) 토큰화 |
| 5.3 | iOS/Android 실기 확인 |

### 단계 6 — 마감 (1.5일)

| # | 작업 |
|---|---|
| 6.1 | 폰트 도입 (Pretendard + mono), 웹 서브셋 |
| 6.2 | 접근성 감사: 대비(AA), `accessibilityLabel`, 키보드 경로, `prefers-reduced-motion` |
| 6.3 | `design-qa.md` 형식의 QA 보고서 작성 (라이트/다크 × 4화면 캡처 비교) |
| 6.4 | 성능: 리스트 가상화 확인, 이미지 프리페치 정책 재검토, 웹 번들 크기 비교 |

**총 예상**: 13~16 작업일

---

## 10. 리스크 및 주의사항

### 10.1 프로젝트 지침 준수 체크리스트

`CLAUDE.md`에서 반드시 지켜야 할 항목들을 리디자인 관점으로 옮긴 것입니다.

- [ ] `clipStatus !== 'ready'`인 영상에 재생 UI를 노출하지 않습니다 → 데스크톱 2×2 그리드에서도 준비 안 된 슬롯은 배지만
- [ ] 목록 진입 시 모든 영상을 동시에 로드하지 않습니다 → 그리드 슬롯 기본 상태는 포스터, 클릭 시 로드
- [ ] API 목록에 pagination 유지, 전체 작품·녹음 일괄 요청 금지 → 데스크톱 테이블도 무한스크롤/커서 유지
- [ ] 백엔드 계약 미확정 필드를 프론트에서 추측하거나 임시 fallback으로 만들지 않습니다 → 새 UI가 요구하는 필드는 전부 기능 제안 문서에 "백엔드 계약 필요"로 명시
- [ ] 명시적 TypeScript 타입 사용, `any` 추가 금지 → 현재 `home.tsx`의 `vendors: any[]`, `handleScroll(event: any)` 등은 이번에 정리
- [ ] 사용자 문구는 해요체, 오류 문구에 다음 행동 포함
- [ ] 플랫폼 출처와 영상 출처를 숨기지 않습니다 → Inspector에 출처 명시
- [ ] 기존 비교 화면과 인비디어스 worktree 동작 보존
- [ ] 미커밋 FFmpeg 재인코딩 변경을 복사하거나 되돌리지 않습니다
- [ ] 한 커밋에 하나의 작업 패킷, 커밋 메시지 한국어

### 10.2 기술 리스크

| 리스크 | 영향 | 완화 |
|---|---|---|
| `useWindowDimensions` 초기값 0 (static export) | 첫 렌더 레이아웃 시프트 | `+html.tsx` 인라인 스크립트로 `data-layout` 선세팅 |
| NativeWind에서 CSS Grid 미지원 | Bento 레이아웃 구현 난이도 | flex 기반 2열 구현, 웹 전용 `style={{display:'grid'}}`은 `Platform.OS==='web'` 가드 |
| `expo-blur` 성능 (저사양 Android) | 프레임 드랍 | Android는 블러 대신 불투명 surface |
| iOS 26 Liquid Glass 9월 마감 | 심사 이슈 가능성 | 단계 5를 앞당겨 실행. SwiftUI API를 쓰지 않으므로 "크롬이 어색하지 않은 수준"이 현실적 목표 |
| 폰트 번들 증가 | 웹 초기 로딩 | Variable 폰트 1종 + 서브셋. `font-display: swap` |
| 비교 화면 1438줄 해체 | 회귀 위험 | URL 파라미터 진입, clipStatus 필터, 관리자 액션에 대해 수동 회귀 시나리오를 먼저 문서화한 뒤 착수 |
| 타임라인 Reanimated + 웹 | 데스크톱 줌 구현 시 웹/네이티브 동작 차이 | 줌은 상태 기반(스케일 값)으로 구현하고 제스처는 플랫폼별로 분기 |
| 색상 전면 교체 | 대비 회귀 | 단계 1 직후 라이트/다크 전 화면 캡처 비교 (`design-qa.md` 형식) |
| **비교 콘텐츠 8곡뿐** | 새 비교 화면이 아무리 좋아도 볼 게 없음. 홈 히어로가 금방 반복됨 | 설계로는 못 풉니다. **콘텐츠 확보가 선행 과제**입니다. UI에서는 "비교 가능" 필터와 요청 기능(기능 제안서)으로 완충 |
| **작품 목록 566KB 단일 응답** | 바흐/슈베르트 선택 시 파싱·렌더 지연, 모바일 메모리 | 가상화 + 캐싱으로 완화하되 근본은 백엔드 pagination (B15) |
| **`ComparisonPerformance` 계약 미구현** | `clipStatus` 게이팅·credit Inspector 설계가 현재 작동 불가 | 조건부 스펙으로 격리. 자리만 만들고 필드 추측 금지 |
| **`category` 한글/영문 혼입** | 필터 칩이 `피아노`와 `pianist`로 쪼개져 보임 | 클라이언트 alias 매핑으로 흡수 + 백엔드 정규화 요청 (B17) |
| **공연 목록 필드 누락** | 카드에 출연진·가격이 빈 값으로 렌더 | 목록/상세 표시 필드를 분리 정의 (7.3) |

### 10.3 하지 말아야 할 것

- 재생 방식(웹 클립 서버 / 네이티브 YouTube IFrame) 변경 — 별도 승인 사항
- 백엔드 응답에 없는 필드를 UI에서 가정하고 임시 값으로 채우기
- 화면 파일을 플랫폼별로 통째 복제 (뷰 컴포넌트만 분리)
- 시대 색을 버튼·보더·포커스 링 등 UI 크롬에 사용
- 액센트 색을 장식으로 사용 (선택·주요 액션에만)

---

## 부록 A. 참고 자료

- [Astryx Design System (Meta)](https://astryx.atmeta.com/) · [Introducing Astryx](https://astryx.atmeta.com/blog/introducing-astryx) · [How Astryx works](https://astryx.atmeta.com/blog/how-astryx-works) · [Components](https://astryx.atmeta.com/components) · [facebook/astryx (GitHub)](https://github.com/facebook/astryx)
- [Astryx Design System for Figma v0.1](https://www.figma.com/community/file/1661363854016665156/astryx-design-system-for-figma-v0-1) · [Astryx Library (Community)](https://www.figma.com/community/file/1659998707120781098/astryx-library-community)
- [Meta Open-Sources Astryx (MarkTechPost)](https://www.marktechpost.com/2026/07/21/meta-open-sources-astryx-an-agent-ready-react-design-system-with-150-accessible-components-seven-themes-and-a-cli/) · [Better Stack 가이드](https://betterstack.com/community/guides/ai/astryx-meta-design-system/)
- [The Linear, Vercel, and Raycast Aesthetic (Studio Maydit)](https://studiomaydit.com/blog/linear-vercel-raycast-aesthetic)
- [Raycast Design System — Colors, Typography & Tokens](https://oh-my-design.kr/design-systems/raycast) · [Refero Styles: Raycast](https://styles.refero.design/style/3b6a17f0-3bdf-418c-a95e-0b89e5a8b2f8)
- [Aside AI browser review (eesel AI)](https://www.eesel.ai/blog/aside-ai-browser-review) · [Aside Help Center — Changelog](https://docs.aside.com/changelog/native)
- [Apple: 새로운 소프트웨어 디자인 발표 (Liquid Glass)](https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/) · [iOS 26 Roundup (MacRumors)](https://www.macrumors.com/roundup/ios-26/) · [Liquid Glass 채택률 (Geeky Gadgets)](https://www.geeky-gadgets.com/apple-liquid-glass-adoption-rate/)
- [UX/UI design trends for 2026 (Envato Elements)](https://elements.envato.com/learn/ux-ui-design-trends) · [App Design Trends 2026 (Intuitia)](https://www.intuitia.tech/blog/app-design-trends)
- [Breakpoints in responsive web design: 2026 guide (Framer)](https://www.framer.com/blog/responsive-breakpoints/) · [Responsive Web Design: A Complete Guide 2026 (Scrimba)](https://scrimba.com/articles/responsive-web-design-a-complete-guide-2026-2/)
- [Expo: Platform-specific extensions and modules](https://docs.expo.dev/router/advanced/platform-specific-modules/) · [Media Queries with React Native (Expo Blog)](https://blog.expo.dev/media-queries-with-react-native-for-ios-android-and-web-e0b73ed5777b)
- [IDAGIO](https://www.idagio.com/us)

## 부록 B. 파일별 작업 인덱스

| 파일 | 작업 단계 | 요약 |
|---|---|---|
| `global.css` | 1.1 | 색상 변수 전면 교체 |
| `tailwind.config.js` | 1.3 | 색상·타이포·반경·모션 확장 |
| `lib/theme.ts` | 1.2 | `lib/design/tokens.ts` 파생으로 변경 |
| `lib/data/periods.ts` | 1.4 | `ERA_COLORS`를 `era-palette.ts` 재수출로 |
| `components/ui/text.tsx` | 2.1 | variant 전면 교체 |
| `components/ui/button.tsx` | 2.4 | size `xs`, density, `subtle` variant |
| `components/ui/card.tsx` | 2.4 | 더블링, `interactive` |
| `components/ui/input.tsx` | 2.4 | density, 아이콘 prop |
| `components/sector-chip.tsx` | 2.2 | `ui/chip.tsx`로 흡수 후 삭제 |
| `components/optimized-image.tsx` | 2.3 | 스켈레톤 통합, `#f0f0f0` 제거 |
| `components/StarRating.tsx` | 2.x | 토큰화 |
| `app/+html.tsx` | 3.3 | 레이아웃 선세팅 스크립트, 폰트 preload |
| `app/(tabs)/_layout.tsx` | 5.2 | 하드코딩 색상 토큰화, 블러 크롬 |
| `app/(tabs)/_layout.web.tsx` | 3.2 | **신규** 웹 셸 분기 |
| `app/(tabs)/compare.tsx` | 4.1 | 재설계 + 7파일로 분해 |
| `app/(tabs)/home.tsx` | 4.2 | 인사말 제거, 히어로, Bento, 레거시 변환 제거 |
| `app/(tabs)/artists.tsx` | 4.3 | FlatList, 필터 칩, 데스크톱 테이블 |
| `app/(tabs)/concerts.tsx` | 4.4 | 필터 패널, Select 교체, 랭킹 토큰화 |
| `app/artist/[id].tsx` | 4.5 | 공통 상세 골격 + 탭 |
| `app/composer/[id].tsx` | 4.5 | 공통 상세 골격 + 탭 |
| `app/concert/[id].tsx` | 4.5 | 좌 포스터 + 우 정보, 하단 CTA |
| `app/(tabs)/timeline.tsx` | 4.6 | 로테이션 제거, 줌, 다크모드 단일화, 데스크톱 |
| `app/my-page.tsx` | 4.7 | 데스크톱 2열 |
| `app/(auth)/*` | 4.7 | 폭 제한, 스플릿 |
| `components/admin/*` | 4.8 | 공통 FormModal, 슬라이드오버 |
| `components/OnboardingModal.tsx` | 4.9 | 인라인 카드로 축소 |
| `components/performance-video-player.tsx` | — | **재생 로직 변경 금지**, 포스터 래퍼만 |
| `components/artist-comparison-section.tsx` | 4.5 | 빈 배열이면 섹션 숨김 (버그 D2) |
| `lib/design/artist-category.ts` | 2.x | **신규** category 라벨·alias 매핑 (C5) |
| `components/ui/icons/` | 2.x | **작업 완료** 고유 아이콘 9종 + `createClassicIcon`. 4.7절 |
| `components/ui/fallback-art.tsx` | 2.x | **신규** 폴백 타일 (C10). 목록의 절반 이상이 이 상태 |

## 부록 C. 2026-09-12 데이터 조사 재현 방법

```bash
API="https://api.kang1027.com/classicmap/api"   # .env의 EXPO_PUBLIC_API_URL

# 규모
curl -s "$API/composers?offset=0&limit=1000" | python3 -c "import sys,json;print(len(json.load(sys.stdin)))"
curl -s "$API/artists?offset=0&limit=1000"   | python3 -c "import sys,json;print(len(json.load(sys.stdin)))"

# 비교 보유 곡 전수 (limit과 무관하게 최대 8건)
curl -s "$API/composers/with-performances?limit=30"

# 곡별 섹터와 섹터당 연주 수
curl -s "$API/pieces/226/sectors"
curl -s "$API/sectors/14/performances"

# 작품 목록 크기 (바흐)
curl -s -o /dev/null -w "%{size_download} bytes %{time_total}s\n" "$API/composers/4/pieces"

# 계약 미구현 확인 (전부 404 또는 빈 배열)
curl -s "$API/pieces/226/comparison-sectors"
curl -s "$API/sectors/14/comparison-performances"
curl -s "$API/artists/187/comparison-performances?limit=3"
curl -s "$API/periods"

# 지역 값 불일치 (D1)
curl -s "$API/concerts/areas"
```

---

## 부록 D. 시안 검증에서 확정된 레이아웃 규칙

시안(`classicmap-mockup.html`)을 브라우저에 띄우고 DOM을 실측하면서 잡은 문제들입니다. **정적으로 코드만 읽어서는 전부 놓쳤던 것들이라**, 구현 단계에서도 같은 방식의 실측 검증을 권합니다.

| # | 증상 | 원인 | 규칙 |
|---|---|---|---|
| D-1 | 공연 탭이 프레임 밖 **522px**까지 밀림. 카드 폭이 323 / 259 / 198 / 188 / 307로 제각각 | `repeat(5, 1fr)`. `1fr`은 `minmax(auto, 1fr)`이라 **콘텐츠 최소 폭 아래로 줄지 않습니다.** 제목에 `white-space: nowrap`이 걸려 있어 최소 폭이 커짐 | 그리드 컬럼은 **항상 `minmax(0, 1fr)`** |
| D-2 | 탭마다 플레이어 바 폭이 달라지고 우측 A/B 토글이 화면 밖으로 밀림 | D-1의 그리드가 부모 폭을 밀어냄 | 상동. 셸 폭은 콘텐츠와 독립이어야 합니다 |
| D-3 | 공연 탭 세로 **1,517px**, 모바일 본문 **197px**가 통째로 안 보임 | 스크롤 컨테이너에 `overflow: hidden` | 스크롤 영역은 `overflow-y: auto`. 스크롤바를 숨기고 싶으면 `scrollbar-width: none`을 쓰지 `hidden`을 쓰지 않습니다 |
| D-4 | 소개 이미지가 2.86배 확대되고 83%가 잘림 | 세로 1:2.8 원본에 `aspect-ratio: 3/4` + `cover` | 7.7절 소개 이미지 정책 |
| D-5 | 목록 2행의 메타 줄만 잘림 | 스크롤 영역 하단 패딩 부족 | 스크롤 컨테이너 하단 패딩 **40px** |
| D-6 | 미디어 쿼리 안의 값이 본문 수정을 따라오지 않음 (`.pl-l{width:190px}`이 296px 재작성 후에도 남음) | 브레이크포인트별 중복 정의 | 값 수정 시 **같은 속성의 미디어 쿼리 선언을 함께 검색**합니다 |
| D-7 | 인라인 스타일이 전역 규칙을 덮어씀 (모바일 A/B 버튼 26px가 36px 규칙을 무시) | 인라인 우선순위 | 픽셀 규칙은 클래스로 두고 인라인으로 덮지 않습니다 |
| D-8 | 아바타 한 칸만 빈 원으로 표시 | 이미지 URL이 **404 HTML 문서인데 확장자가 `.jpg`** | 이미지 파이프라인에서 **매직 바이트(JPEG `FF D8`)를 검사**합니다 |
| D-9 | 폴백 타일만 아랫변이 짧아 보임 | 그라디언트 끝색이 배경과 거의 같은 명도 | 폴백 그라디언트 끝색은 배경보다 **명도를 올립니다** |
| D-10 | `안스네스 → "안스"` | 이니셜을 앞 두 글자로 자름 | 이니셜은 **성(姓)** 기준 |

**검증 절차**: 게시 → 브라우저에서 렌더 → `getBoundingClientRect` / `scrollWidth` vs `clientWidth` / 이미지 `naturalWidth` 대비 렌더 배율을 숫자로 측정 → 수정 → 재검증. 스크린샷만으로는 축소 캡처 아티팩트와 실제 깨짐을 구분할 수 없습니다.

---

## 부록 E. 시안 참조

| 산출물 | 링크 | 내용 |
|---|---|---|
| 화면 시안 | https://claude.ai/artifact/76B94Zm7nS7fdsY2Mg7dWa | 데스크톱 6종(비교 · 홈 · 작곡가 · 공연 · 공연 상세 · 탐색/정렬) + 모바일 4종(홈 · 비교 · 작곡가 · 공연). 실제 API 데이터와 실제 이미지를 인라인으로 넣은 정적 HTML |
| 아이콘 가이드 | https://claude.ai/artifact/FsnrRqM67HjKw67hvmfnwQ | 4.7절의 근거. 고유 아이콘의 기하·크기·금지 사항 |

- 시안의 데이터는 **2026-09-16 기준 프로덕션 API 실응답**입니다. 공연은 KOPIS 원본, 비교 화면은 실제 연주 3건(임윤찬 1:41 / 랑랑 2:28 / 유자 왕 1:32)입니다.
- 시안은 **레이아웃과 시각 언어의 기준**이며 구현 코드가 아닙니다. 픽셀 값은 4장 토큰과 4.7절 규격을 따릅니다.

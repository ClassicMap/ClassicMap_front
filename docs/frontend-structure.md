# 프론트엔드 구조와 컴포넌트 규칙

2026-11-12 조사와 시험을 근거로 정한 디렉토리 구조, 컴포넌트 작성 규칙, 셸 설계입니다.
이후 작업은 이 문서를 따릅니다. 짧은 요약은 `CLAUDE.md` 에 있습니다.

## 1. 조사한 사례

실제 저장소 파일을 읽어 확인한 것만 적습니다. 괄호 안은 근거 경로입니다.

### 1.1 shadcn/ui (Base UI 판) — `shadcn-ui/ui@8ab27715`

- 앱 구조는 `components/ui`(프리미티브), `components/`(앱 컴포넌트), `hooks/`, `lib/utils.ts` 입니다. `components.json` 의 별칭은 `components`, `ui`, `lib`, `hooks`, `utils` 다섯 개입니다 (`apps/v4/content/docs/installation/manual.mdx`, `apps/v4/public/schema.json`).
- Base UI 판의 `style` 값은 `base-<스타일>` 입니다(문서 예시는 `base-nova`). 저장소 안에서는 `apps/v4/registry/bases/{base,radix,aria}` 로 갈립니다.
- Base UI 판 컴포넌트는 모두 같은 방식으로 씁니다 (`apps/v4/registry/bases/base/ui/*.tsx`).
  - `@base-ui/react/<부품>` 서브패스에서 가져옵니다.
  - `function` 선언만 쓰고 `forwardRef` 는 없습니다. 파일 끝에서 `export { ... }` 한 번으로 내보냅니다.
  - 모든 파트에 `data-slot="<kebab-case 이름>"` 을 붙입니다.
  - 타입은 `Primitive.Part.Props` 입니다. Content 는 `Popup.Props & Pick<Positioner.Props, 'align' | 'alignOffset' | 'side' | 'sideOffset'>` 로 받아 위치 값만 Positioner 로 넘깁니다.
  - 팝오버·셀렉트·툴팁·메뉴는 Portal → Positioner → Popup 순서로 감싸고, 다이얼로그·시트는 Portal → Backdrop + Popup 입니다.
  - `asChild` 대신 `render` 를 씁니다. 버튼이 아닌 요소로 바꾸면 `nativeButton={false}` 를 붙입니다 (`skills/shadcn/rules/base-vs-radix.md`).
  - `cva` 는 variant 가 있는 프리미티브(`button`, `sidebarMenuButtonVariants`)에만 쓰고, 파일 맨 위에 두고 컴포넌트와 함께 내보냅니다.
  - 상태 스타일은 data 속성 variant 로 겁니다(`data-open`, `data-closed`, `data-[side=…]`, `data-starting-style`, `data-ending-style`, `data-disabled`, `data-popup-open`).
- 겹침 순서: 오버레이는 전부 `z-50` 한 값이고 Positioner 가 `isolate z-50` 을 고정으로 받습니다. 사이드바는 `z-10`, 가장자리 띠(rail)는 `z-20` 입니다. "오버레이에 z-index 를 따로 주지 말라"는 규칙이 있습니다 (`skills/shadcn/rules/styling.md`).
- Sidebar (`bases/base/ui/sidebar.tsx`)
  - `SidebarProvider` 한곳이 `state`, `open`, `openMobile`, `isMobile`, `toggleSidebar` 를 가집니다. 폭은 상수(`SIDEBAR_WIDTH` 16rem, `SIDEBAR_WIDTH_ICON` 3rem)를 CSS 변수로 내립니다. 단축키는 ⌘/Ctrl+B 입니다.
  - 좁으면(`use-mobile`, 768px) `Sheet` 로 바뀝니다. 접는 방식은 `offcanvas | icon | none` 입니다.
  - `SidebarMenuButton` 은 `isActive` → `data-active`, `tooltip` 은 접힌 데스크톱에서만 보입니다. `SidebarRail` 은 `tabIndex={-1}` 인 버튼입니다. 본문은 `SidebarInset`(`<main>`)입니다.

### 1.2 Base UI — `@base-ui/react` 1.9.0 (`mui/base-ui`, base-ui.com)

- 패키지 이름은 `@base-ui/react` 이고 최신 안정 버전은 1.9.0(2026-10-09)입니다. 옛 이름 `@base-ui-components/react` 는 "renamed" 로 deprecated 입니다. peer 는 `react`·`react-dom` 17~19 입니다.
- 파트 구조
  - Popover: Root > Trigger / Portal > Backdrop / Positioner > Popup > Arrow·Title·Description·Close. `modal` 기본값 false.
  - Dialog: Root > Trigger / Portal > Backdrop / Viewport > Popup > Title·Description·Close. `modal` 기본값 true(포커스 가두기, 스크롤 잠금).
  - Tooltip: Provider > Root > Trigger / Portal > Positioner > Popup > Arrow. 터치 기기에서는 꺼집니다.
  - Select: Root > Trigger(Value, Icon) / Portal > Positioner > Popup > List > Item(ItemText, ItemIndicator). `alignItemWithTrigger` 기본값 true.
  - Slider: Root > Control > Track > Indicator·Thumb. Thumb 안에 `<input type="range">` 가 있습니다. 값은 숫자 하나 또는 배열입니다.
- 키보드·포커스: Esc 닫기, 닫힌 뒤 트리거로 포커스 복귀(`finalFocus`), 열릴 때 첫 요소로 이동(`initialFocus`), 목록의 화살표·Home·End·타입어헤드, 슬라이더의 화살표(`step`)·Shift+화살표·PageUp/Down(`largeStep`)·Home/End 를 프리미티브가 처리합니다.
- 포털은 `<body>` 에 붙습니다. React Native 는 지원하지 않습니다(이슈 #2612, DOM 요소·`react-dom`·`@floating-ui/react-dom` 전제).

### 1.3 react-native-reusables / @rn-primitives — `founded-labs/react-native-reusables@385834c2`, `roninoss/rn-primitives@1bebe66b`

- reusables 는 shadcn 과 같은 구조(`components/ui`, `lib/utils.ts`, `lib/theme.ts`, 같은 별칭 5개)를 Expo 에서 씁니다. 루트 레이아웃 마지막에 `<PortalHost />` 를 둡니다.
- 컴포넌트는 한 파일 안에서 `Platform.select({ web, native })` 로 클래스를 가르고, 글자색은 `TextClassContext` 로 내립니다.
- `@rn-primitives/*` 는 JS 전용입니다(네이티브 코드 없음). 웹에서는 Radix 를 감쌉니다. 패키지 안에서 `x.tsx`(네이티브) + `x.web.tsx`(웹) + `types.ts`(공유 타입)로 나누고 두 파일이 같은 이름을 내보냅니다.
- 네이티브 `@rn-primitives/slider` 는 끌기를 구현하지 않습니다(접근성 동작만). reusables 에는 slider·sheet·sidebar 가 없습니다.
- Base UI 판은 두 저장소 어디에도 없습니다(rn-primitives 이슈 #115 가 열려 있을 뿐). 웹 구현은 직접 써야 합니다.

### 1.4 폴더 구조 사례

| 저장소 | 기능 폴더 | ui 폴더 | 훅·lib | 플랫폼 파일 |
|---|---|---|---|---|
| `satnaing/shadcn-admin` | `features/<이름>/{components,data}` | `components/ui`, `components/layout` | `hooks`, `lib` | — |
| `langfuse/langfuse` (web) | `features/<이름>/{components,hooks,lib,…}` 약 100개 | `components/ui` 에 앱 전용이 섞임 | 공용 `hooks`, 기능 훅은 기능 안 | — |
| `formbricks/formbricks` | `modules/<이름>/{components,hooks,lib}` | `modules/ui/components` | 기능 안 | — |
| `vercel/chatbot` | `components/chat` 한 폴더 | `components/ui` 순정만 | 루트 `hooks`, `lib` | — |
| `midday-ai/midday` | 평평한 `components` + 이름 접두어 | `packages/ui` | `hooks` 평평 | — |
| `obytes/react-native-template-obytes` | `features/<이름>/{*-screen.tsx,components,api.ts}` | `components/ui` | `lib/hooks`, `lib/{api,auth,i18n}` | 안 씀 |
| `bluesky-social/social-app` | `screens/`, `features/<이름>/{components,hooks}` | 없음 | `lib/hooks`, 기능 안 `hooks/` | `index.tsx` + `index.web.tsx` + `types.ts`, 플랫폼별 tsc |
| `expo/expo` 기본 템플릿 | 없음 | `components/ui` | `hooks`, `constants` | `foo.tsx` + `foo.web.tsx` |
| reusables showcase | 없음 | `components/ui` | `hooks`, `lib` | `Platform.select` |

가져온 결론은 다음과 같습니다.

- shadcn 계열은 kebab-case 파일 이름, named export, 별칭 5개가 공통입니다.
- 컴포넌트가 150개쯤 되는 곳은 기능 폴더(`features/<이름>/{components,hooks,lib}`)로 나눕니다. 평평하게 두는 곳은 midday 뿐입니다.
- expo-router 의 `app/` 에는 라우트만 둡니다. 플랫폼 파일은 `app/` 밖에 두는 것이 공식 규칙입니다 (`expo/expo docs/pages/router/advanced/platform-specific-modules.mdx`).
- 접미어 없는 파일이 네이티브, 웹은 `.web` 입니다. 구현이 통째로 갈리는 컴포넌트는 bluesky 처럼 폴더 하나에 `index.tsx` + `index.web.tsx` + `types.ts` 를 둡니다.
- `src/` 는 쓰지 않습니다(reusables showcase, 지금 구조와 같음).

### 1.5 음악 앱 셸

| | `jeffvli/feishin` | `nukeop/nuclear` | `leerob/next-music-player` | `koel/koel` |
|---|---|---|---|---|
| 영역 | grid 2단(행: 본문·재생바, 열: 사이드바·본문·오른쪽) | grid 2단 | flex + fixed 재생바 | flex 2단 |
| 크기 | CSS 변수·상수 | TS 상수 + 스토어 | 클래스에 직접 | `:root` CSS 변수 |
| 레이아웃 상태 | 앱 스토어의 `sidebar` 조각(persist), 재생 스토어와 분리 | 전용 `layoutStore`(persist) | 없음 | 흩어져 있음 |
| 재생바가 본문을 안 덮는 법 | grid 행 | grid 행 | 화면마다 `pb-[69px]` | flex 형제 |
| 좁은 화면 | 768px, 레이아웃 교체 + 서랍 + 미니 재생바 | — | 좌우 패널 숨김 | 768px, 서랍 + 전체 폭 시트 |

- 영역은 한 파일에서 정하고, 재생바는 본문과 같은 흐름(행·형제)에 둡니다. fixed 로 띄운 곳만 화면마다 여백을 반복합니다.
- 본문만 스크롤합니다(셸은 화면 높이 고정, 가운데 칸 `min-h-0` + `overflow`).
- 레이아웃 상태(접힘·열림·폭)는 재생 상태와 다른 스토어에 두고 브라우저에 남깁니다.
- z-index 단계표를 한곳에 둔 사례는 없었습니다. 순서는 대체로 본문 < 사이드바 < 재생바 < 팝오버 < 전체 화면 < 툴팁입니다. 이 프로젝트는 단계표를 직접 정합니다(5절).
- 접근성은 koel 이 가장 충실합니다(landmark, `role="slider"` 시크바). 재생 버튼 이름표와 슬라이더 role 은 이 프로젝트가 이미 갖고 있어 유지합니다.

## 2. Base UI 시험 결과

`@base-ui/react` 1.9.0 을 지금 웹 빌드(`expo export`, react-native-web 0.21 + NativeWind 4)에 넣어 팝오버·툴팁·슬라이더·다이얼로그·셀렉트를 시험했습니다.

| 항목 | 결과 |
|---|---|
| 번들 | Metro 0.83 이 패키지의 `imports` 필드를 버려 `#prehydration/…` 을 못 찾습니다. `metro.config.js` 의 `resolveRequest` 로 그 경로만 풀어 주면 통과합니다. |
| 정적 렌더 | `expo export` 의 서버 렌더 단계를 통과합니다. |
| 스타일 | DOM 파트의 `className` 과 `data-[…]` variant 가 NativeWind 웹 CSS 로 그대로 먹습니다. 다크 모드 변수도 `<body>` 포털에서 이어집니다. |
| 포털·겹침 | `#root` 밖 `<body>` 에 붙고 Positioner 의 `z-50` 으로 재생바(40) 위에 뜹니다. |
| 포커스·키보드 | 열릴 때 첫 요소로 이동, Esc 로 닫히고 트리거로 복귀, 다이얼로그 포커스 가두기, 셀렉트 화살표·Enter, 슬라이더 화살표·누르기 모두 정상입니다. |
| RN 요소를 트리거로 | `render={<Button />}` 를 그대로 주면 열리지 않습니다. react-native-web 의 `Pressable` 이 `onClick` 을 자기 것으로 덮고 `data-*` 를 버리기 때문입니다. `onClick` → `onPress`, `data-*` → `dataSet` 으로 이어 주면 클릭·Enter·Space·바깥 클릭·포커스 복귀가 정상입니다. |
| 팝업 안 RN 요소 | `View`·`Text` 를 그대로 넣을 수 있습니다. |

결론: **웹 구현은 Base UI 로, 앱 구현은 @rn-primitives 로 합니다.** 두 구현은 같은 파트 이름과 props 를 가집니다(4.3절).

## 3. 디렉토리

```
app/                      라우트만. 화면 조립은 여기서, 조각은 아래에서 가져옵니다
components/
  ui/                     앱 사정을 모르는 프리미티브 (shadcn 규칙)
  shared/                 두 기능 이상이 쓰는 앱 공용 조각 (entity-thumb, cards, shelf, icons/ …)
  layout/                 셸: 사이드바·상단바·재생바 자리·대기열 자리·탭 레이아웃
features/
  <기능>/
    components/           그 기능의 컴포넌트
    hooks/                그 기능에서만 쓰는 훅
    lib/                  그 기능에서만 쓰는 함수·상수
hooks/                    공용 훅 (use-breakpoint, use-auth, use-debounce …)
lib/                      공용 코드
  api/ query/ data/       서버 통신, 쿼리 훅(lib/query/hooks), 화면 모델 변환
  player/                 재생 엔진(스토어·재생 목록·자동 재생)
  layout/                 셸의 크기와 상태(shell-layout, shell-state)
  design/ i18n/ navigation/ utils/
  utils.ts theme.ts
types/                    공용 타입(models.ts)과 전역 선언(*.d.ts)
```

기능 폴더는 `account, admin, album, artist, auth, compare, composer, concert, film, home, library, onboarding, piece, player, profile, search, timeline` 입니다.

### 배치 규칙

1. `components/ui` 에는 도메인(작곡가·연주·재생)을 모르는 프리미티브만 둡니다. 도메인 타입·API·스토어를 가져오면 ui 가 아닙니다.
2. `components/` 루트에는 파일을 두지 않습니다. `ui`, `shared`, `layout` 중 하나에 넣습니다.
3. 한 기능에서만 쓰면 그 기능 폴더에, 두 기능 이상이 쓰는 표시 조각은 `components/shared` 에 둡니다. 특정 기능의 데이터·상태에 묶인 조각(예: 즐겨찾기 버튼)은 다른 기능이 쓰더라도 그 기능에 두고 경로로 가져다 씁니다.
4. 훅·함수도 같습니다. 한 기능에서만 쓰면 `features/<기능>/{hooks,lib}`, 공용만 최상위 `hooks/`·`lib/` 입니다.
5. 서버 데이터 계층(`lib/api`, `lib/query/hooks`, `types/models.ts`)과 재생 엔진(`lib/player`)은 여러 기능이 함께 쓰므로 공용에 둡니다.
6. 의존 방향은 `app → components/layout → features → components/shared → components/ui → hooks·lib·types` 입니다. 아래쪽이 위쪽을 가져오지 않습니다. 기능끼리는 경로로 직접 가져올 수 있습니다.
7. 파일 이름은 kebab-case 입니다. 묶음 파일(`index.ts`)은 만들지 않습니다(아이콘 묶음 `components/shared/icons` 와 플랫폼 폴더의 `index.tsx` 만 예외).
8. export 는 named 만 씁니다. `export default` 는 expo-router 가 요구하는 `app/` 라우트 파일에만 씁니다.
9. 플랫폼별 구현은 `app/` 밖에 둡니다. 접미어 없는 파일이 네이티브(또는 공통), 웹은 `.web.tsx` 입니다. 짝 파일은 늘 함께 옮깁니다.

## 4. 컴포넌트 작성 규칙

### 4.1 공통

- `function` 선언으로 쓰고 `forwardRef` 는 쓰지 않습니다(React 19 는 `ref` 가 prop 입니다).
- `className` 은 `cn()` 으로 합치고 마지막에 받은 `className` 을 둡니다.
- 화면 문구는 `t()` 로 감싸고, 문구를 그리는 컴포넌트는 `useLocale()` 을 부릅니다 (`lib/i18n/README.md`).
- variant 가 있으면 `cva` 를 파일 맨 위에 두고 `<이름>Variants` 로 컴포넌트와 함께 내보냅니다. variant 가 없으면 `cva` 를 쓰지 않습니다. `cva` 는 `components/ui` 에서만 씁니다.
- 웹 전용 클래스는 `Platform.select({ web: '…' })` 로 가릅니다(한 파일로 두 플랫폼을 그리는 프리미티브).
- Tailwind 는 v3 입니다. shadcn 원문의 v4 문법은 v3 로 옮깁니다: `data-open:` → `data-[open]:`, `origin-(--transform-origin)` → `origin-[var(--transform-origin)]`, `outline-hidden` → `outline-none`, `size-*` 는 그대로.

### 4.2 ui 프리미티브

- 파트 이름은 shadcn Base UI 판과 같게 합니다(`Popover`, `PopoverTrigger`, `PopoverContent`, `PopoverHeader`, `PopoverTitle`, `PopoverDescription` …).
- 파일 끝에서 `export { … }` 한 번으로 내보냅니다. 웹 구현(Base UI)의 파트에는 `data-slot` 을 붙입니다.
- 요소를 바꿔 끼울 때는 `asChild` 가 아니라 `render` 를 씁니다: `<PopoverTrigger render={<Button variant="ghost" />}>…</PopoverTrigger>`.
- 위치 값(`side`, `align`, `sideOffset`, `alignOffset`)은 Content 가 받습니다.
- 열림 상태는 `open` / `defaultOpen` / `onOpenChange` 로 다룹니다. 트리거 ref 의 `open()`·`close()` 는 쓰지 않습니다.
- 오버레이(팝오버·셀렉트·툴팁·다이얼로그·시트)에는 `z-overlay` 가 이미 들어 있습니다. 쓰는 쪽에서 z-index 를 더하지 않습니다.

### 4.3 웹·앱 구현이 갈리는 프리미티브

포커스·포털·키보드를 프리미티브가 맡는 것(popover, select, dialog, sheet, tooltip, slider)은 폴더로 둡니다.

```
components/ui/popover/
  index.tsx        앱 구현
  index.web.tsx    웹 구현 (@base-ui/react)
  types.ts         두 구현이 함께 쓰는 props 타입
```

- 두 파일은 같은 이름을 내보내고, 각 파트의 props 는 `types.ts` 의 타입을 씁니다. 한쪽에서만 뜻이 있는 prop 은 타입에 두고 주석으로 `웹 전용` / `앱 전용` 을 적습니다.
- 가져오는 쪽은 `@/components/ui/popover` 하나만 씁니다. 타입 체크(`tsc`)는 앱 구현을 기준으로 호출부를 보므로, 두 구현이 `types.ts` 를 함께 쓰는 것이 어긋남을 막는 장치입니다. 한쪽 구현에만 있는 export 를 만들지 않습니다(필요하면 `context.tsx`·`overlay.ts` 처럼 따로 파일로 뺍니다).
- 웹 트리거에 RN 요소를 넘길 때는 `components/ui/lib/render-pressable.ts` 가 `onClick` → `onPress`, `data-*` → `dataSet` 을 이어 줍니다(2절). 넘기는 요소는 `<button>` 으로 그려지는 것(`Button`, `accessibilityRole="button"` 인 `Pressable`)이어야 하고, 아니면 `nativeButton={false}` 를 줍니다.
- 앱 구현은 무엇으로 하나
  - popover·select: `@rn-primitives`.
  - dialog·sheet: RN `Modal`. 지금까지 화면들이 쓰던 것이라 뒤로 가기·시스템 모달 동작이 그대로입니다.
  - slider: 직접 그린 끌기(`PanResponder`). `@rn-primitives/slider` 는 끌기를 구현하지 않습니다.
  - tooltip: 트리거만 그립니다. 툴팁은 마우스·키보드 포커스에 뜨는 것이라 터치 화면에는 띄우지 않습니다(Base UI 도 같습니다). 그래서 트리거에는 늘 접근성 이름을 따로 줍니다.
- 웹 구현 기준 타입 체크(bluesky 의 `moduleSuffixes` 방식)는 넣지 않았습니다. `react-native-svg` 의 웹 타입이 달라 기존 코드에서 222건이 걸립니다.

## 5. 겹침 순서

값은 `tailwind.config.js` 의 `zIndex` 와 `lib/design/layers.ts` 한곳에서 정합니다. 숫자를 직접 쓰지 않습니다.

| 이름 | 값 | 쓰는 곳 |
|---|---|---|
| `raised` | 10 | 화면 안에서 살짝 뜨는 것(붙는 머리줄, 카드 위 단추) |
| `rail` | 20 | 사이드바 가장자리 띠 |
| `floating` | 30 | 모바일 미니 플레이어, 화면 이동 진행 막대 |
| `player` | 40 | 앱의 영상 자리 |
| `overlay` | 50 | 팝오버·셀렉트·툴팁·다이얼로그·시트·빠른 검색. 서로는 나중에 열린 것이 위입니다 |
| `fullscreen` | 2147483000 | 전체 화면 영상 |

셸의 영역(사이드바·본문·대기열·재생바)은 같은 흐름에 놓이므로 z-index 를 쓰지 않습니다.

## 6. 셸

```
AppShell (components/layout/app-shell.tsx)      영역에 무엇을 넣을지 정합니다
└ Shell                 화면 높이에 고정. 세로로 [ShellBody | ShellFooter]
   ├ ShellBody          가로로 [사이드바 | ShellMain | ShellAside]
   │  ├ AppSidebar      Sidebar 파트(sidebar.tsx)로 조립한 메뉴·레퍼토리
   │  ├ ShellMain       상단바 + 본문(여기만 스크롤)
   │  └ ShellAside      오른쪽 대기열 자리. 열면 본문을 밀어냅니다
   └ ShellFooter        하단 재생바 자리. 화면 폭 전체
```

- 영역은 `components/layout/shell.tsx`, 크기는 `lib/layout/shell-layout.ts`(사이드바 232 / 접힘 60, 대기열 320, 재생바 76, 간격 8), 상태는 `lib/layout/shell-state.ts` 한곳씩에서 정합니다.
- 레이아웃 상태는 재생 상태(`lib/player`)와 나눕니다. `shell-state` 가 사이드바 접힘(`classicmap.sidebar-collapsed`), 넓은 창의 대기열 열림(`classicmap.player.queue-open`), 좁은 화면의 대기열 시트 열림(남기지 않음)을 가집니다. 재생바의 대기열 단추와 미니 플레이어가 이 값을 봅니다.
- 재생바가 보일 조건은 `features/player/components/player-bar-helpers.ts` 의 `usePlayerBarVisible` 한곳입니다. 셸은 보일 때만 재생바 자리를 둡니다.
- 사이드바는 shadcn Sidebar 의 파트(`Sidebar`, `SidebarLink`, `SidebarAction`, `SidebarRail`, `SidebarTooltip`, `SidebarTrigger`)를 따릅니다. ⌘/Ctrl+B 로 접고 펴고, ↑↓·Home·End 로 메뉴 사이를 옮기며, 지금 위치는 `aria-current="page"` 입니다.
- 좁은 화면(1024px 미만)은 하단 탭 + 미니 플레이어를 유지합니다. 조사한 사례 다수는 서랍이지만, 음악 앱(스포티파이·애플 뮤직·유튜브 뮤직)의 모바일 앱이 모두 하단 탭이라 서랍으로 바꾸지 않기로 했습니다(2026-11-13 결정).
- 영상 요소(`ComparePlayerHost`)는 셸 밖 루트(`root-chrome`)에 같은 key 로 남깁니다. 창 폭이 바뀌거나 단독 화면을 오가도 재생이 끊기지 않게 하는 장치라 위치를 바꾸지 않습니다.
- 화면 단축키가 글 쓰는 중인지 가릴 때는 `lib/utils/is-typing-target.ts` 를 씁니다. 태그 이름으로 직접 가리면 슬라이더(`<input type="range">`)에 포커스가 있을 때 단축키가 죽습니다.

## 7. 2026-11-12 현황 진단

### 폴더

| 문제 | 내용 |
|---|---|
| `components` 루트에 파일 13개 | `sign-in-form`, `favorite-button`, `StarRating`, `user-menu`, `optimized-image` 등이 폴더 없이 있었습니다. |
| `components/ui` 에 앱 전용이 섞임 | `entity-thumb`, `service-logo`, `notation-glyph`, `equalizer`, `fallback-art`, `icons/` 는 도메인을 압니다. |
| 역할이 겹치는 폴더 | `artist`/`artists`, `shell`/`navigation`(둘 다 셸), `shell/compare`(비교 화면인데 셸 아래), `screen`(영화 음악 기능인데 이름이 화면). |
| 훅이 세 곳 | `hooks/`, `lib/hooks/`, `lib/query/hooks/`. 한 기능만 쓰는 훅도 최상위에 있었습니다. |
| 이름 규칙이 섞임 | `ArtistFormModal.tsx`, `StarRating.tsx`, `useAuth.ts`, `mockDTO.ts` 와 kebab-case 가 같이 있었습니다. |
| 안 쓰는 파일 | `lib/design/motion.ts`, `lib/query/hooks/index.ts`. |
| `components.json` | `style: new-york`(Radix 판) 그대로였습니다. |

### 컴포넌트

| 컴포넌트 | 증상 | 원인 | 기준과의 차이 |
|---|---|---|---|
| `ui/popover` | 웹에서 열릴 때 기준점 애니메이션이 안 먹음 | `origin-(--radix-…)`·`outline-hidden` 은 Tailwind v4 문법이라 v3 에서 버려짐 | Base UI 판은 Positioner·Popup, `data-open` variant |
| `ui/popover` 사용처 | 닫으려면 트리거 ref 의 `close()` 를 부름 | `open`/`onOpenChange` 를 받지 않음 | 제어 props |
| `ui/select` | 쓰는 곳이 없고, 앱에서 뜨지 않음 | Portal 없음, `forwardRef`, lucide 아이콘에 `className` 직접 | 파트 구조·작성 방식 전부 다름 |
| 툴팁 | 사이드바 안에서 `createPortal` + 좌표 계산으로 직접 그림(`zIndex: 60`) | 프리미티브가 없음 | Tooltip 프리미티브 |
| 슬라이더 | 재생 위치·볼륨이 `shell/compare/scrub-bar` 의 직접 구현, 웹 전용 | 프리미티브가 없음. PageUp/Down·Shift 단계 없음 | Slider 프리미티브 |
| 모달 | RN `Modal` 을 7곳에서 제각각 씀. 웹에서 포커스 가두기·복귀가 없음 | dialog·sheet 프리미티브가 없음 | Dialog·Sheet 프리미티브 |
| 빠른 검색 | `position: fixed` + `z-50` 을 직접 주고 Esc 를 window 에서 받음 | 〃 | Dialog 위에 올림 |
| 겹침 순서 | 10·30·40·50·60·2147483000 이 파일마다 숫자로 흩어짐 | 단계표가 없음 | 5절 |
| 셸 | 사이드바 접힘은 `sidebar-state`, 대기열 열림은 재생 스토어(데스크톱)와 미니 플레이어 지역 상태(모바일)로 갈림. 폭·높이 숫자가 `app-shell`, `side-nav`, `global-player-bar` 에 흩어짐 | 셸 상태·크기를 가진 곳이 없음 | 6절 |
| 사이드바 | 링크 사이 화살표 이동 없음, 접힌 이름표가 마우스에만 뜸, landmark 없음 | 직접 구현 | shadcn Sidebar 의 파트·동작 |
| export | `legacy-compare-screen` 만 `export default` | — | named export |

## 8. 정한 것 (2026-11-13)

| 항목 | 결정 |
|---|---|
| 좁은 화면 메뉴 | 하단 탭을 유지합니다. 서랍으로 바꾸지 않습니다. |
| RN `Modal` 직접 쓰는 6곳·빠른 검색 | dialog·sheet 프리미티브로 한 번에 옮깁니다. 겉모양은 그대로 둡니다. |
| `app/` 라우트 파일 | 그 화면을 고칠 때 `features/<기능>/` 로 옮기고 라우트 파일은 한 줄만 남깁니다. 한 번에 다 옮기는 PR 은 만들지 않습니다. |
| 서식·린트 | prettier 를 코드 전체에 맞췄습니다(`npm run format`). ESLint 는 `eslint-config-expo` 로 넣고 처음엔 기존 경고를 그대로 둡니다. PR 마다 `check.yml` 이 타입·문구·린트·서식을 봅니다. |

## 9. 작업 순서

1. 이 문서 + 디렉토리 이동(동작 변경 없음)
2. 셸(6절)
3. ui 프리미티브(4절): Base UI 도입, popover·select 다시 쓰기, dialog·sheet·tooltip·slider 추가

## 10. 프리미티브 현황 (2026-11-13)

| 프리미티브 | 웹 | 앱 | 쓰는 곳 |
|---|---|---|---|
| `popover` | Base UI | @rn-primitives | 공연 필터, 사용자 메뉴 |
| `tooltip` | Base UI | 트리거만 | 접힌 사이드바 이름표 |
| `slider` | Base UI | 직접 그린 끌기 | 재생 위치·볼륨(`features/player/components/scrub-bar`) |
| `dialog` | Base UI | RN Modal(막 서서히) | 빠른 검색, 예매처·앨범 상세(넓은 화면), 영화 장면 스틸, 공연 사진 크게 보기(`fullscreen`) |
| `sheet` | Base UI | RN Modal(막 서서히 + 패널 밀려 들어옴) | 모바일 대기열·동작 시트, 예매처·앨범 상세(좁은 화면), 공연 필터, 관리자 입력 폼 |
| `select` | Base UI | @rn-primitives | 아직 없음 |
| `button` `input` `label` `text` `badge` `chip` `card` `avatar` `separator` `skeleton` `icon` `kbd` `empty-state` `expandable-text` `more-link` `scrim` | 한 파일 (`Platform.select`) | 같은 파일 | 전반 |

RN `Modal` 을 직접 쓰는 곳은 dialog·sheet 의 앱 구현뿐입니다(2026-11-13 옮김).

- 넓은 화면은 가운데 상자, 좁은 화면은 아래 시트인 팝업은 같은 `Dialog` 안에서 `const Content = dialog ? DialogContent : SheetContent` 로 고릅니다.
- react-native-web 의 `TextInput` 은 모든 keydown 전파를 끊습니다. 그래서 팝업 안 입력 칸에서 누른 Esc 는 `components/ui/dialog/escape.ts` 가 window 캡처 단계에서 받아 닫습니다. 화면에서 Esc 를 따로 듣지 않습니다.
- 앱 시트의 여는 움직임은 Modal 의 `onShow` 뒤에 시작합니다. 먼저 시작하면 iOS 에서 Modal 이 뜨기 전에 움직임이 끝나 패널이 그냥 나타납니다.

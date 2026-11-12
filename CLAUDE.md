# ClassicMap Frontend 작업 지침

## 국제 초기 시드 기능

- `docs/global-seed-frontend-contract.md`를 구현 기준으로 사용합니다.
- 백엔드 데이터 계약이 확정되지 않은 필드는 프론트에서 추측하거나 임시 fallback으로 만들지 않습니다.
- 기존 비교 화면과 인비디어스 worktree의 동작을 보존합니다.
- 기존 worktree에 남아 있는 미커밋 FFmpeg 재인코딩 변경을 복사하거나 되돌리지 않습니다.

## 데이터 사용

- 곡 비교 화면과 아티스트 상세 화면은 동일한 performance/credit 데이터를 사용합니다.
- `clipStatus !== 'ready'`인 영상은 재생 UI를 노출하지 않습니다.
- 목록 진입 시 모든 영상을 동시에 로드하지 않습니다.
- API 목록에는 pagination을 적용하며 전체 작품과 녹음을 한 번에 요청하지 않습니다.
- 명시적 TypeScript 타입을 사용하고 `any`를 추가하지 않습니다.

## 구조와 컴포넌트

근거와 자세한 규칙은 `docs/frontend-structure.md` 에 있습니다.

- `app/` 은 라우트만 둡니다. 조각은 아래에서 가져옵니다.
- `components/ui` 는 도메인을 모르는 프리미티브, `components/shared` 는 두 기능 이상이 쓰는 앱 공용 조각, `components/layout` 은 셸입니다. `components/` 루트에는 파일을 두지 않습니다.
- 기능은 `features/<기능>/{components,hooks,lib}` 에 둡니다. 한 기능에서만 쓰는 훅·함수는 그 기능 안에, 공용만 최상위 `hooks/`·`lib/`·`types/` 에 둡니다.
- 의존 방향은 `app → components/layout → features → components/shared → components/ui → hooks·lib·types` 입니다. 아래쪽이 위쪽을 가져오지 않습니다.
- 파일 이름은 kebab-case, export 는 named 만 씁니다(`export default` 는 `app/` 라우트만). 묶음 `index.ts` 는 만들지 않습니다.
- 컴포넌트는 `function` 선언으로 쓰고 `forwardRef` 를 쓰지 않습니다. `cva` 는 variant 가 있는 `components/ui` 프리미티브에만 쓰고 `<이름>Variants` 로 함께 내보냅니다.
- 플랫폼별 구현은 `app/` 밖에 두고 짝 파일(`x.tsx` + `x.web.tsx`)을 함께 옮깁니다.
- Tailwind 는 v3 입니다. v4 문법(`data-open:`, `origin-(--x)`, `outline-hidden`)을 쓰지 않습니다.
- 웹과 앱 구현이 갈리는 프리미티브(popover·select·dialog·sheet·tooltip·slider)는 `components/ui/<이름>/{index.tsx,index.web.tsx,types.ts}` 로 둡니다. 웹은 Base UI, 두 구현은 `types.ts` 의 같은 props 를 쓰고 같은 이름만 내보냅니다.
- 프리미티브의 요소를 바꿔 끼울 때는 `asChild` 가 아니라 `render` 를, 열림은 `open`·`onOpenChange` 를 씁니다. 팝업·모달을 새로 만들 때는 RN `Modal`·`createPortal` 을 직접 쓰지 말고 프리미티브를 씁니다.
- 겹침 순서는 이름으로 씁니다(`z-raised`, `z-overlay`, `LAYER.floating` …). 값은 `lib/design/layers.json` 한곳에 있고 숫자를 직접 쓰지 않습니다.
- 셸은 영역(`components/layout/shell.tsx`), 크기(`lib/layout/shell-layout.ts`), 상태(`lib/layout/shell-state.ts`)를 한곳씩에서 정합니다. 사이드바 접힘·대기열 열림을 다른 곳에 두지 않습니다.
- 영상 요소(`ComparePlayerHost`)는 루트(`root-chrome`)에 같은 key 로 둡니다. 셸 안으로 옮기면 창 폭이 바뀔 때 재생이 끊깁니다.

## UI 문구

- 사용자 대상 문구는 자연스러운 해요체를 사용합니다.
- 오류 문구에는 사용자가 할 수 있는 다음 행동을 포함합니다.
- 플랫폼 출처와 영상 출처를 숨기지 않습니다.

## 검증

```bash
npx tsc --noEmit
npm run i18n:check
npx expo export --platform web
```

필요한 검증 스크립트가 없으면 `package.json`에 명시적인 script를 추가합니다.

## Git

- 한 커밋에는 하나의 작업 패킷만 포함합니다.
- 커밋 메시지는 한국어로 작성합니다.
- 사용자 또는 다른 worktree의 변경을 되돌리지 않습니다.


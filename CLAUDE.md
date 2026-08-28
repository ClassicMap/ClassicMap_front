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

## UI 문구

- 사용자 대상 문구는 자연스러운 해요체를 사용합니다.
- 오류 문구에는 사용자가 할 수 있는 다음 행동을 포함합니다.
- 플랫폼 출처와 영상 출처를 숨기지 않습니다.

## 검증

```bash
npx tsc --noEmit
npx expo export --platform web
```

필요한 검증 스크립트가 없으면 `package.json`에 명시적인 script를 추가합니다.

## Git

- 한 커밋에는 하나의 작업 패킷만 포함합니다.
- 커밋 메시지는 한국어로 작성합니다.
- 사용자 또는 다른 worktree의 변경을 되돌리지 않습니다.


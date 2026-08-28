# 국제 초기 시드 프론트엔드 계약

## 목적

국제 시드로 확장된 작곡가, 작품, 아티스트, 스트리밍, 비교영상 데이터를 대량 환경에서 안전하게 표시합니다. 같은 비교영상 데이터를 곡 비교 화면과 아티스트 상세 화면에서 재사용합니다.

## 비교영상 데이터

프론트가 사용할 최소 DTO는 다음과 같습니다.

```ts
export interface ComparisonPerformance {
  id: number;
  sourceId: number;
  sectorId: number;
  pieceId: number;
  pieceTitle: string;
  composerId: number;
  composerName: string;
  sectorName: string;
  startMs: number;
  endMs: number;
  clipStatus: 'pending' | 'queued' | 'generating' | 'ready' | 'failed' | 'retired';
  clipUrl?: string;
  credits: PerformanceCredit[];
}

export interface PerformanceCredit {
  artistId: number;
  artistName: string;
  role: 'soloist' | 'conductor' | 'orchestra' | 'ensemble' | 'accompanist' | 'vocalist' | 'other';
  isPrimary: boolean;
  displayOrder: number;
}
```

실제 구현에서는 백엔드 응답 명명 규칙과 기존 camelCase mapper를 따릅니다.

## API 요구사항

```text
GET /pieces/{pieceId}/comparison-sectors
GET /sectors/{sectorId}/comparison-performances
GET /artists/{artistId}/comparison-performances?cursor=&limit=
```

아티스트 API는 작품, 작곡가, 섹터, 역할, clip 상태를 join한 결과를 반환해야 합니다. 프론트가 performance별로 작품 API를 다시 호출하는 N+1 구조를 만들지 않습니다.

## 곡 비교 화면

- 섹터별로 `clipStatus = ready`인 performance만 재생합니다.
- primary artist가 서로 다른 영상 3개 이상일 때 섹터를 공개합니다.
- 영상 하나만 선택하여 재생하고 나머지는 poster 상태로 유지합니다.
- 시작/끝 라벨은 YouTube 원본 타임라인 기준으로 표시할 수 있지만 플레이어 시간은 잘린 클립 기준임을 혼동하지 않게 합니다.

## 아티스트 상세

새 섹션 이름은 `이 아티스트의 연주 비교`로 사용합니다.

각 카드에 다음을 표시합니다.

- 작품명
- 작곡가
- 비교 구간명
- 해당 아티스트 역할
- 준비된 클립
- `다른 연주자와 비교하기` 액션

액션은 해당 `pieceId`와 `sectorId`를 선택한 비교 화면으로 이동합니다. 목록은 작품별로 묶고 cursor pagination을 사용합니다.

## 로딩과 오류

- 화면 진입 시 모든 clip URL을 preload하지 않습니다.
- 사용자가 선택한 카드의 영상만 로드합니다.
- `pending`, `queued`, `generating`은 사용자 공개 데이터에서 제외합니다.
- `failed` 영상은 재생 대신 대체 영상을 선택하도록 관리자 상태로 남깁니다.
- 네트워크 오류에는 다시 시도 기능을 제공합니다.

## 호환성

- 기존 `Performance` 타입과 API는 새 DTO 전환이 끝날 때까지 유지합니다.
- 현재 web은 홈서버 clip URL, native는 YouTube IFrame을 사용합니다.
- 재생 모드 변경은 별도 승인 없이 수행하지 않습니다.

## 합격 조건

- 기존 비교 화면 회귀가 없습니다.
- 아티스트 상세에서 같은 performance 데이터가 중복 저장 없이 노출됩니다.
- conductor와 orchestra credit이 함께 표시됩니다.
- `ready`가 아닌 클립이 재생되지 않습니다.
- 작품 목록과 아티스트 performance 목록이 전체 데이터를 한 번에 로드하지 않습니다.
- TypeScript 검사와 web export가 성공합니다.


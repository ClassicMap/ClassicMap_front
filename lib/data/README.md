# Mock Data 구조 가이드

## 개요

database_schema.sql과 동일한 구조로 설계된 통합 Mock 데이터입니다.
백엔드 API가 준비되면 바로 연동 가능하도록 설계되었습니다.

## 파일 구조

```
lib/
├── types/
│   └── models.ts           # TypeScript 인터페이스 (DB 스키마와 동일)
├── data/
│   ├── mockDatabase.ts     # Mock 데이터베이스 (실제 데이터)
│   └── mockDTO.ts          # DTO 및 헬퍼 함수
└── mockData.ts             # 레거시 호환성 (deprecated)
```

## 데이터 모델

### 1. Composer (작곡가)
```typescript
interface Composer {
  id: number;
  name: string;              // 한글명 (예: 바흐)
  fullName: string;          // 전체 한글명 (예: 요한 제바스티안 바흐)
  englishName: string;       // 영문명
  period: '바로크' | '고전주의' | '고전주의/낭만주의' | '낭만주의' | '근현대';
  birthYear: number;
  deathYear: number;
  nationality: string;
  imageUrl?: string;
  bio?: string;
  style?: string;
  influence?: string;
}
```

### 2. Piece (곡)
```typescript
interface Piece {
  id: number;
  composerId: number;        // 작곡가 ID
  title: string;
  description?: string;
  opusNumber?: string;       // Opus 번호 (예: BWV 988, Op. 23)
  compositionYear?: number;
}
```

### 3. Artist (연주자)
```typescript
interface Artist {
  id: number;
  name: string;              // 한글명
  englishName: string;
  category: string;          // 피아니스트, 바이올리니스트 등
  tier: 'S' | 'A' | 'B' | 'Rising';
  rating: number;
  nationality: string;
  birthYear?: string;
  bio?: string;
  style?: string;
  concertCount: number;
  countryCount: number;
  albumCount: number;
}
```

### 4. Performance (연주)
```typescript
interface Performance {
  id: number;
  pieceId: number;           // 곡 ID
  artistId: number;          // 연주자 ID
  videoPlatform: 'youtube' | 'vimeo' | 'other';
  videoId: string;
  startTime: number;         // 시작 시간 (초)
  endTime: number;           // 종료 시간 (초)
  characteristic?: string;   // 연주 특징
  viewCount: number;
  rating: number;
}
```

## 사용법

### 기본 조회

```typescript
import { 
  MOCK_COMPOSERS, 
  MOCK_PIECES, 
  MOCK_ARTISTS, 
  MOCK_PERFORMANCES 
} from '@/lib/data/mockDatabase';

// 모든 작곡가
const composers = MOCK_COMPOSERS;

// 특정 작곡가
const bach = MOCK_COMPOSERS.find(c => c.id === 1);
```

### 헬퍼 함수 사용

```typescript
import {
  getComposerById,
  getPiecesByComposerId,
  getMajorPiecesByComposerId,
  getPerformancesByPieceId,
} from '@/lib/data/mockDatabase';

// 작곡가 조회
const composer = getComposerById(1);

// 작곡가의 모든 곡
const allPieces = getPiecesByComposerId(1);

// 작곡가의 주요 곡만
const majorPieces = getMajorPiecesByComposerId(1);

// 곡의 모든 연주
const performances = getPerformancesByPieceId(10);
```

### DTO 사용 (API 응답 형식)

```typescript
import {
  getComposerDTO,
  getPieceDTO,
  getComparisonData,
} from '@/lib/data/mockDTO';

// 작곡가 + 주요 곡 포함
const composerWithPieces = getComposerDTO(4); // 쇼팽
// {
//   id: 4,
//   name: '쇼팽',
//   majorPieces: [
//     { id: 10, title: '발라드 1번', performances: [...] },
//     ...
//   ]
// }

// 비교 페이지용 데이터
const comparisonData = getComparisonData(4, 10); // 쇼팽 발라드 1번
// {
//   composer: { ... },
//   piece: { ... },
//   performances: [
//     { id: 1, artist: { name: '마르타 아르헤리치', ... }, ... },
//     { id: 2, artist: { name: '임윤찬', ... }, ... },
//   ]
// }
```

### 타임라인 페이지

```typescript
import { getTimelineComposers, getAllPeriods } from '@/lib/data/mockDTO';

const composers = getTimelineComposers();
const periods = getAllPeriods();
```

### 홈 페이지 - 인기 비교

```typescript
import { getPopularComparisons } from '@/lib/data/mockDTO';

const popularComparisons = getPopularComparisons();
// [
//   { id: '1', piece: '쇼팽 발라드 1번', composerId: 4, pieceId: 10, ... },
//   ...
// ]
```

## 현재 Mock 데이터

### 작곡가 (7명)
1. 바흐 (바로크)
2. 모차르트 (고전주의)
3. 베토벤 (고전주의/낭만주의)
4. 쇼팽 (낭만주의)
5. 차이콥스키 (낭만주의)
6. 라흐마니노프 (근현대)
7. 드뷔시 (근현대)

### 곡 (19개)
- 각 작곡가별로 3-4개의 대표곡

### 연주자 (7명)
1. 조성진 (S급 피아니스트)
2. 임윤찬 (Rising 피아니스트)
3. 마르타 아르헤리치 (S급 피아니스트)
4. 유자 왕 (S급 피아니스트)
5. 랑랑 (S급 피아니스트)
6. 다니엘 바렌보임 (S급 피아니스트)
7. 글렌 굴드 (S급 피아니스트)

### 연주 (12개)
- 쇼팽 발라드 1번: 3개 연주
- 쇼팽 녹턴 Op.9 No.2: 1개 연주
- 베토벤 열정 소나타: 2개 연주
- 라흐마니노프 협주곡 2번: 2개 연주
- 골드베르크 변주곡: 2개 연주
- 차이콥스키 협주곡 1번: 2개 연주

## 데이터 간 관계

```
MOCK_COMPOSERS
    ↓ (composerId)
MOCK_PIECES
    ↓ (pieceId)
MOCK_PERFORMANCES
    ↓ (artistId)
MOCK_ARTISTS

MOCK_COMPOSER_MAJOR_PIECES (작곡가-주요곡 연결)
    composerId → MOCK_COMPOSERS
    pieceId → MOCK_PIECES
```

## API 연동 시

### 1. API 서비스 생성
```typescript
// lib/api/composers.ts
export async function fetchComposers(): Promise<ComposerDTO[]> {
  const response = await fetch('/api/composers');
  return response.json();
}

export async function fetchComposerById(id: number): Promise<ComposerDTO> {
  const response = await fetch(`/api/composers/${id}`);
  return response.json();
}
```

### 2. Mock → API 전환
```typescript
// Before (Mock)
import { getComposerDTO } from '@/lib/data/mockDTO';
const composer = getComposerDTO(1);

// After (API)
import { fetchComposerById } from '@/lib/api/composers';
const composer = await fetchComposerById(1);
```

### 3. React Query 사용 예시
```typescript
import { useQuery } from '@tanstack/react-query';
import { fetchComposerById } from '@/lib/api/composers';

function ComposerDetail({ id }: { id: number }) {
  const { data: composer } = useQuery({
    queryKey: ['composer', id],
    queryFn: () => fetchComposerById(id),
  });
  
  // composer는 ComposerDTO 타입으로 자동 추론됨
}
```

## 주의사항

1. **ID는 항상 number 타입**: 일부 기존 코드에서 string을 사용하는 경우 변환 필요
2. **레거시 호환성**: `lib/mockData.ts`는 기존 코드 호환성을 위해 유지
3. **DTO 사용 권장**: API 응답과 동일한 형식이므로 DTO 사용 권장
4. **관계형 데이터**: ID 참조로 연결되어 있으므로 헬퍼 함수 사용 권장

## 추가할 데이터

백엔드 개발 전 추가로 필요한 Mock 데이터:
- [ ] Venue (공연장)
- [ ] Concert (공연)
- [ ] Recording (음반)
- [ ] ArtistSpecialty (연주자 전문 분야)
- [ ] ArtistAward (수상 내역)
- [ ] User (사용자)
- [ ] Favorite (즐겨찾기)

## 참고

- database_schema.sql과 구조 동일
- TypeScript 타입 안정성 보장
- 백엔드 API와 즉시 연동 가능

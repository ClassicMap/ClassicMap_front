# React Query 훅 사용 가이드

## 📦 설치 완료된 훅

모든 데이터 페칭은 React Query 훅을 통해 자동으로 캐싱됩니다.

### ✅ 구현 완료
- **작곡가**: `useComposers()`, `useComposer(id)`
- **아티스트**: `useArtists()`, `useArtist(id)`
- **공연**: `useConcerts()`, `useConcert(id)`
- **곡**: `usePiece(id)`, `usePiecesByComposer(composerId)`

---

## 🚀 기본 사용법

### 1. Import
```typescript
// 필요한 훅만 import
import { useComposers, useArtists } from '@/lib/query/hooks';

// 또는 개별 import
import { useComposers } from '@/lib/query/hooks/use-composers';
```

### 2. 목록 조회
```typescript
function MyComponent() {
  const {
    data = [],        // 데이터 (기본값 제공)
    isLoading,        // 최초 로딩 중
    isRefetching,     // 새로고침 중
    error,            // 에러
    refetch,          // 수동 새로고침
  } = useComposers();

  if (isLoading) return <Loading />;
  if (error) return <Error />;

  return <List data={data} />;
}
```

### 3. 상세 조회
```typescript
function DetailComponent({ id }: { id: number }) {
  const { data: composer, isLoading } = useComposer(id);

  // id가 없으면 자동으로 쿼리 비활성화 (enabled: false)
  if (isLoading) return <Loading />;
  if (!composer) return <NotFound />;

  return <Detail data={composer} />;
}
```

---

## 🔄 새로고침 (Refresh)

### Pull to Refresh
```typescript
function MyScreen() {
  const { data, isRefetching, refetch } = useComposers();

  return (
    <ScrollView
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
        />
      }
    >
      {/* Content */}
    </ScrollView>
  );
}
```

### 버튼으로 새로고침
```typescript
<Button onPress={() => refetch()}>
  새로고침
</Button>
```

---

## 🎯 실전 예제

### 예제 1: 작곡가 목록 (app/(tabs)/timeline.tsx)
```typescript
import { useComposers } from '@/lib/query/hooks';

export default function TimelineScreen() {
  const { data: composers = [], isLoading, refetch } = useComposers();

  // 이미지 프리페치
  React.useEffect(() => {
    if (composers.length > 0) {
      prefetchImages(composers.map(c => c.avatarUrl));
    }
  }, [composers]);

  return (
    <ScrollView refreshControl={
      <RefreshControl refreshing={false} onRefresh={refetch} />
    }>
      {composers.map(composer => (
        <ComposerCard key={composer.id} {...composer} />
      ))}
    </ScrollView>
  );
}
```

### 예제 2: 작곡가 상세 (app/composer/[id].tsx)
```typescript
import { useComposer } from '@/lib/query/hooks';

export default function ComposerDetail() {
  const { id } = useLocalSearchParams();
  const { data: composer, isLoading, refetch } = useComposer(Number(id));

  if (isLoading) return <Loading />;
  if (!composer) return <NotFound />;

  return (
    <ScrollView refreshControl={
      <RefreshControl refreshing={false} onRefresh={refetch} />
    }>
      <ComposerHeader {...composer} />
      <PieceList pieces={composer.majorPieces} />
    </ScrollView>
  );
}
```

### 예제 3: 아티스트 목록 (app/(tabs)/artists.tsx)
```typescript
import { useArtists } from '@/lib/query/hooks';

export default function ArtistsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: artists = [], isLoading, refetch } = useArtists();

  // 클라이언트 사이드 필터링
  const filteredArtists = useMemo(() => {
    return artists.filter(a =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [artists, searchQuery]);

  return (
    <>
      <Input
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="아티스트 검색..."
      />
      {filteredArtists.map(artist => (
        <ArtistCard key={artist.id} {...artist} />
      ))}
    </>
  );
}
```

### 예제 4: 공연 목록 (app/(tabs)/concerts.tsx)
```typescript
import { useConcerts } from '@/lib/query/hooks';

export default function ConcertsScreen() {
  const [filter, setFilter] = useState<'upcoming' | 'completed'>('upcoming');

  // 필터별로 다른 쿼리 (각각 캐싱됨)
  const { data: concerts = [], isLoading } = useConcerts(filter);

  return (
    <>
      <FilterButtons filter={filter} setFilter={setFilter} />
      {concerts.map(concert => (
        <ConcertCard key={concert.id} {...concert} />
      ))}
    </>
  );
}
```

---

## 🔧 데이터 수정 시 캐시 업데이트

### 자동 업데이트
```typescript
import { useCreateComposer } from '@/lib/query/hooks';

function AddComposerButton() {
  const { mutate: createComposer } = useCreateComposer();

  const handleAdd = () => {
    createComposer(
      { name: '새 작곡가', ... },
      {
        onSuccess: () => {
          // ✅ useComposers() 캐시 자동 무효화
          // ✅ 화면 자동 업데이트
          Alert.alert('성공', '추가되었습니다');
        }
      }
    );
  };

  return <Button onPress={handleAdd}>추가</Button>;
}
```

### FormModal에서 사용
```typescript
<ComposerFormModal
  visible={showModal}
  onClose={() => setShowModal(false)}
  onSuccess={() => {
    refetch(); // 수동으로 최신 데이터 가져오기
  }}
/>
```

---

## ⚡ 성능 최적화 팁

### 1. 조건부 쿼리
```typescript
// id가 있을 때만 실행
const { data } = useComposer(id);  // enabled: !!id 자동 적용
```

### 2. 병렬 쿼리
```typescript
// 여러 쿼리를 동시에 실행
function HomeScreen() {
  const { data: composers } = useComposers();
  const { data: artists } = useArtists();
  const { data: concerts } = useConcerts();

  // 모두 병렬로 페칭됨
}
```

### 3. Prefetching
```typescript
// 사용자가 버튼 hover 시 미리 데이터 로드
const queryClient = useQueryClient();

const handleHover = () => {
  queryClient.prefetchQuery({
    queryKey: ['composers', id],
    queryFn: () => ComposerAPI.getById(id),
  });
};
```

---

## 🐛 문제 해결

### 1. 데이터가 업데이트 안 될 때
```typescript
// 강제 새로고침
refetch();

// 또는 캐시 무효화
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();
queryClient.invalidateQueries({ queryKey: ['composers'] });
```

### 2. 로딩 상태 확인
```typescript
const { isLoading, isFetching, isRefetching } = useComposers();

// isLoading: 최초 로딩 (캐시 없음)
// isFetching: 어떤 페칭이든 진행 중
// isRefetching: 백그라운드 리페칭
```

### 3. 에러 처리
```typescript
const { error, isError } = useComposers();

if (isError) {
  console.error('Error:', error);
  return <ErrorComponent error={error} />;
}
```

---

## 📊 캐시 정보

| 훅 | staleTime | gcTime | 이유 |
|----|-----------|--------|------|
| `useComposers` | 5분 | 24시간 | 거의 안 바뀜 |
| `useArtists` | 5분 | 24시간 | 거의 안 바뀜 |
| `useConcerts` | 3분 | 24시간 | 날짜별로 바뀜 |
| `useConcert` | 2분 | 24시간 | 예매 상황 반영 |
| `usePiece` | 5분 | 24시간 | 거의 안 바뀜 |

---

## 🎓 더 알아보기

- [React Query 공식 문서](https://tanstack.com/query/latest/docs/react/overview)
- [캐싱 전략 가이드](./CACHING.md)
- [캐싱 전략 상세](./CACHING_STRATEGY.md)

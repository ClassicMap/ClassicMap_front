# React Query 마이그레이션 가이드

## ✅ 완료된 리팩토링

### 1. **timeline.tsx** ✅
- `useComposers()` 적용
- 작곡가 목록 캐싱

### 2. **composer/[id].tsx** ✅
- `useComposer(id)` 적용
- 작곡가 상세 캐싱

### 3. **artists.tsx** ✅
- `useArtists()` 적용
- 아티스트 목록 캐싱

### 4. **artist/[id].tsx** ✅
- `useArtist(id)` 적용
- 아티스트 상세 캐싱

---

## 🔄 리팩토링 패턴

### Before (기존 코드)
```typescript
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);
const [refreshing, setRefreshing] = useState(false);
const [error, setError] = useState(null);

useEffect(() => {
  loadData();
}, []);

const loadData = async () => {
  setLoading(true);
  try {
    const result = await API.getAll();
    setData(result);
    setLoading(false);
  } catch (err) {
    setError('에러 메시지');
    setLoading(false);
  }
};

const onRefresh = async () => {
  setRefreshing(true);
  try {
    const result = await API.getAll();
    setData(result);
    setRefreshing(false);
  } catch (err) {
    setRefreshing(false);
  }
};
```

### After (React Query 사용)
```typescript
import { useDataHook } from '@/lib/query/hooks';

const {
  data = [],
  isLoading: loading,
  error: queryError,
  refetch,
  isRefetching: refreshing,
} = useDataHook();

const error = queryError ? '에러 메시지' : null;
```

---

## 📝 나머지 파일 마이그레이션 가이드

### 5. **concerts.tsx** (TODO)

#### 기존 코드
```typescript
const [concerts, setConcerts] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  ConcertAPI.getAll().then(data => setConcerts(data));
}, []);
```

#### 마이그레이션
```typescript
import { useConcerts } from '@/lib/query/hooks';

const {
  data: concerts = [],
  isLoading: loading,
  refetch,
  isRefetching: refreshing,
} = useConcerts('upcoming'); // 필터 옵션: 'upcoming' | 'completed'

// RefreshControl
<RefreshControl
  refreshing={refreshing}
  onRefresh={() => refetch()}
/>
```

---

### 6. **concert/[id].tsx** (TODO)

#### 기존 코드
```typescript
const [concert, setConcert] = useState(null);

useEffect(() => {
  ConcertAPI.getById(id).then(data => setConcert(data));
}, [id]);
```

#### 마이그레이션
```typescript
import { useConcert } from '@/lib/query/hooks';

const {
  data: concert,
  isLoading: loading,
  refetch,
} = useConcert(Number(id));

// 모달 onSuccess
onSuccess={() => refetch()}
```

---

### 7. **compare.tsx** (TODO)

#### 기존 코드
```typescript
const [piece, setPiece] = useState(null);

useEffect(() => {
  ComposerAPI.getPieceById(pieceId).then(data => setPiece(data));
}, [pieceId]);
```

#### 마이그레이션
```typescript
import { usePiece } from '@/lib/query/hooks';

const {
  data: piece,
  isLoading: loading,
  refetch,
} = usePiece(Number(pieceId));
```

---

### 8. **home.tsx** (TODO)

#### 기존 코드
```typescript
const [composers, setComposers] = useState([]);
const [artists, setArtists] = useState([]);
const [concerts, setConcerts] = useState([]);

useEffect(() => {
  Promise.all([
    ComposerAPI.getAll(),
    ArtistAPI.getAll(),
    ConcertAPI.getAll(),
  ]).then(([c, a, co]) => {
    setComposers(c);
    setArtists(a);
    setConcerts(co);
  });
}, []);
```

#### 마이그레이션
```typescript
import { useComposers, useArtists, useConcerts } from '@/lib/query/hooks';

// 병렬로 자동 페칭됨!
const { data: composers = [] } = useComposers();
const { data: artists = [] } = useArtists();
const { data: concerts = [] } = useConcerts('upcoming');

// 로딩 상태 개별 관리 가능
const composersLoading = useComposers().isLoading;
const artistsLoading = useArtists().isLoading;
const concertsLoading = useConcerts().isLoading;

// 또는 전체 로딩
const loading = composersLoading || artistsLoading || concertsLoading;
```

---

## 🔥 공통 수정 사항

### 1. Import 추가
```typescript
// Before
import { API } from '@/lib/api/client';

// After
import { useHook } from '@/lib/query/hooks';
// 또는
import { useComposers } from '@/lib/query/hooks/useComposers';
```

### 2. 상태 제거
```typescript
// 삭제해도 되는 상태들
const [data, setData] = useState([]);  // ❌ 삭제
const [loading, setLoading] = useState(true);  // ❌ 삭제
const [refreshing, setRefreshing] = useState(false);  // ❌ 삭제
const [error, setError] = useState(null);  // ❌ 삭제
```

### 3. useEffect 제거
```typescript
// ❌ 삭제해도 됨
useEffect(() => {
  loadData();
}, []);
```

### 4. RefreshControl 수정
```typescript
// Before
onRefresh={onRefresh}

// After
onRefresh={() => refetch()}
```

### 5. Modal onSuccess 수정
```typescript
// Before
onSuccess={() => {
  loadData();  // API 다시 호출
}}

// After
onSuccess={() => {
  refetch();  // 캐시 업데이트
}}
```

### 6. 삭제 핸들러 수정
```typescript
// Before
onPress: async () => {
  await API.delete(id);
  loadData();  // 목록 다시 로드
}

// After
onPress: async () => {
  await API.delete(id);
  refetch();  // 캐시 업데이트
}
```

---

## 🎯 체크리스트

각 파일 마이그레이션 시 확인할 사항:

- [ ] `import { useHook } from '@/lib/query/hooks'` 추가
- [ ] API import 제거 (또는 필요시 유지)
- [ ] `useState` 상태 제거
- [ ] `useEffect` 제거
- [ ] `loadData()` 함수 제거
- [ ] `onRefresh()` 함수 수정
- [ ] `RefreshControl` onRefresh 수정
- [ ] Modal `onSuccess` 수정
- [ ] 삭제/수정 후 `refetch()` 호출
- [ ] 로딩/에러 처리 확인

---

## 💡 주의사항

### 1. 조건부 쿼리
```typescript
// id가 없을 때 쿼리 비활성화 (자동)
const { data } = useComposer(id); // enabled: !!id 자동 적용
```

### 2. 여러 데이터 로드
```typescript
// ✅ 병렬 페칭 (추천)
const { data: composers } = useComposers();
const { data: artists } = useArtists();

// ❌ 순차 페칭 (비추천)
useEffect(() => {
  loadComposers().then(() => loadArtists());
}, []);
```

### 3. 에러 처리
```typescript
const { error: queryError } = useComposers();
const error = queryError ? '사용자에게 보여줄 메시지' : null;

if (error) {
  return <ErrorComponent error={error} onRetry={refetch} />;
}
```

### 4. 이미지 프리페치
```typescript
// useEffect로 별도 관리
useEffect(() => {
  if (data.length > 0) {
    prefetchImages(data.map(d => d.imageUrl));
  }
}, [data]);
```

---

## 🚀 마이그레이션 우선순위

1. ✅ **timeline.tsx** - 완료
2. ✅ **composer/[id].tsx** - 완료
3. ✅ **artists.tsx** - 완료
4. ✅ **artist/[id].tsx** - 완료
5. ⏳ **concerts.tsx** - 동일 패턴
6. ⏳ **concert/[id].tsx** - 동일 패턴
7. ⏳ **compare.tsx** - 동일 패턴
8. ⏳ **home.tsx** - 병렬 쿼리

---

## 📚 참고 문서

- [React Query 훅 사용 가이드](./HOOKS_USAGE.md)
- [캐싱 동작 원리](./CACHING.md)
- [캐싱 전략](./CACHING_STRATEGY.md)

---

## 🎉 완료 후 혜택

- ✅ **빠른 로딩**: 캐시된 데이터 즉시 표시
- ✅ **오프라인 지원**: 네트워크 없어도 조회 가능
- ✅ **자동 동기화**: 백그라운드에서 최신 데이터 유지
- ✅ **코드 간소화**: 50% 이상 코드 감소
- ✅ **버그 감소**: 상태 관리 자동화

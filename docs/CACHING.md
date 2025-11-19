# ClassicMap 캐싱 전략

## 개요

ClassicMap은 React Query와 AsyncStorage를 사용하여 효율적인 데이터 캐싱을 구현합니다.

## 캐싱 아키텍처

### 1. 메모리 캐시 (React Query)
- **staleTime**: 5분
  - 5분 동안은 데이터를 "fresh"로 간주하고 재요청하지 않음
- **gcTime (Garbage Collection Time)**: 24시간
  - 사용하지 않는 캐시를 24시간 후 메모리에서 제거

### 2. 영구 저장소 (AsyncStorage)
- React Query 캐시를 AsyncStorage에 자동 저장
- 앱 재시작 시에도 캐시 유지
- 최대 보관 기간: 24시간

## 사용 가능한 캐싱 훅

### 작곡가 (Composers)
```typescript
import { useComposers, useComposer } from '@/lib/query/hooks';

// 작곡가 목록
const { data: composers, isLoading, refetch } = useComposers();

// 작곡가 상세
const { data: composer } = useComposer(id);
```

### 아티스트 (Artists)
```typescript
import { useArtists, useArtist } from '@/lib/query/hooks';

// 아티스트 목록
const { data: artists, isLoading, refetch } = useArtists();

// 아티스트 상세
const { data: artist } = useArtist(id);
```

### 공연 (Concerts)
```typescript
import { useConcerts, useConcert } from '@/lib/query/hooks';

// 공연 목록
const { data: concerts, isLoading, refetch } = useConcerts();

// 필터링된 공연 목록
const { data: upcomingConcerts } = useConcerts('upcoming');

// 공연 상세 (staleTime: 2분)
const { data: concert } = useConcert(id);
```

### 곡/작품 (Pieces)
```typescript
import { usePiece, usePiecesByComposer } from '@/lib/query/hooks';

// 곡 상세
const { data: piece } = usePiece(id);

// 작곡가별 곡 목록
const { data: pieces } = usePiecesByComposer(composerId);
```

## 데이터 로딩 플로우

### 초기 로드
```
1. React Query가 먼저 AsyncStorage 확인
2. 캐시가 있고 유효하면 → 즉시 화면에 표시
3. 백그라운드에서 API 호출하여 최신 데이터 확인
4. 변경사항이 있으면 자동으로 UI 업데이트
```

### 앱 재시작 시
```
1. AsyncStorage에서 캐시 복원
2. 바로 화면에 데이터 표시 (로딩 스피너 없음)
3. 백그라운드에서 최신 데이터 페칭
4. 필요시 업데이트
```

### 화면 포커스 시
```
1. 이미 메모리에 있는 데이터 표시
2. staleTime(5분) 지났으면 자동 리페칭
3. 아니면 기존 캐시 사용
```

## 자동 리페칭 조건

- ✅ **앱 재시작 시**: AsyncStorage에서 복원 후 백그라운드 리페칭
- ✅ **네트워크 재연결 시**: 오프라인에서 온라인으로 전환 시 자동 리페칭
- ✅ **화면 포커스 시**: staleTime 경과 시에만
- ❌ **윈도우 포커스**: 비활성화 (모바일 앱에서 불필요)

## 수동 리페칭

### 1. Pull-to-Refresh
```typescript
const { refetch, isRefetching } = useComposers();

<ScrollView
  refreshControl={
    <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
  }
>
```

### 2. 버튼 클릭
```typescript
<Button onPress={() => refetch()}>
  새로고침
</Button>
```

## 캐시 무효화

### 데이터 변경 시 자동 무효화

```typescript
// 작곡가 생성 후
export function useCreateComposer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => ComposerAPI.create(data),
    onSuccess: () => {
      // 작곡가 목록 캐시 무효화 → 자동 리페칭
      queryClient.invalidateQueries({ queryKey: ['composers'] });
    },
  });
}
```

## 오프라인 지원

### 오프라인 시나리오
1. 앱이 오프라인 상태
2. AsyncStorage에 저장된 캐시 사용
3. 네트워크 에러 무시하고 캐시 데이터 표시
4. 온라인 복귀 시 자동으로 최신 데이터 페칭

### 제한사항
- 오프라인에서는 새로운 데이터 생성/수정 불가
- 캐시된 데이터만 조회 가능

## 성능 최적화

### 1. 이미지 프리페칭
```typescript
React.useEffect(() => {
  if (composers.length > 0) {
    prefetchImages(composers.map((c) => c.avatarUrl));
  }
}, [composers]);
```

### 2. 백그라운드 리페칭
- 사용자는 캐시된 데이터를 즉시 보면서
- 백그라운드에서 최신 데이터를 조용히 가져옴

### 3. 재시도 전략
```typescript
retry: 2,  // 최대 2번 재시도
retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
// 1초 → 2초 → 최대 30초
```

## 디버깅

### React Query DevTools (개발 모드)
웹 환경에서만 사용 가능:
```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// 개발 모드에서만 추가
{__DEV__ && <ReactQueryDevtools initialIsOpen={false} />}
```

### AsyncStorage 확인
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// 저장된 캐시 확인
const cache = await AsyncStorage.getItem('CLASSICMAP_QUERY_CACHE');
console.log(JSON.parse(cache));

// 캐시 삭제 (테스트용)
await AsyncStorage.removeItem('CLASSICMAP_QUERY_CACHE');
```

## 설정 커스터마이징

### staleTime 조정
```typescript
// lib/query/client.ts
staleTime: 1000 * 60 * 5,  // 5분 → 원하는 시간으로 변경
```

### gcTime 조정
```typescript
gcTime: 1000 * 60 * 60 * 24,  // 24시간 → 원하는 시간으로 변경
```

### 특정 쿼리만 캐싱 비활성화
```typescript
useQuery({
  queryKey: ['composers'],
  queryFn: getComposers,
  gcTime: 0,  // 캐싱 안 함
  staleTime: 0,  // 항상 fresh하지 않음
});
```

## 모범 사례

1. **쿼리 키 관리**: 상수로 중앙화
   ```typescript
   export const COMPOSER_QUERY_KEYS = {
     all: ['composers'] as const,
     detail: (id: number) => ['composers', id] as const,
   };
   ```

2. **낙관적 업데이트**: UX 개선
   ```typescript
   onMutate: async (newComposer) => {
     // 진행 중인 refetch 취소
     await queryClient.cancelQueries({ queryKey: ['composers'] });

     // 이전 값 저장
     const previous = queryClient.getQueryData(['composers']);

     // 낙관적 업데이트
     queryClient.setQueryData(['composers'], (old) => [...old, newComposer]);

     return { previous };
   },
   onError: (err, variables, context) => {
     // 에러 시 롤백
     queryClient.setQueryData(['composers'], context.previous);
   },
   ```

3. **에러 처리**: 사용자에게 명확한 피드백
   ```typescript
   const { error } = useComposers();

   if (error) {
     return <ErrorMessage onRetry={refetch} />;
   }
   ```

## 참고 자료

- [React Query 공식 문서](https://tanstack.com/query/latest/docs/react/overview)
- [AsyncStorage 문서](https://react-native-async-storage.github.io/async-storage/)

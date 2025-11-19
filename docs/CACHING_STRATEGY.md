# ClassicMap 캐싱 전략 가이드

## 캐싱 우선순위

### ✅ 필수 캐싱 (이미 완료)
- **작곡가 목록** (`useComposers`)
- **작곡가 상세** (`useComposer`)

### ✅ 강력 추천 (구현 필요)
1. **아티스트 목록** (`useArtists`)
   - 이유: 자주 조회, 잘 안 바뀜
   - staleTime: 5분
   - 화면: `app/(tabs)/artists.tsx`

2. **아티스트 상세** (`useArtist`)
   - 이유: 자주 조회, 잘 안 바뀜
   - staleTime: 5분
   - 화면: `app/artist/[id].tsx`

3. **공연 목록** (`useConcerts`)
   - 이유: 자주 조회
   - staleTime: 3분 (날짜별로 바뀔 수 있음)
   - 화면: `app/(tabs)/concerts.tsx`

4. **공연 상세** (`useConcert`)
   - 이유: 티켓 정보 등 자주 확인
   - staleTime: 2분 (예매 상황 반영)
   - 화면: `app/concert/[id].tsx`

5. **곡 정보** (`usePiece`)
   - 이유: 비교 페이지에서 사용
   - staleTime: 5분
   - 화면: `app/(tabs)/compare.tsx`

### 🤔 선택적 캐싱
1. **녹음/음반 정보** (`useRecordings`)
   - 이유: 아티스트 상세에 포함될 수 있음
   - staleTime: 10분

2. **연주 영상** (`usePerformances`)
   - 이유: 비교 페이지에서 사용
   - staleTime: 5분

### ❌ 캐싱 불필요
1. **로그인/회원가입**
   - `app/(auth)/*`
   - 이유: 일회성

2. **설정 페이지**
   - `app/settings.tsx`
   - 이유: 서버 데이터 아님 (로컬 설정)

3. **정적 페이지**
   - `app/terms-of-service.tsx`
   - `app/privacy-policy.tsx`
   - 이유: 변경 없음

---

## API별 캐싱 설정 가이드

### 작곡가 (Composers)
```typescript
// ✅ 이미 구현됨
useComposers()     // staleTime: 5분
useComposer(id)    // staleTime: 5분
```

### 아티스트 (Artists)
```typescript
// 🔧 구현 필요
useArtists()       // staleTime: 5분
useArtist(id)      // staleTime: 5분
```

### 공연 (Concerts)
```typescript
// 🔧 구현 필요
useConcerts({
  filter?: 'upcoming' | 'completed',
  date?: string
})                 // staleTime: 3분 (날짜별로 다름)

useConcert(id)     // staleTime: 2분 (예매 상황)
```

### 곡/작품 (Pieces)
```typescript
// 🔧 구현 필요
usePiece(id)       // staleTime: 5분
usePieces()        // staleTime: 5분
```

### 연주 (Performances)
```typescript
// 🔧 구현 필요
usePerformances(pieceId)  // staleTime: 5분
```

---

## staleTime 설정 기준

| 데이터 타입 | staleTime | 이유 |
|------------|-----------|------|
| 작곡가/아티스트 기본 정보 | 5분 | 거의 안 바뀜 |
| 곡/음반 정보 | 5분 | 거의 안 바뀜 |
| 공연 목록 | 3분 | 날짜별로 업데이트 |
| 공연 상세 (예매) | 2분 | 예매 상황 반영 |
| 실시간 데이터 | 30초 | 자주 바뀜 |

---

## 구현 우선순위

### Phase 1: 핵심 데이터 (완료 ✅)
- [x] 작곡가 목록/상세

### Phase 2: 자주 사용되는 데이터
- [ ] 아티스트 목록/상세
- [ ] 공연 목록/상세

### Phase 3: 보조 데이터
- [ ] 곡 정보
- [ ] 연주 영상
- [ ] 음반 정보

---

## 주의사항

### 1. 과도한 캐싱의 문제점
```typescript
// ❌ 나쁜 예: 모든 것을 24시간 캐싱
staleTime: 1000 * 60 * 60 * 24  // 하루 동안 업데이트 안 됨
```

**문제:**
- 데이터 변경 시 사용자가 오래된 정보 봄
- 관리자가 수정해도 사용자에게 반영 안 됨

### 2. 캐싱 안 하는 것의 문제점
```typescript
// ❌ 나쁜 예: 캐싱 안 함
staleTime: 0  // 매번 API 호출
```

**문제:**
- 불필요한 네트워크 사용
- 느린 로딩
- 서버 부하 증가

### 3. 적절한 균형
```typescript
// ✅ 좋은 예: 상황에 맞는 캐싱
staleTime: 1000 * 60 * 5  // 5분 (작곡가 정보)
staleTime: 1000 * 60 * 2  // 2분 (공연 예매)
staleTime: 1000 * 30      // 30초 (실시간 데이터)
```

---

## 캐시 무효화 전략

### 1. 자동 무효화 (추천)
```typescript
// 데이터 생성/수정/삭제 시 자동으로 관련 캐시 무효화
useMutation({
  mutationFn: createComposer,
  onSuccess: () => {
    queryClient.invalidateQueries(['composers']);
  }
});
```

### 2. 수동 새로고침
```typescript
// Pull to Refresh
<RefreshControl onRefresh={() => refetch()} />
```

### 3. 백그라운드 리페칭
```typescript
// staleTime 지나면 자동으로 백그라운드에서 업데이트
// 사용자는 기다리지 않음
```

---

## 메모리 관리

### gcTime (Garbage Collection Time)
```typescript
gcTime: 1000 * 60 * 60 * 24  // 24시간
```

**의미:**
- 사용하지 않는 캐시를 24시간 후 메모리에서 제거
- AsyncStorage에는 계속 유지
- 앱 재시작 시 복원

**조정 기준:**
- 자주 사용: 24시간 (기본값)
- 가끔 사용: 1시간
- 거의 안 사용: 10분

---

## 성능 모니터링

### 캐시 히트율 확인
```typescript
// 개발 모드에서 확인
console.log('Cache hit:', queryClient.getQueryData(['composers']));
```

### 네트워크 요청 최소화 목표
- 같은 데이터를 1분 내에 재조회하면 0번 API 호출
- staleTime 지나면 백그라운드 1번 호출

---

## 추천 구현 순서

1. **Phase 2 구현**: 아티스트 캐싱 (가장 효과 큼)
2. **Phase 3 구현**: 공연 캐싱 (예매 상황 고려)
3. **성능 측정**: 네트워크 요청 감소율 확인
4. **staleTime 조정**: 사용 패턴에 맞게 최적화

현재 프로젝트에서는 **Phase 2까지 구현하는 것을 추천**합니다! 🎯

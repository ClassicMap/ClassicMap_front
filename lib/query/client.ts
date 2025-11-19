import { QueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';

/**
 * React Query 클라이언트 설정
 * - 캐시 지속 시간: 24시간
 * - 백그라운드 리페칭: WiFi 연결 시
 * - AsyncStorage를 통한 오프라인 캐싱
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 캐시 유지 시간 (밀리초)
      gcTime: 1000 * 60 * 60 * 24, // 24시간
      // 데이터 신선도 시간 (밀리초)
      staleTime: 1000 * 60 * 5, // 5분
      // 자동 리페칭 설정
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      // 재시도 설정
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

/**
 * AsyncStorage 기반 Persister
 * - React Query 캐시를 AsyncStorage에 저장
 * - 앱 재시작 시에도 캐시 유지
 */
export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'CLASSICMAP_QUERY_CACHE',
  // 직렬화/역직렬화 옵션
  serialize: JSON.stringify,
  deserialize: JSON.parse,
});

// Persister 설정 옵션
export const persistOptions = {
  persister: asyncStoragePersister,
  maxAge: 1000 * 60 * 60 * 24, // 24시간
  // 캐시에서 제외할 쿼리 키 패턴
  dehydrateOptions: {
    shouldDehydrateQuery: (query: any) => {
      // 에러가 있는 쿼리는 캐싱하지 않음
      return query.state.status === 'success';
    },
  },
};

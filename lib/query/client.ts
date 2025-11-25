import { QueryClient } from '@tanstack/react-query';

/**
 * React Query 클라이언트 설정 (성능 최적화)
 * - AsyncStorage persistence 제거 (테마 변경 속도 개선)
 * - 캐시를 메모리에만 유지
 * - 짧은 캐시 시간으로 메모리 사용량 최소화
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 캐시 유지 시간 (메모리) - 짧게 설정하여 성능 개선
      gcTime: 1000 * 60 * 10, // 10분 (이전: 24시간)
      // 데이터 신선도 시간
      staleTime: 1000 * 60 * 3, // 3분
      // 자동 리페칭 설정
      refetchOnMount: false, // 테마 변경 시 불필요한 리페칭 방지
      refetchOnWindowFocus: false,
      refetchOnReconnect: false, // 재연결 시 리페칭 비활성화 (성능)
      // 재시도 설정 - 최소화
      retry: 1, // 1번만 재시도 (이전: 2번)
      retryDelay: 1000, // 1초 고정 딜레이
    },
  },
});

// Persistence 완전히 비활성화 - 성능을 위해 메모리만 사용
export const persistOptions = undefined;

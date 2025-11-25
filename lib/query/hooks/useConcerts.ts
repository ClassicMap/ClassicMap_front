import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ConcertAPI } from '@/lib/api/client';
import type { Concert } from '@/lib/types/models';

/**
 * 쿼리 키 상수
 */
export const CONCERT_QUERY_KEYS = {
  all: ['concerts'] as const,
  filtered: (filter?: string) => ['concerts', filter] as const,
  detail: (id: number) => ['concerts', id] as const,
};

/**
 * 모든 공연 조회 훅 (무한 스크롤)
 * - 페이지당 20개씩 로드
 * - 자동 캐싱 (3분 stale)
 */
export function useConcerts() {
  const PAGE_SIZE = 20;

  return useInfiniteQuery({
    queryKey: CONCERT_QUERY_KEYS.all,
    queryFn: async ({ pageParam = 0 }) => {
      console.log(`🔍 [useConcerts] Fetching concerts - offset: ${pageParam}, limit: ${PAGE_SIZE}`);
      const result = await ConcertAPI.getAll({ offset: pageParam, limit: PAGE_SIZE });
      console.log(`✅ [useConcerts] Received ${result.length} concerts for offset ${pageParam}`);
      return result;
    },
    getNextPageParam: (lastPage, allPages) => {
      try {
        // 마지막 페이지가 비어있거나 PAGE_SIZE보다 작으면 더 이상 없음
        if (!lastPage || !Array.isArray(lastPage) || lastPage.length < PAGE_SIZE) {
          return undefined;
        }
        // 다음 offset 계산
        const nextOffset = allPages.length * PAGE_SIZE;
        return nextOffset;
      } catch (error) {
        console.error('Error in getNextPageParam:', error);
        return undefined;
      }
    },
    initialPageParam: 0,
    staleTime: 1000 * 60 * 3, // 3분
    gcTime: 1000 * 60 * 10, // 10분 (캐시 유지)
    refetchOnWindowFocus: false, // 포커스 시 재요청 방지
    refetchOnMount: false, // 마운트 시 재요청 방지
    retry: 1, // 1번만 재시도
  });
}

/**
 * 특정 공연 조회 훅
 * - 예매 상황 등을 고려하여 짧은 staleTime (2분)
 */
export function useConcert(id: number | undefined) {
  return useQuery({
    queryKey: CONCERT_QUERY_KEYS.detail(id!),
    queryFn: () => ConcertAPI.getById(id!),
    enabled: !!id && id > 0,
    staleTime: 1000 * 60 * 2, // 2분 (예매 상황 반영)
  });
}

/**
 * 공연 생성 뮤테이션 훅
 */
export function useCreateConcert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Concert>) => ConcertAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONCERT_QUERY_KEYS.all });
    },
  });
}

/**
 * 공연 수정 뮤테이션 훅
 */
export function useUpdateConcert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Concert> }) =>
      ConcertAPI.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: CONCERT_QUERY_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: CONCERT_QUERY_KEYS.all });
    },
  });
}

/**
 * 공연 삭제 뮤테이션 훅
 */
export function useDeleteConcert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => ConcertAPI.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: CONCERT_QUERY_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: CONCERT_QUERY_KEYS.all });
    },
  });
}

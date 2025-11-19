import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
 * 모든 공연 조회 훅
 * - 자동 캐싱 (3분 stale, 24시간 gc)
 * - 날짜별로 조회되므로 조금 짧은 staleTime
 */
export function useConcerts(filter?: 'upcoming' | 'completed') {
  return useQuery({
    queryKey: filter ? CONCERT_QUERY_KEYS.filtered(filter) : CONCERT_QUERY_KEYS.all,
    queryFn: () => ConcertAPI.getAll(filter),
    staleTime: 1000 * 60 * 3, // 3분 (날짜별로 바뀔 수 있음)
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

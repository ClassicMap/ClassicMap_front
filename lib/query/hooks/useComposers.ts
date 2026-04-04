import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ComposerAPI } from '@/lib/api/client';
import type { Composer } from '@/lib/types/models';

/**
 * 쿼리 키 상수
 */
export const COMPOSER_QUERY_KEYS = {
  all: ['composers'] as const,
  detail: (id: number) => ['composers', id] as const,
};

/**
 * 모든 작곡가 조회 훅 (무한 스크롤)
 * - 페이지당 20개씩 로드
 * - 자동 캐싱 (3분 stale)
 * - period 필터 지원
 */
export function useComposers(period?: string) {
  const PAGE_SIZE = 20;

  return useInfiniteQuery({
    queryKey: ['composers', period],
    queryFn: async ({ pageParam = 0 }) => {
      const result = await ComposerAPI.getAll({
        offset: pageParam,
        limit: PAGE_SIZE,
        period: period,
      });
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
 * 전체 작곡가 조회 훅 (타임라인용, 한방에 전체 로드)
 * - limit=0으로 전체 반환
 * - 페이징 없이 단일 요청
 */
export function useAllComposers() {
  return useQuery({
    queryKey: ['composers', 'all'],
    queryFn: () => ComposerAPI.getAll({ offset: 0, limit: 0 }),
    staleTime: 1000 * 60 * 5, // 5분
    gcTime: 1000 * 60 * 15, // 15분
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });
}

/**
 * 특정 작곡가 조회 훅
 * - id가 없으면 쿼리 비활성화
 * - 작곡가 상세 정보 캐싱
 */
export function useComposer(id: number | undefined) {
  return useQuery({
    queryKey: COMPOSER_QUERY_KEYS.detail(id!),
    queryFn: () => ComposerAPI.getById(id!),
    enabled: !!id && id > 0,
  });
}

/**
 * 작곡가 생성 뮤테이션 훅
 */
export function useCreateComposer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Composer>) => ComposerAPI.create(data),
    onSuccess: () => {
      // 작곡가 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: COMPOSER_QUERY_KEYS.all });
    },
  });
}

/**
 * 작곡가 수정 뮤테이션 훅
 */
export function useUpdateComposer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Composer> }) =>
      ComposerAPI.update(id, data),
    onSuccess: (_, { id }) => {
      // 해당 작곡가 및 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: COMPOSER_QUERY_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: COMPOSER_QUERY_KEYS.all });
    },
  });
}

/**
 * 작곡가 삭제 뮤테이션 훅
 */
export function useDeleteComposer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => ComposerAPI.delete(id),
    onSuccess: (_, id) => {
      // 해당 작곡가 및 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: COMPOSER_QUERY_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: COMPOSER_QUERY_KEYS.all });
    },
  });
}

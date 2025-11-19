import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
 * 모든 작곡가 조회 훅
 * - 자동 캐싱 (5분 stale, 24시간 gc)
 * - 오프라인 지원 (AsyncStorage)
 * - 자동 백그라운드 리페칭
 */
export function useComposers() {
  return useQuery({
    queryKey: COMPOSER_QUERY_KEYS.all,
    queryFn: () => ComposerAPI.getAll(),
    // 캐싱 설정은 queryClient의 기본값 사용
    // staleTime: 5분, gcTime: 24시간
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

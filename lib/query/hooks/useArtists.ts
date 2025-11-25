import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArtistAPI } from '@/lib/api/client';
import type { Artist } from '@/lib/types/models';

/**
 * 쿼리 키 상수
 */
export const ARTIST_QUERY_KEYS = {
  all: ['artists'] as const,
  detail: (id: number) => ['artists', id] as const,
};

/**
 * 모든 아티스트 조회 훅 (무한 스크롤)
 * - 페이지당 20개씩 로드
 * - 자동 캐싱 (3분 stale)
 */
export function useArtists() {
  const PAGE_SIZE = 20;

  return useInfiniteQuery({
    queryKey: ARTIST_QUERY_KEYS.all,
    queryFn: async ({ pageParam = 0 }) => {
      console.log(`🔍 [useArtists] Fetching artists - offset: ${pageParam}, limit: ${PAGE_SIZE}`);
      const result = await ArtistAPI.getAll(pageParam, PAGE_SIZE);
      console.log(`✅ [useArtists] Received ${result?.length || 0} artists for offset ${pageParam}`);
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
 * 특정 아티스트 조회 훅
 * - id가 없으면 쿼리 비활성화
 * - 아티스트 상세 정보 캐싱
 */
export function useArtist(id: number | undefined) {
  return useQuery({
    queryKey: ARTIST_QUERY_KEYS.detail(id!),
    queryFn: () => ArtistAPI.getById(id!),
    enabled: !!id && id > 0,
  });
}

/**
 * 아티스트 생성 뮤테이션 훅
 */
export function useCreateArtist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Artist>) => ArtistAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ARTIST_QUERY_KEYS.all });
    },
  });
}

/**
 * 아티스트 수정 뮤테이션 훅
 */
export function useUpdateArtist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Artist> }) =>
      ArtistAPI.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ARTIST_QUERY_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: ARTIST_QUERY_KEYS.all });
    },
  });
}

/**
 * 아티스트 삭제 뮤테이션 훅
 */
export function useDeleteArtist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => ArtistAPI.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ARTIST_QUERY_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: ARTIST_QUERY_KEYS.all });
    },
  });
}

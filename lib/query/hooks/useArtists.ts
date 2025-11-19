import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
 * 모든 아티스트 조회 훅
 * - 자동 캐싱 (5분 stale, 24시간 gc)
 * - 오프라인 지원 (AsyncStorage)
 * - 자동 백그라운드 리페칭
 */
export function useArtists() {
  return useQuery({
    queryKey: ARTIST_QUERY_KEYS.all,
    queryFn: () => ArtistAPI.getAll(),
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

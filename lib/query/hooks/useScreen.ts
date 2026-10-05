import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ScreenAPI } from '@/lib/api/screen';
import type { ScreenTitleKind } from '@/lib/types/models';

const PAGE_SIZE = 24;
const STALE_MS = 5 * 60_000;

export const SCREEN_QUERY_KEYS = {
  titles: (kind: ScreenTitleKind | 'all') => ['screen-titles', kind] as const,
  search: (q: string, kind: ScreenTitleKind | 'all') => ['screen-titles', 'search', q, kind] as const,
  title: (titleId: number) => ['screen-titles', 'detail', titleId] as const,
  pieceCues: (pieceId: number) => ['pieces', pieceId, 'screen-cues'] as const,
  featured: ['screen-cues', 'featured'] as const,
  stills: (titleId: number) => ['screen-titles', titleId, 'stills'] as const,
};

/** 모아 보는 화면 작품 목록. offset 페이지를 이어 붙인다 */
export function useScreenTitles(kind: ScreenTitleKind | 'all') {
  return useInfiniteQuery({
    queryKey: SCREEN_QUERY_KEYS.titles(kind),
    queryFn: ({ pageParam }) =>
      ScreenAPI.getTitles({ kind: kind === 'all' ? undefined : kind, offset: pageParam, limit: PAGE_SIZE }),
    getNextPageParam: (lastPage, pages) => (lastPage.hasMore ? pages.length * PAGE_SIZE : undefined),
    initialPageParam: 0,
    staleTime: STALE_MS,
  });
}

/** 영화 속 클래식 화면 검색. 종류는 서버에서 거르고 offset 페이지를 이어 붙인다 */
export function useScreenTitleSearch(q: string, kind: ScreenTitleKind | 'all') {
  const query = q.trim();
  return useInfiniteQuery({
    queryKey: SCREEN_QUERY_KEYS.search(query, kind),
    queryFn: ({ pageParam }) =>
      ScreenAPI.search({ q: query, kind: kind === 'all' ? undefined : kind, offset: pageParam, limit: PAGE_SIZE }),
    getNextPageParam: (lastPage, pages) => (lastPage.hasMore ? pages.length * PAGE_SIZE : undefined),
    initialPageParam: 0,
    enabled: query.length > 0,
    staleTime: 60_000,
  });
}

export function useScreenTitle(titleId: number | undefined) {
  return useQuery({
    queryKey: SCREEN_QUERY_KEYS.title(titleId ?? 0),
    queryFn: () => ScreenAPI.getTitle(titleId ?? 0),
    enabled: (titleId ?? 0) > 0,
    staleTime: STALE_MS,
  });
}

export function usePieceScreenCues(pieceId: number | undefined) {
  return useQuery({
    queryKey: SCREEN_QUERY_KEYS.pieceCues(pieceId ?? 0),
    queryFn: () => ScreenAPI.getPieceCues(pieceId ?? 0),
    enabled: (pieceId ?? 0) > 0,
    staleTime: STALE_MS,
  });
}

export function useFeaturedScreenCues() {
  return useQuery({
    queryKey: SCREEN_QUERY_KEYS.featured,
    queryFn: () => ScreenAPI.getFeaturedCues(12),
    staleTime: STALE_MS,
  });
}

/** 관리자 스틸 고르기. 열 때만 부른다 */
export function useScreenStillCandidates(titleId: number, enabled: boolean) {
  return useQuery({
    queryKey: SCREEN_QUERY_KEYS.stills(titleId),
    queryFn: () => ScreenAPI.getStillCandidates(titleId),
    enabled: enabled && titleId > 0,
  });
}

export function useSetCueStill(titleId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ cueId, stillPath }: { cueId: number; stillPath: string | null }) =>
      ScreenAPI.setCueStill(cueId, stillPath),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SCREEN_QUERY_KEYS.stills(titleId) });
      void queryClient.invalidateQueries({ queryKey: SCREEN_QUERY_KEYS.title(titleId) });
    },
  });
}

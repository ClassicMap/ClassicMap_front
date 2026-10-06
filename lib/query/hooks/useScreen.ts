import { type QueryClient, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';

import { ScreenAPI } from '@/lib/api/screen';
import type { ScreenTitleKind, ScreenTitleSummary } from '@/lib/types/models';

const PAGE_SIZE = 24;
const STALE_MS = 5 * 60_000;
const WORKS_PAGE_SIZE = 40;

export const SCREEN_QUERY_KEYS = {
  titles: (kind: ScreenTitleKind | 'all') => ['screen-titles', kind] as const,
  search: (q: string, kind: ScreenTitleKind | 'all') => ['screen-titles', 'search', q, kind] as const,
  title: (titleId: number) => ['screen-titles', 'detail', titleId] as const,
  pieceCues: (pieceId: number) => ['pieces', pieceId, 'screen-cues'] as const,
  featured: ['screen-cues', 'featured'] as const,
  works: ['screen-works'] as const,
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

/** 목록 칸을 누르거나(앱) 올려 두면(웹) 작품 페이지를 미리 받는다 */
export function usePrefetchScreenTitle() {
  const queryClient = useQueryClient();
  return React.useCallback(
    (titleId: number) =>
      void queryClient.prefetchQuery({
        queryKey: SCREEN_QUERY_KEYS.title(titleId),
        queryFn: () => ScreenAPI.getTitle(titleId),
        staleTime: STALE_MS,
      }),
    [queryClient]
  );
}

function summariesIn(data: unknown): ScreenTitleSummary[] {
  // 통합 검색은 작품 배열, 모아 보는 화면 목록·검색은 페이지를 이어 붙인 무한 쿼리다
  if (Array.isArray(data)) return data as ScreenTitleSummary[];
  if (typeof data === 'object' && data !== null && 'pages' in data && Array.isArray(data.pages)) {
    return (data.pages as { items?: ScreenTitleSummary[] }[]).flatMap((page) => page.items ?? []);
  }
  return [];
}

function findCachedSummary(queryClient: QueryClient, titleId: number): ScreenTitleSummary | undefined {
  for (const queryKey of [['screen-titles'], ['search', 'screen-titles']]) {
    for (const [, data] of queryClient.getQueriesData<unknown>({ queryKey })) {
      const found = summariesIn(data).find((item) => item.id === titleId);
      if (found) return found;
    }
  }
  return undefined;
}

/** 목록에서 이미 받은 작품 요약. 상세를 받는 동안 머리 부분을 먼저 그린다 */
export function useCachedScreenTitleSummary(titleId: number | undefined): ScreenTitleSummary | undefined {
  const queryClient = useQueryClient();
  return React.useMemo(
    () => (titleId && titleId > 0 ? findCachedSummary(queryClient, titleId) : undefined),
    [queryClient, titleId]
  );
}

export function usePieceScreenCues(pieceId: number | undefined) {
  return useQuery({
    queryKey: SCREEN_QUERY_KEYS.pieceCues(pieceId ?? 0),
    queryFn: () => ScreenAPI.getPieceCues(pieceId ?? 0),
    enabled: (pieceId ?? 0) > 0,
    staleTime: STALE_MS,
  });
}

/** 곡으로 찾기. 고를 때만 부르고 offset 페이지를 이어 붙인다 */
export function useScreenWorks(enabled: boolean) {
  return useInfiniteQuery({
    queryKey: SCREEN_QUERY_KEYS.works,
    queryFn: ({ pageParam }) => ScreenAPI.getWorks({ offset: pageParam, limit: WORKS_PAGE_SIZE }),
    getNextPageParam: (lastPage, pages) => (lastPage.hasMore ? pages.length * WORKS_PAGE_SIZE : undefined),
    initialPageParam: 0,
    enabled,
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

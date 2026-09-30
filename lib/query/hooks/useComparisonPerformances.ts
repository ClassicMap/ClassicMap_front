import { useInfiniteQuery, useQueries, useQuery } from '@tanstack/react-query';

import { ComparisonAPI } from '@/lib/api/comparisons';
import type { ComparisonPiece, ComparisonPiecePerformer } from '@/lib/types/models';

const PAGE_SIZE = 10;

export const COMPARISON_QUERY_KEYS = {
  artist: (artistId: number) => ['artists', artistId, 'comparison-performances'] as const,
  pieces: (composerId?: number) => ['comparison-pieces', composerId ?? 'all'] as const,
  pieceSectors: (pieceId: number) => ['pieces', pieceId, 'comparison-sectors'] as const,
  sectorPerformances: (sectorId: number) => ['sectors', sectorId, 'comparison-performances'] as const,
};

const CATALOG_PAGE_SIZE = 24;

/** 비교 카탈로그. offset 페이지를 이어 붙인다. */
export function useComparisonPieces(composerId?: number, enabled = true) {
  return useInfiniteQuery({
    queryKey: COMPARISON_QUERY_KEYS.pieces(composerId),
    queryFn: ({ pageParam }) =>
      ComparisonAPI.getPieces({ composerId, offset: pageParam, limit: CATALOG_PAGE_SIZE }),
    getNextPageParam: (lastPage, pages) =>
      lastPage.length < CATALOG_PAGE_SIZE ? undefined : pages.length * CATALOG_PAGE_SIZE,
    initialPageParam: 0,
    staleTime: 5 * 60_000,
    enabled,
  });
}

export function usePieceComparisonSectors(pieceId: number | undefined) {
  return useQuery({
    queryKey: COMPARISON_QUERY_KEYS.pieceSectors(pieceId ?? 0),
    queryFn: () => ComparisonAPI.getPieceSectors(pieceId ?? 0),
    enabled: (pieceId ?? 0) > 0,
    staleTime: 5 * 60_000,
  });
}

export function useSectorComparisonPerformances(sectorId: number | undefined) {
  return useQuery({
    queryKey: COMPARISON_QUERY_KEYS.sectorPerformances(sectorId ?? 0),
    queryFn: () => ComparisonAPI.getSectorPerformances(sectorId ?? 0),
    enabled: (sectorId ?? 0) > 0,
    staleTime: 5 * 60_000,
  });
}

/** 한 작품의 모든 구간 연주. 오선 위 구간 위치를 한 연주 기준으로 잡을 때 쓴다 (캐시는 구간 훅과 같다) */
export function useAllSectorPerformances(sectorIds: readonly number[]) {
  return useQueries({
    queries: sectorIds.map((sectorId) => ({
      queryKey: COMPARISON_QUERY_KEYS.sectorPerformances(sectorId),
      queryFn: () => ComparisonAPI.getSectorPerformances(sectorId),
      staleTime: 5 * 60_000,
    })),
  });
}

export function useArtistComparisonPerformances(artistId: number) {
  return useInfiniteQuery({
    queryKey: COMPARISON_QUERY_KEYS.artist(artistId),
    queryFn: ({ pageParam }) =>
      ComparisonAPI.getByArtist(artistId, { cursor: pageParam, limit: PAGE_SIZE }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: null as string | null,
    enabled: artistId > 0,
  });
}

/** 작품 한 개의 카탈로그 정보(작곡가 초상·작품번호·연주자 얼굴). 작곡가 필터로 찾는다. */
export function useComparisonPiece(pieceId: number | undefined, composerId: number | undefined) {
  return useQuery({
    queryKey: [...COMPARISON_QUERY_KEYS.pieces(composerId), 'piece', pieceId ?? 0] as const,
    queryFn: async () => {
      const pieces = await ComparisonAPI.getPieces({ composerId, limit: 50 });
      return pieces.find((piece) => piece.pieceId === pieceId) ?? null;
    },
    enabled: (pieceId ?? 0) > 0 && (composerId ?? 0) > 0,
    staleTime: 5 * 60_000,
  });
}

const CATALOG_SCAN_PAGE = 50;
const CATALOG_SCAN_LIMIT = 2000;
const COMPOSER_FACES = 5;

/** 비교할 수 있는 작품이 있는 작곡가 한 명 */
export interface ComparableComposer {
  composerId: number;
  composerName: string;
  composerAvatarUrl: string | null;
  pieceCount: number;
  /** 작품별 연주자 수의 합. 같은 연주자가 여러 작품에 있으면 여러 번 센다 */
  performanceCount: number;
  /** 카드에 얼굴로 보일 연주자. 사진 있는 사람을 먼저 담는다 */
  performers: ComparisonPiecePerformer[];
}

export interface ComparableComposers {
  /** 비교할 수 있는 작품이 많은 순 (같으면 연주자 수 합이 많은 순) */
  composers: ComparableComposer[];
  byId: Map<number, ComparableComposer>;
  /** 카탈로그 전체 작품. 비교 탭 검색에 쓴다 */
  pieces: ComparisonPiece[];
}

/**
 * 비교할 수 있는 작품이 있는 작곡가와 그 작품 수.
 * 카탈로그는 공개 섹터가 있는 작품만이라 작아서 몇 페이지면 끝난다.
 */
export function useComparableComposers() {
  return useQuery({
    queryKey: ['comparison-pieces', 'composers'] as const,
    queryFn: async (): Promise<ComparableComposers> => {
      const byId = new Map<number, ComparableComposer>();
      const seen = new Map<number, Set<number>>();
      const pieces: ComparisonPiece[] = [];
      for (let offset = 0; offset < CATALOG_SCAN_LIMIT; offset += CATALOG_SCAN_PAGE) {
        const page = await ComparisonAPI.getPieces({ offset, limit: CATALOG_SCAN_PAGE });
        for (const piece of page) {
          pieces.push(piece);
          const entry = byId.get(piece.composerId) ?? {
            composerId: piece.composerId,
            composerName: piece.composerName,
            composerAvatarUrl: piece.composerAvatarUrl,
            pieceCount: 0,
            performanceCount: 0,
            performers: [],
          };
          entry.pieceCount += 1;
          entry.performanceCount += piece.performerCount;
          entry.composerAvatarUrl ??= piece.composerAvatarUrl;
          const ids = seen.get(piece.composerId) ?? new Set<number>();
          for (const performer of piece.performers) {
            if (ids.has(performer.artistId)) continue;
            ids.add(performer.artistId);
            entry.performers.push(performer);
          }
          seen.set(piece.composerId, ids);
          byId.set(piece.composerId, entry);
        }
        if (page.length < CATALOG_SCAN_PAGE) break;
      }
      const composers = [...byId.values()]
        .map((entry) => ({
          ...entry,
          performers: [...entry.performers]
            .sort((a, b) => Number(Boolean(b.imageUrl)) - Number(Boolean(a.imageUrl)))
            .slice(0, COMPOSER_FACES),
        }))
        .sort((a, b) => b.pieceCount - a.pieceCount || b.performanceCount - a.performanceCount);
      return { composers, byId: new Map(composers.map((entry) => [entry.composerId, entry])), pieces };
    },
    staleTime: 10 * 60_000,
  });
}

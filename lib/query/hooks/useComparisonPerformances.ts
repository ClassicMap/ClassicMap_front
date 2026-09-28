import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { ComparisonAPI } from '@/lib/api/comparisons';

const PAGE_SIZE = 10;

export const COMPARISON_QUERY_KEYS = {
  artist: (artistId: number) => ['artists', artistId, 'comparison-performances'] as const,
  pieces: (composerId?: number) => ['comparison-pieces', composerId ?? 'all'] as const,
  pieceSectors: (pieceId: number) => ['pieces', pieceId, 'comparison-sectors'] as const,
  sectorPerformances: (sectorId: number) => ['sectors', sectorId, 'comparison-performances'] as const,
};

const CATALOG_PAGE_SIZE = 24;

/** 비교 카탈로그. offset 페이지를 이어 붙인다. */
export function useComparisonPieces(composerId?: number) {
  return useInfiniteQuery({
    queryKey: COMPARISON_QUERY_KEYS.pieces(composerId),
    queryFn: ({ pageParam }) =>
      ComparisonAPI.getPieces({ composerId, offset: pageParam, limit: CATALOG_PAGE_SIZE }),
    getNextPageParam: (lastPage, pages) =>
      lastPage.length < CATALOG_PAGE_SIZE ? undefined : pages.length * CATALOG_PAGE_SIZE,
    initialPageParam: 0,
    staleTime: 5 * 60_000,
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

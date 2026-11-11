import {
  infiniteQueryOptions,
  type QueryClient,
  queryOptions,
  useInfiniteQuery,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { ComparisonAPI } from '@/lib/api/comparisons';
import type { PieceGenre } from '@/lib/design/genre-palette';
import type { ComparisonPerformance, ComparisonPiece, ComparisonPiecePerformer, HomeRecommendations } from '@/lib/types/models';

const PAGE_SIZE = 10;

export const COMPARISON_QUERY_KEYS = {
  artist: (artistId: number) => ['artists', artistId, 'comparison-performances'] as const,
  pieces: (composerId?: number) => ['comparison-pieces', composerId ?? 'all'] as const,
  /** 'comparison-pieces' 아래에 둬서 작품 머리 미리 채우기(findCachedComparisonPiece)가 같이 찾는다 */
  genrePieces: (genre: PieceGenre) => ['comparison-pieces', 'genre', genre] as const,
  genres: ['comparison-genres'] as const,
  pieceSectors: (pieceId: number) => ['pieces', pieceId, 'comparison-sectors'] as const,
  sectorPerformances: (sectorId: number) => ['sectors', sectorId, 'comparison-performances'] as const,
};

const CATALOG_PAGE_SIZE = 24;
const COMPARISON_STALE_MS = 5 * 60_000;

/** 비교 카탈로그 쿼리 설정. 화면 훅과 미리 부르기(lib/navigation/prefetch)가 같은 키·함수를 쓴다 */
export function comparisonPiecesQueryOptions(composerId?: number) {
  return infiniteQueryOptions({
    queryKey: COMPARISON_QUERY_KEYS.pieces(composerId),
    queryFn: ({ pageParam }) =>
      ComparisonAPI.getPieces({ composerId, offset: pageParam, limit: CATALOG_PAGE_SIZE }),
    getNextPageParam: (lastPage, pages) =>
      lastPage.length < CATALOG_PAGE_SIZE ? undefined : pages.length * CATALOG_PAGE_SIZE,
    initialPageParam: 0,
    staleTime: COMPARISON_STALE_MS,
  });
}

/** 한 장르의 비교 작품. 장르 화면이 쪽 단위로 받는다 */
export function genrePiecesQueryOptions(genre: PieceGenre) {
  return infiniteQueryOptions({
    queryKey: COMPARISON_QUERY_KEYS.genrePieces(genre),
    queryFn: ({ pageParam }) => ComparisonAPI.getPieces({ genre, offset: pageParam, limit: CATALOG_PAGE_SIZE }),
    getNextPageParam: (lastPage, pages) =>
      lastPage.length < CATALOG_PAGE_SIZE ? undefined : pages.length * CATALOG_PAGE_SIZE,
    initialPageParam: 0,
    staleTime: COMPARISON_STALE_MS,
  });
}

/** 장르 요약(장르별 작품 수·대표 초상). 홈·둘러보기·비교 탭 장르 타일이 쓴다 */
export function genreSummariesQueryOptions() {
  return queryOptions({
    queryKey: COMPARISON_QUERY_KEYS.genres,
    queryFn: () => ComparisonAPI.getGenreSummaries(),
    staleTime: 10 * 60_000,
  });
}

export function useGenreSummaries() {
  return useQuery(genreSummariesQueryOptions());
}

export function useGenrePieces(genre: PieceGenre, enabled = true) {
  return useInfiniteQuery({ ...genrePiecesQueryOptions(genre), enabled });
}

export function pieceSectorsQueryOptions(pieceId: number) {
  return queryOptions({
    queryKey: COMPARISON_QUERY_KEYS.pieceSectors(pieceId),
    queryFn: () => ComparisonAPI.getPieceSectors(pieceId),
    staleTime: COMPARISON_STALE_MS,
  });
}

export function sectorPerformancesQueryOptions(sectorId: number) {
  return queryOptions({
    queryKey: COMPARISON_QUERY_KEYS.sectorPerformances(sectorId),
    queryFn: () => ComparisonAPI.getSectorPerformances(sectorId),
    staleTime: COMPARISON_STALE_MS,
  });
}

/** 비교 카탈로그. offset 페이지를 이어 붙인다. */
export function useComparisonPieces(composerId?: number, enabled = true) {
  return useInfiniteQuery({ ...comparisonPiecesQueryOptions(composerId), enabled });
}

export function usePieceComparisonSectors(pieceId: number | undefined) {
  return useQuery({ ...pieceSectorsQueryOptions(pieceId ?? 0), enabled: (pieceId ?? 0) > 0 });
}

interface SectorPerformancesOptions {
  /**
   * 같은 작품 안에서 구간을 바꾸는 동안 새 연주가 올 때까지 이전 구간 연주를 그대로 둔다.
   * 다른 작품의 연주는 남기지 않는다 (머리 제목이 잠깐 이전 작품으로 보이지 않게)
   */
  keepPreviousForPiece?: number;
}

export function useSectorComparisonPerformances(sectorId: number | undefined, options: SectorPerformancesOptions = {}) {
  const keepFor = options.keepPreviousForPiece;
  return useQuery({
    ...sectorPerformancesQueryOptions(sectorId ?? 0),
    enabled: (sectorId ?? 0) > 0,
    placeholderData:
      keepFor === undefined
        ? undefined
        : (previous: ComparisonPerformance[] | null | undefined) =>
            previous && previous.length > 0 && previous[0].pieceId === keepFor ? previous : undefined,
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

/** 한 연주자의 비교 연주. 아티스트 화면과 자동 재생(같은 연주자로 이어 듣기)이 같은 키를 쓴다 */
export function artistComparisonQueryOptions(artistId: number) {
  return infiniteQueryOptions({
    queryKey: COMPARISON_QUERY_KEYS.artist(artistId),
    queryFn: ({ pageParam }) =>
      ComparisonAPI.getByArtist(artistId, { cursor: pageParam, limit: PAGE_SIZE }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: null as string | null,
  });
}

export function useArtistComparisonPerformances(artistId: number) {
  return useInfiniteQuery({ ...artistComparisonQueryOptions(artistId), enabled: artistId > 0 });
}

export function comparisonPieceQueryOptions(pieceId: number, composerId: number | undefined) {
  return queryOptions({
    queryKey: [...COMPARISON_QUERY_KEYS.pieces(composerId), 'piece', pieceId] as const,
    queryFn: async () => {
      const pieces = await ComparisonAPI.getPieces({ composerId, limit: 50 });
      return pieces.find((piece) => piece.pieceId === pieceId) ?? null;
    },
    staleTime: COMPARISON_STALE_MS,
  });
}

interface CachedPiece {
  piece: ComparisonPiece;
  updatedAt: number;
}

/**
 * 이미 받아 둔 목록(비교 카탈로그 페이지, 작곡가별 카탈로그, 홈 추천)에서 작품 한 개를 찾는다.
 * 작품 화면 머리를 요청을 기다리지 않고 바로 그리는 데 쓴다.
 */
export function findCachedComparisonPiece(queryClient: QueryClient, pieceId: number): CachedPiece | undefined {
  const cache = queryClient.getQueryCache();
  let best: CachedPiece | undefined;
  const consider = (piece: ComparisonPiece | null | undefined, updatedAt: number) => {
    if (!piece || piece.pieceId !== pieceId) return;
    if (!best || updatedAt > best.updatedAt) best = { piece, updatedAt };
  };
  for (const query of cache.findAll({ queryKey: ['comparison-pieces'] })) {
    const data: unknown = query.state.data;
    const updatedAt = query.state.dataUpdatedAt;
    if (!data) continue;
    if (Array.isArray((data as { pages?: unknown }).pages)) {
      for (const page of (data as { pages: ComparisonPiece[][] }).pages) {
        for (const piece of page) consider(piece, updatedAt);
      }
    } else if (Array.isArray((data as { pieces?: unknown }).pieces)) {
      for (const piece of (data as ComparableComposers).pieces) consider(piece, updatedAt);
    } else if (typeof data === 'object' && 'pieceId' in data) {
      consider(data as ComparisonPiece, updatedAt);
    }
  }
  // 홈 추천의 오늘의 비교·셸프 항목도 같은 모양(작품 + 추천 이유)이다
  for (const query of [
    ...cache.findAll({ queryKey: ['me', 'recommendations', 'home'] }),
    ...cache.findAll({ queryKey: ['guest', 'recommendations', 'home'] }),
  ]) {
    const data = query.state.data as HomeRecommendations | undefined;
    if (!data) continue;
    consider(data.today, query.state.dataUpdatedAt);
    for (const shelf of data.shelves) {
      for (const item of shelf.items) consider(item, query.state.dataUpdatedAt);
    }
  }
  if (!best) return undefined;
  const { piece, updatedAt } = best;
  // 추천 항목의 추천 이유 같은 덧붙은 값은 빼고 카탈로그 모양만 남긴다
  return {
    updatedAt,
    piece: {
      pieceId: piece.pieceId,
      pieceTitle: piece.pieceTitle,
      opusNumber: piece.opusNumber,
      composerId: piece.composerId,
      composerName: piece.composerName,
      composerAvatarUrl: piece.composerAvatarUrl,
      sectorCount: piece.sectorCount,
      performerCount: piece.performerCount,
      performers: piece.performers,
      // 머리 커버·색 번짐이 장르를 쓴다. 빠지면 미리 채운 머리가 뉴트럴 커버로 남는다
      genre: piece.genre ?? null,
      coverVideoId: piece.coverVideoId ?? null,
    },
  };
}

/**
 * 작품 한 개의 카탈로그 정보(작곡가 초상·작품번호·연주자 얼굴). 작곡가 필터로 찾는다.
 * 앞 화면 목록에 이미 있으면 그 값으로 바로 시작해 머리가 스켈레톤을 거치지 않는다.
 */
export function useComparisonPiece(pieceId: number | undefined, composerId: number | undefined) {
  const queryClient = useQueryClient();
  const id = pieceId ?? 0;
  return useQuery({
    ...comparisonPieceQueryOptions(id, composerId),
    enabled: id > 0 && (composerId ?? 0) > 0,
    initialData: () => (id > 0 ? findCachedComparisonPiece(queryClient, id)?.piece : undefined),
    initialDataUpdatedAt: () => (id > 0 ? findCachedComparisonPiece(queryClient, id)?.updatedAt : undefined),
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
export function comparableComposersQueryOptions() {
  return queryOptions({
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

export function useComparableComposers() {
  return useQuery(comparableComposersQueryOptions());
}

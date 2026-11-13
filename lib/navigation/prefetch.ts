import { defaultComparisonSector, sortComparisonSectors } from '@/lib/data/comparison';
import { isPieceGenre, type PieceGenre } from '@/lib/design/genre-palette';
import { artistQueryOptions } from '@/lib/query/hooks/use-artists';
import {
  comparableComposersQueryOptions,
  comparisonPieceQueryOptions,
  comparisonPiecesQueryOptions,
  findCachedComparisonPiece,
  genrePiecesQueryOptions,
  pieceSectorsQueryOptions,
  sectorPerformancesQueryOptions,
} from '@/lib/query/hooks/use-comparison-performances';
import { composerQueryOptions } from '@/lib/query/hooks/use-composers';
import { composerCatalogQueryOptions } from '@/lib/query/hooks/use-pieces';
import { type QueryClient, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { Platform } from 'react-native';

/** 다음 화면에서 먼저 그릴 데이터. 화면 훅과 같은 쿼리 설정을 써서 캐시를 그대로 이어받는다 */
export type PrefetchTarget =
  | { kind: 'piece'; pieceId: number; composerId?: number; sectorId?: number | null }
  | { kind: 'artist'; artistId: number }
  | { kind: 'composer'; composerId: number }
  /** 비교 탭 첫 화면(작곡가 목록) */
  | { kind: 'compare-catalog' }
  /** 장르 화면 첫 쪽 */
  | { kind: 'genre'; genre: PieceGenre };

/** 호버가 이만큼 머물러야 부른다. 격자 위를 훑고 지나갈 때 요청이 쏟아지지 않게 한다 */
const HOVER_INTENT_MS = 80;

function targetKey(target: PrefetchTarget): string {
  switch (target.kind) {
    case 'piece':
      return `piece:${target.pieceId}:${target.sectorId ?? ''}`;
    case 'artist':
      return `artist:${target.artistId}`;
    case 'composer':
      return `composer:${target.composerId}`;
    case 'compare-catalog':
      return 'compare-catalog';
    case 'genre':
      return `genre:${target.genre}`;
  }
}

async function prefetchPiece(
  queryClient: QueryClient,
  {
    pieceId,
    composerId,
    sectorId,
  }: { pieceId: number; composerId?: number; sectorId?: number | null }
): Promise<void> {
  if (pieceId <= 0) return;
  // 머리에 쓰는 작품 정보: 받아 둔 목록에 있으면 그대로 옮기고, 없으면 작곡가 카탈로그에서 찾는다
  if (composerId && composerId > 0) {
    const options = comparisonPieceQueryOptions(pieceId, composerId);
    if (queryClient.getQueryData(options.queryKey) === undefined) {
      const cached = findCachedComparisonPiece(queryClient, pieceId);
      if (cached)
        queryClient.setQueryData(options.queryKey, cached.piece, { updatedAt: cached.updatedAt });
      else void queryClient.prefetchQuery(options);
    }
  }
  // 구간 → 처음 열릴 구간의 연주 순서로 이어 받는다 (화면이 고르는 기본 구간과 같은 규칙)
  const sectors = await queryClient.fetchQuery(pieceSectorsQueryOptions(pieceId));
  const sorted = sortComparisonSectors(sectors ?? []);
  const sector = sorted.find((item) => item.id === sectorId) ?? defaultComparisonSector(sorted);
  if (sector) await queryClient.prefetchQuery(sectorPerformancesQueryOptions(sector.id));
}

/** 대상 화면의 첫 데이터를 미리 받는다. 실패해도 화면이 다시 부르므로 오류는 삼킨다 */
export function prefetchTarget(queryClient: QueryClient, target: PrefetchTarget): Promise<void> {
  const run = async () => {
    switch (target.kind) {
      case 'piece':
        await prefetchPiece(queryClient, target);
        return;
      case 'artist':
        if (target.artistId > 0)
          await queryClient.prefetchQuery(artistQueryOptions(target.artistId));
        return;
      case 'composer':
        if (target.composerId <= 0) return;
        await Promise.all([
          queryClient.prefetchQuery(composerQueryOptions(target.composerId)),
          queryClient.prefetchInfiniteQuery(comparisonPiecesQueryOptions(target.composerId)),
          queryClient.prefetchQuery(composerCatalogQueryOptions(target.composerId)),
        ]);
        return;
      case 'compare-catalog':
        await queryClient.prefetchQuery(comparableComposersQueryOptions());
        return;
      case 'genre':
        await queryClient.prefetchInfiniteQuery(genrePiecesQueryOptions(target.genre));
        return;
    }
  };
  return run().catch(() => undefined);
}

export interface PrefetchHandlers {
  onHoverIn?: () => void;
  onHoverOut?: () => void;
  onPressIn?: () => void;
  onFocus?: () => void;
}

/** 포인터는 하나라 호버 대기는 한 번에 하나만 둔다 */
let hoverTimer: ReturnType<typeof setTimeout> | null = null;
let hoverKey: string | null = null;

function cancelHover(key?: string) {
  if (key !== undefined && key !== hoverKey) return;
  if (hoverTimer) clearTimeout(hoverTimer);
  hoverTimer = null;
  hoverKey = null;
}

/**
 * 훅을 쓸 수 없는 곳(목록 map 안)에서 쓰는 미리 부르기 핸들러.
 * 데스크톱 웹은 호버(80ms 머문 뒤)·키보드 포커스에서, 터치는 누르기 시작할 때 부른다.
 */
export function createPrefetchHandlers(
  queryClient: QueryClient,
  target: PrefetchTarget | null | undefined
): PrefetchHandlers {
  if (!target) return {};
  const key = targetKey(target);
  const fire = () => {
    cancelHover(key);
    void prefetchTarget(queryClient, target);
  };
  const handlers: PrefetchHandlers = { onPressIn: fire, onFocus: fire };
  if (Platform.OS === 'web') {
    handlers.onHoverIn = () => {
      cancelHover();
      hoverKey = key;
      hoverTimer = setTimeout(fire, HOVER_INTENT_MS);
    };
    handlers.onHoverOut = () => cancelHover(key);
  }
  return handlers;
}

/**
 * 카드·행에 펼쳐 붙이는 미리 부르기 핸들러.
 *
 *   const prefetch = usePrefetchOnHover({ kind: 'piece', pieceId, composerId });
 *   <Pressable {...prefetch} onPress={open} />
 *
 * 같은 Pressable 에 onPressIn·onHoverIn 을 따로 쓰면 그 안에서 prefetch.onPressIn?.() 을 같이 부른다.
 * 대상이 없으면(null) 빈 객체를 돌려준다.
 */
export function usePrefetchOnHover(target: PrefetchTarget | null | undefined): PrefetchHandlers {
  const queryClient = useQueryClient();
  const key = target ? targetKey(target) : null;
  const targetRef = React.useRef(target);
  targetRef.current = target;
  // 대상 객체가 렌더마다 새로 만들어져도 같은 대상이면 핸들러를 새로 만들지 않는다
  return React.useMemo(
    () => (key ? createPrefetchHandlers(queryClient, targetRef.current) : {}),
    [key, queryClient]
  );
}

/** 주소(href)로 대상을 알아낸다. 사이드바 레퍼토리처럼 주소만 가진 링크에 쓴다 */
export function prefetchTargetFromHref(href: string): PrefetchTarget | null {
  const [path, query = ''] = href.split('?');
  const artist = /^\/artist\/(\d+)$/.exec(path);
  if (artist) return { kind: 'artist', artistId: Number(artist[1]) };
  const composer = /^\/composer\/(\d+)$/.exec(path);
  if (composer) return { kind: 'composer', composerId: Number(composer[1]) };
  if (path === '/compare') {
    const params = new URLSearchParams(query);
    const pieceId = Number(params.get('pieceId'));
    const composerId = Number(params.get('composerId'));
    const sectorId = Number(params.get('sectorId'));
    const genre = params.get('genre');
    if (isPieceGenre(genre)) return { kind: 'genre', genre };
    if (Number.isInteger(pieceId) && pieceId > 0) {
      return {
        kind: 'piece',
        pieceId,
        composerId: Number.isInteger(composerId) && composerId > 0 ? composerId : undefined,
        sectorId: Number.isInteger(sectorId) && sectorId > 0 ? sectorId : undefined,
      };
    }
    if (!query) return { kind: 'compare-catalog' };
  }
  return null;
}

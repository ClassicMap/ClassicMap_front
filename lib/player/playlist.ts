import {
  defaultComparisonSector,
  primaryCredit,
  sortComparisonSectors,
} from '@/lib/data/comparison';
import type { ComparePlayerTrack, Playlist, PlaylistItem } from '@/lib/player/compare-player-store';
import { isPlayablePerformance, trackFromPerformance } from '@/lib/player/compare-track';
import { queryClient } from '@/lib/query/client';
import {
  pieceSectorsQueryOptions,
  sectorPerformancesQueryOptions,
} from '@/lib/query/hooks/useComparisonPerformances';
import type { ComparisonPerformance, ComparisonSector } from '@/lib/types/models';

/**
 * 재생 목록의 곡을 실제 연주로 정하는 규칙. 영화 카드의 「바로 듣기」, 홈·작곡가 카드의 재생,
 * 재생 바의 이전·다음 곡이 모두 이 규칙을 따라서 카드에 적힌 연주자와 넘어가서 나오는 연주자가 같다.
 */

/** 틀 구간: 정해 준 구간, 없으면 연주가 있는 구간 가운데 비교 화면이 처음 여는 구간 */
export function pickSector(
  sectors: readonly ComparisonSector[],
  sectorId?: number | null
): ComparisonSector | undefined {
  const sorted = sortComparisonSectors(sectors);
  if (sectorId) return sorted.find((sector) => sector.id === sectorId);
  return defaultComparisonSector(sorted.filter((sector) => sector.readyPerformanceCount > 0));
}

/**
 * 틀 연주: 같은 연주자를 바라면 그 연주자 먼저. 아니면 그 구간 추천 비교의 첫 연주, 없으면 첫 연주
 */
export function pickLead(
  sector: Pick<ComparisonSector, 'featuredPair'> | undefined,
  playable: readonly ComparisonPerformance[],
  preferArtistId?: number | null
): ComparisonPerformance | undefined {
  if (preferArtistId != null) {
    const same = playable.find(
      (performance) => primaryCredit(performance)?.artistId === preferArtistId
    );
    if (same) return same;
  }
  const featured = sector?.featuredPair?.performanceIds[0];
  return playable.find((performance) => performance.id === featured) ?? playable[0];
}

function imageOf(performance: ComparisonPerformance): string | null {
  return primaryCredit(performance)?.imageUrl ?? null;
}

export interface ResolvedPlaylistItem {
  track: ComparePlayerTrack;
  /** 그 구간의 재생 가능한 연주들(연주자 넘기기 차례) */
  queue: ComparePlayerTrack[];
}

/** 재생 목록의 한 곡을 틀 연주로 정한다. 틀 연주가 없으면 null */
export async function resolvePlaylistItem(
  item: PlaylistItem,
  preferArtistId?: number | null
): Promise<ResolvedPlaylistItem | null> {
  const sectors = await queryClient.fetchQuery(pieceSectorsQueryOptions(item.pieceId));
  const sector = pickSector(sectors ?? [], item.sectorId);
  if (!sector) return null;
  const performances = await queryClient.fetchQuery(sectorPerformancesQueryOptions(sector.id));
  const playable = (performances ?? []).filter(isPlayablePerformance);
  const lead = pickLead(sector, playable, preferArtistId);
  if (!lead) return null;
  return {
    track: trackFromPerformance(lead, imageOf(lead)),
    queue: playable.map((performance) => trackFromPerformance(performance, imageOf(performance))),
  };
}

/** 작품 목록(홈 선반·작곡가 화면·비교 둘러보기)을 재생 목록으로. 이 작품이 목록에 없으면 이 곡 하나만 */
export function pieceListPlaylist(
  pieceId: number,
  list?: readonly { pieceId: number }[]
): Playlist {
  const items =
    list && list.length > 0
      ? list.map((piece) => ({ pieceId: piece.pieceId, sectorId: null }))
      : [];
  const index = items.findIndex((item) => item.pieceId === pieceId);
  if (index < 0) return { kind: 'list', items: [{ pieceId, sectorId: null }], index: 0 };
  return { kind: 'list', items, index };
}

/** 한 작품의 비교 구간들을 재생 목록으로(비교 화면). 끝나면 다음 구간으로 넘어가지 않는다 */
export function sectorPlaylist(
  pieceId: number,
  sectors: readonly Pick<ComparisonSector, 'id'>[],
  sectorId: number
): Playlist {
  const items = sectors.map((sector) => ({ pieceId, sectorId: sector.id }));
  const index = items.findIndex((item) => item.sectorId === sectorId);
  if (index < 0) return { kind: 'compare', items: [{ pieceId, sectorId }], index: 0 };
  return { kind: 'compare', items, index };
}

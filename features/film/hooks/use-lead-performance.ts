import { primaryCredit } from '@/lib/data/comparison';
import {
  comparePlayer,
  type ComparePlayerTrack,
  type PlaylistItem,
  useComparePlayer,
} from '@/lib/player/compare-player-store';
import { isPlayablePerformance, trackFromPerformance } from '@/lib/player/compare-track';
import { pickLead, pickSector } from '@/lib/player/playlist';
import {
  usePieceComparisonSectors,
  useSectorComparisonPerformances,
} from '@/lib/query/hooks/use-comparison-performances';
import * as React from 'react';

/**
 * 영화 속 클래식 곡 카드에서 바로 들을 대표 연주.
 * 구간을 주면 그 구간, 안 주면 같은 곡에서 연주가 공개된 구간 가운데 비교 화면이 처음 여는 구간에서 고른다.
 * 대표는 그 구간 추천 비교의 첫 연주, 없으면 첫 공개 연주다(재생 바의 이전·다음 곡과 같은 규칙). 클립이 준비된 연주만 튼다.
 * `list`를 주면 그 목록(작품 페이지의 곡들)이 재생 목록이 되어 다음 곡으로 이어진다
 */
export function useLeadPerformance(
  pieceId: number | null,
  sectorId?: number,
  list?: { items: readonly PlaylistItem[]; index: number; name?: string }
) {
  const sectors = usePieceComparisonSectors(pieceId ?? undefined);
  const sector = React.useMemo(
    () => pickSector(sectors.data ?? [], sectorId) ?? null,
    [sectors.data, sectorId]
  );
  const targetSectorId = sectorId ?? sector?.id;
  const performances = useSectorComparisonPerformances(targetSectorId);
  const playable = React.useMemo(
    () => (performances.data ?? []).filter(isPlayablePerformance),
    [performances.data]
  );
  const lead = React.useMemo(
    () => pickLead(sector ?? undefined, playable) ?? null,
    [playable, sector]
  );

  const current = useComparePlayer((state) => state.current);
  const playing = useComparePlayer((state) => state.playing);
  const isCurrent = Boolean(lead && current?.performanceId === lead.id);

  const toggle = React.useCallback(() => {
    if (!lead || pieceId === null) return;
    if (isCurrent && comparePlayer.togglePlay()) return;
    const imageOf = (performance: (typeof playable)[number]) =>
      primaryCredit(performance)?.imageUrl ?? null;
    const queue: ComparePlayerTrack[] = playable.map((performance) =>
      trackFromPerformance(performance, imageOf(performance))
    );
    const playlist =
      list && list.index >= 0
        ? { kind: 'list' as const, items: list.items, index: list.index, name: list.name }
        : {
            kind: 'list' as const,
            items: [{ pieceId, sectorId: targetSectorId ?? null }],
            index: 0,
          };
    comparePlayer.select(trackFromPerformance(lead, imageOf(lead)), {
      play: true,
      queue,
      playlist,
    });
  }, [lead, isCurrent, playable, list, pieceId, targetSectorId]);

  return {
    lead,
    artistName: lead ? (primaryCredit(lead)?.artistName ?? null) : null,
    sectorId: targetSectorId ?? null,
    performanceCount: playable.length,
    loading: sectors.isLoading || performances.isLoading,
    playing: isCurrent && playing,
    toggle,
  };
}

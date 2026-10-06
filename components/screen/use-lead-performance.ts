import { primaryCredit } from '@/lib/data/comparison';
import { comparePlayer, type ComparePlayerTrack, useComparePlayer } from '@/lib/player/compare-player-store';
import { isPlayablePerformance, trackFromPerformance } from '@/lib/player/compare-track';
import { usePieceComparisonSectors, useSectorComparisonPerformances } from '@/lib/query/hooks/useComparisonPerformances';
import * as React from 'react';

/**
 * 영화 속 클래식 곡 카드에서 바로 들을 대표 연주.
 * 구간을 주면 그 구간, 안 주면 같은 곡에서 연주가 공개된 첫 구간에서 고른다.
 * 대표는 그 구간 추천 비교의 첫 연주, 없으면 첫 공개 연주다. 클립이 준비된 연주만 튼다
 */
export function useLeadPerformance(pieceId: number | null, sectorId?: number) {
  const sectors = usePieceComparisonSectors(pieceId ?? undefined);
  const sector = React.useMemo(() => {
    const list = sectors.data ?? [];
    if (sectorId) return list.find((item) => item.id === sectorId) ?? null;
    return list.find((item) => item.readyPerformanceCount > 0) ?? null;
  }, [sectors.data, sectorId]);
  const targetSectorId = sectorId ?? sector?.id;
  const performances = useSectorComparisonPerformances(targetSectorId);
  const playable = React.useMemo(() => (performances.data ?? []).filter(isPlayablePerformance), [performances.data]);
  const lead = React.useMemo(() => {
    const featured = sector?.featuredPair?.performanceIds[0];
    return playable.find((performance) => performance.id === featured) ?? playable[0] ?? null;
  }, [playable, sector]);

  const current = useComparePlayer((state) => state.current);
  const playing = useComparePlayer((state) => state.playing);
  const isCurrent = Boolean(lead && current?.performanceId === lead.id);

  const toggle = React.useCallback(() => {
    if (!lead) return;
    if (isCurrent && comparePlayer.togglePlay()) return;
    const imageOf = (performance: (typeof playable)[number]) => primaryCredit(performance)?.imageUrl ?? null;
    const queue: ComparePlayerTrack[] = playable.map((performance) => trackFromPerformance(performance, imageOf(performance)));
    comparePlayer.select(trackFromPerformance(lead, imageOf(lead)), { play: true, queue });
  }, [lead, isCurrent, playable]);

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

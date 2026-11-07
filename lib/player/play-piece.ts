import { defaultComparisonSector, primaryCredit, sortComparisonSectors } from '@/lib/data/comparison';
import { comparePlayer } from '@/lib/player/compare-player-store';
import { isPlayablePerformance, trackFromPerformance } from '@/lib/player/compare-track';
import { pieceSectorsQueryOptions, sectorPerformancesQueryOptions } from '@/lib/query/hooks/useComparisonPerformances';
import type { QueryClient } from '@tanstack/react-query';

/**
 * 작품을 그 자리에서 바로 재생한다(스포티파이 카드·머리 재생 버튼). 비교 화면이 처음 여는 구간의
 * 연주들을 차례 목록으로 싣고 첫 연주부터 튼다. 영상은 하단 플레이바(미니 플레이어)에 뜬다.
 * 재생할 연주가 없으면 false.
 */
export async function playPiece(
  queryClient: QueryClient,
  target: { pieceId: number; sectorId?: number | null }
): Promise<boolean> {
  const sectors = await queryClient.fetchQuery(pieceSectorsQueryOptions(target.pieceId));
  const sorted = sortComparisonSectors(sectors ?? []);
  const sector = sorted.find((item) => item.id === target.sectorId) ?? defaultComparisonSector(sorted);
  if (!sector) return false;
  const performances = await queryClient.fetchQuery(sectorPerformancesQueryOptions(sector.id));
  const playable = (performances ?? []).filter(isPlayablePerformance);
  if (playable.length === 0) return false;
  const queue = playable.map((performance) => trackFromPerformance(performance, primaryCredit(performance)?.imageUrl ?? null));
  comparePlayer.select(queue[0], { play: true, queue, mode: 'resume' });
  return true;
}

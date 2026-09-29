import { clipDurationMs, primaryCredit } from '@/lib/data/comparison';
import type { ComparePlayerTrack } from '@/lib/player/compare-player-store';
import type { ComparisonPerformance } from '@/lib/types/models';

/** 재생 규칙: 클립이 준비된 연주만 재생 UI를 둔다 (clipStatus !== 'ready'는 재생하지 않는다) */
export function isPlayablePerformance(performance: ComparisonPerformance): boolean {
  return performance.clipStatus === 'ready' && Boolean(performance.clipUrl);
}

/** 비교 연주를 재생 스토어의 트랙으로. 사진은 카탈로그·크레딧에서 아는 것만 넘긴다 */
export function trackFromPerformance(performance: ComparisonPerformance, imageUrl: string | null): ComparePlayerTrack {
  const credit = primaryCredit(performance);
  return {
    performanceId: performance.id,
    pieceId: performance.pieceId,
    composerId: performance.composerId,
    sectorId: performance.sectorId,
    pieceTitle: performance.pieceTitle,
    sectorName: performance.sectorName,
    artistId: credit?.artistId ?? null,
    artistName: credit?.artistName ?? '연주자 정보 없음',
    artistImageUrl: imageUrl,
    durationSec: clipDurationMs(performance) / 1000,
    clipUrl: performance.clipUrl,
    videoId: performance.videoId,
    startMs: performance.startMs,
    endMs: performance.endMs,
  };
}

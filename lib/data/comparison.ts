import type {
  ComparisonPerformance,
  ComparisonPiece,
  ComparisonSector,
  PerformanceCredit,
} from '../types/models';

/** 밀리초를 `분:초`로 */
export function clipClock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function clipDurationMs(performance: Pick<ComparisonPerformance, 'startMs' | 'endMs'>): number {
  return Math.max(0, performance.endMs - performance.startMs);
}

export function primaryCredit(performance: ComparisonPerformance): PerformanceCredit | undefined {
  return performance.credits.find((credit) => credit.isPrimary) ?? performance.credits[0];
}

/** 지휘자·악단처럼 주 연주자 곁에 붙는 이름 */
export function supportingCredits(performance: ComparisonPerformance): string {
  return performance.credits
    .filter((credit) => !credit.isPrimary && (credit.role === 'conductor' || credit.role === 'orchestra'))
    .map((credit) => (credit.role === 'conductor' ? `${credit.artistName} 지휘` : credit.artistName))
    .join(' · ');
}

/** 원본 영상의 그 구간으로 바로 가는 링크 */
export function youtubeWatchUrl(performance: ComparisonPerformance): string | undefined {
  if (!performance.videoId) return undefined;
  return `https://www.youtube.com/watch?v=${performance.videoId}&t=${Math.floor(performance.startMs / 1000)}s`;
}

export function youtubeThumbnailUrl(performance: ComparisonPerformance): string | undefined {
  return performance.videoId ? `https://i.ytimg.com/vi/${performance.videoId}/hqdefault.jpg` : undefined;
}

export function sortComparisonSectors(sectors: readonly ComparisonSector[]): ComparisonSector[] {
  return [...sectors].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.id - b.id);
}

/**
 * 오늘의 비교: 연주자가 많은 앞쪽 작품 중에서 날짜로 하나를 고른다.
 * 같은 날에는 누구에게나 같은 작품이 나온다.
 */
export function pickDailyPiece(
  pieces: readonly ComparisonPiece[],
  today: Date,
  poolSize = 8
): ComparisonPiece | undefined {
  const pool = pieces.slice(0, poolSize);
  if (pool.length === 0) return undefined;
  const dayNumber = Math.floor(
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) / 86_400_000
  );
  return pool[dayNumber % pool.length];
}

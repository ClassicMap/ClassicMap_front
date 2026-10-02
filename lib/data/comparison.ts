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

/**
 * 표시 순서만 맞춘다. 같은 순서끼리는 API가 준 순서(실제 연주 시작 시각 순)를 그대로 둔다.
 * id로 다시 정렬하면 3악장 클라이맥스가 도입부보다 앞에 온다.
 * 전곡은 다른 구간을 다 품으므로 맨 앞에 둔다. API 순서로는 서주와 제2주제 사이에 끼었다.
 */
export function sortComparisonSectors(sectors: readonly ComparisonSector[]): ComparisonSector[] {
  return [...sectors].sort(
    (a, b) => Number(isWholeWorkSector(b)) - Number(isWholeWorkSector(a)) || (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
  );
}

/** 곡 전체를 한 구간으로 비교하는 구간 */
export function isWholeWorkSector(sector: Pick<ComparisonSector, 'sectorType'>): boolean {
  return sector.sectorType === 'WHOLE_WORK';
}

/**
 * 처음 열 구간. 전곡은 맨 앞에 있어도 길어서, 발췌 구간이 있으면 그 첫 구간부터 연다
 */
export function defaultComparisonSector(sectors: readonly ComparisonSector[]): ComparisonSector | undefined {
  return sectors.find((sector) => !isWholeWorkSector(sector)) ?? sectors[0];
}

/** 같은 대목의 해석이 아니라 편성이 다른 편곡을 나란히 듣는 구간 */
export function isArrangementSector(sector: Pick<ComparisonSector, 'sectorType'>): boolean {
  return sector.sectorType === 'ARRANGEMENTS';
}

export interface EmphasisSegment {
  text: string;
  strong: boolean;
}

/**
 * 구간 안내의 `**강조**` 표시를 조각으로 나눈다. 짝이 맞지 않는 `**` 는 글자 그대로 둔다.
 */
export function splitEmphasis(text: string): EmphasisSegment[] {
  const segments: EmphasisSegment[] = [];
  const pattern = /\*\*(.+?)\*\*/g;
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) segments.push({ text: text.slice(cursor, index), strong: false });
    segments.push({ text: match[1], strong: true });
    cursor = index + match[0].length;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), strong: false });
  return segments;
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

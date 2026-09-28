/**
 * 작곡가 생애 막대 배치 (2차 시안 타임라인).
 * 막대가 겹치지 않게 가장 위쪽 빈 줄에 차례로 넣는다(greedy interval packing).
 */
export interface LifeSpan {
  id: number;
  birthYear: number;
  /** 생존 작곡가는 null */
  deathYear: number | null;
}

export interface PlacedSpan<T extends LifeSpan> {
  item: T;
  lane: number;
  startYear: number;
  endYear: number;
}

export function placeLifeSpans<T extends LifeSpan>(
  items: readonly T[],
  options: { currentYear: number; gapYears: number; minSpanYears: number }
): { placed: PlacedSpan<T>[]; laneCount: number } {
  const sorted = [...items]
    .filter((item) => Number.isFinite(item.birthYear) && item.birthYear > 0)
    .sort((a, b) => a.birthYear - b.birthYear || a.id - b.id);
  const laneEnds: number[] = [];
  const placed: PlacedSpan<T>[] = [];
  for (const item of sorted) {
    const startYear = item.birthYear;
    // 막대 안에 이름이 들어가도록 최소 길이를 둔다
    const endYear = Math.max(item.deathYear ?? options.currentYear, startYear + options.minSpanYears);
    let lane = laneEnds.findIndex((end) => end + options.gapYears <= startYear);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(endYear);
    } else {
      laneEnds[lane] = endYear;
    }
    placed.push({ item, lane, startYear, endYear });
  }
  return { placed, laneCount: laneEnds.length };
}

/** 축 눈금: 범위를 50년 단위로 */
export function yearTicks(fromYear: number, toYear: number, step = 50): number[] {
  const ticks: number[] = [];
  for (let year = Math.ceil(fromYear / step) * step; year <= toYear; year += step) ticks.push(year);
  return ticks;
}

/**
 * 작곡가 타임라인 배치 (얇은 간트 + 줌 단계).
 * 연도가 아니라 화면 px로 자리를 잡는다. 막대 위에 붙는 이름표 폭까지 한 줄의 점유 구간으로 본다.
 */
export interface LifeSpan {
  id: number;
  birthYear: number;
  /** 생존 작곡가는 null */
  deathYear: number | null;
}

export interface LabeledSpanInput<T> {
  item: T;
  /** 막대 시작·끝 px */
  startX: number;
  endX: number;
  /** 이름표(사진·도트 포함) 폭 px */
  labelWidth: number;
  /** 작을수록 먼저 자리를 받는다 */
  priority: number;
}

export interface PlacedLabeledSpan<T> {
  item: T;
  lane: number;
  startX: number;
  endX: number;
  /** 이름표 왼쪽 px. 오른쪽 끝을 넘으면 안쪽으로 당긴다 */
  labelX: number;
  labelWidth: number;
}

export interface LabeledSpanLayout<T> {
  placed: PlacedLabeledSpan<T>[];
  /** 줄이 모자라 못 들어간 항목 */
  overflow: T[];
  laneCount: number;
}

/**
 * 우선순위 순서대로(같은 순위는 시작점 순) 가장 위쪽 빈 줄에 넣는다.
 * 줄 수가 maxLanes를 넘으면 그 항목은 overflow로 뺀다.
 * 우선순위가 높은 작곡가가 위쪽 줄을 차지하고, 줌을 키우면 자리가 늘어 더 많은 작곡가가 들어온다.
 */
export function placeLabeledSpans<T>(
  inputs: readonly LabeledSpanInput<T>[],
  options: { gapPx: number; maxLanes: number; rightEdge: number }
): LabeledSpanLayout<T> {
  const sorted = [...inputs].sort((a, b) => a.priority - b.priority || a.startX - b.startX);
  // 줄마다 점유 구간 [시작, 끝] 목록
  const lanes: [number, number][][] = [];
  const placed: PlacedLabeledSpan<T>[] = [];
  const overflow: T[] = [];

  for (const input of sorted) {
    const labelX = Math.min(input.startX, Math.max(0, options.rightEdge - input.labelWidth));
    const from = Math.min(input.startX, labelX);
    const to = Math.max(input.endX, labelX + input.labelWidth);
    let lane = lanes.findIndex((segments) =>
      segments.every(([start, end]) => to + options.gapPx <= start || end + options.gapPx <= from)
    );
    if (lane === -1) {
      if (lanes.length >= options.maxLanes) {
        overflow.push(input.item);
        continue;
      }
      lane = lanes.length;
      lanes.push([]);
    }
    lanes[lane].push([from, to]);
    placed.push({
      item: input.item,
      lane,
      startX: input.startX,
      endX: input.endX,
      labelX,
      labelWidth: input.labelWidth,
    });
  }
  return { placed, overflow, laneCount: lanes.length };
}

/**
 * 이름표 폭 추정 (11px 세미볼드 기준). 조금 넉넉하게 잡아 이름이 겹치지 않게 한다.
 * 한글·한자는 거의 정사각, 라틴 문자는 그보다 좁다.
 */
export function estimateLabelWidth(text: string, fontSize = 11): number {
  let width = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code >= 0x1100) width += fontSize * 0.98;
    else if (char === ' ') width += fontSize * 0.28;
    else if (char === '.' || char === ',' || char === "'" || char === 'i' || char === 'l') width += fontSize * 0.3;
    else if (char >= 'A' && char <= 'Z') width += fontSize * 0.66;
    else width += fontSize * 0.56;
  }
  return Math.ceil(width);
}

/** 10년마다 살아 있던 작곡가 수를 시대별로 센다. 밀도 띠에 쓴다. */
export interface DecadeDensity {
  decade: number;
  total: number;
  byEra: Record<string, number>;
}

export function decadeDensity<T extends LifeSpan & { period: string }>(
  items: readonly T[],
  options: { fromYear: number; toYear: number; currentYear: number }
): DecadeDensity[] {
  const first = Math.floor(options.fromYear / 10) * 10;
  const buckets: DecadeDensity[] = [];
  for (let decade = first; decade <= options.toYear; decade += 10) {
    buckets.push({ decade, total: 0, byEra: {} });
  }
  for (const item of items) {
    if (!Number.isFinite(item.birthYear) || item.birthYear <= 0) continue;
    const end = item.deathYear ?? options.currentYear;
    const fromIndex = Math.max(0, Math.floor((item.birthYear - first) / 10));
    const toIndex = Math.min(buckets.length - 1, Math.floor((end - first) / 10));
    for (let index = fromIndex; index <= toIndex; index += 1) {
      const bucket = buckets[index];
      bucket.total += 1;
      bucket.byEra[item.period] = (bucket.byEra[item.period] ?? 0) + 1;
    }
  }
  return buckets;
}

/** 축 눈금: 눈금 사이가 minGapPx 이상 벌어지는 가장 촘촘한 간격을 고른다 */
export function yearTicks(fromYear: number, toYear: number, pxPerYear: number, minGapPx = 64): number[] {
  const step = [10, 25, 50, 100].find((candidate) => candidate * pxPerYear >= minGapPx) ?? 100;
  const ticks: number[] = [];
  for (let year = Math.ceil(fromYear / step) * step; year <= toYear; year += step) ticks.push(year);
  return ticks;
}

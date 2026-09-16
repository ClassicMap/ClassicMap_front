/**
 * 비교 구간을 곡 전체 오선 위에 앉히기 위한 위치 계산.
 *
 * 음표 값(8분·4분·2분·온음표)은 "얼마나 긴가"만 말하고 "곡 어디쯤인가"를 못 말합니다.
 * 구간의 실제 `startMs` / `endMs`를 그대로 가로 위치로 쓰면 둘 다 한 번에 읽힙니다.
 */

export type SectionClip = { startMs: number; endMs: number };

export type SectionPlacement = {
  /** 타임라인 왼쪽 끝에서의 위치(%) */
  leftPercent: number;
  /** 타임라인 폭 대비 구간 길이(%) */
  widthPercent: number;
  startLabel: string;
  endLabel: string;
};

function clock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * 한 연주자의 구간들을 그 연주의 타임라인 위에 배치합니다.
 *
 * 타임라인 길이는 마지막 구간의 끝입니다. 곡의 `durationMinutes`를 쓰지 않는 이유는
 * 실연 영상이 그보다 길 수 있기 때문입니다(실측: 라흐 3번 40분 표기, 임윤찬 실연 42:32).
 * 연주자마다 시각이 다르므로 **한 연주를 기준으로 삼고 A/B를 바꾸면 다시 계산**합니다.
 */
export function placeSections(clips: readonly SectionClip[]): SectionPlacement[] {
  const valid = clips.filter((c) => Number.isFinite(c.startMs) && c.endMs > c.startMs);
  if (valid.length === 0) return [];
  const total = Math.max(...valid.map((c) => c.endMs));
  if (total <= 0) return [];
  return valid.map((c) => ({
    leftPercent: (c.startMs / total) * 100,
    widthPercent: ((c.endMs - c.startMs) / total) * 100,
    startLabel: clock(c.startMs),
    endLabel: clock(c.endMs),
  }));
}

/**
 * 악장이 바뀌는 지점을 구간 사이 중간값으로 잡습니다.
 *
 * **정확한 악장 경계 시각은 백엔드에 없습니다(B24).** 화면에서는 겹세로줄을 그리는
 * 용도로만 쓰고, 이 값을 시각으로 표시하거나 재생 위치로 쓰지 않습니다.
 */
export function movementBoundaries(
  sections: readonly (SectionClip & { movement: number })[]
): number[] {
  const out: number[] = [];
  for (let i = 1; i < sections.length; i += 1) {
    const prev = sections[i - 1];
    const cur = sections[i];
    if (cur.movement !== prev.movement) out.push((prev.endMs + cur.startMs) / 2);
  }
  const total = Math.max(...sections.map((s) => s.endMs));
  return total > 0 ? out.map((ms) => (ms / total) * 100) : [];
}

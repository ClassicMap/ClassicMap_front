import type { ClipAlignment } from '@/lib/types/models';

/** 끝에 딱 붙으면 바로 끝나 버려서 조금 안쪽에서 멈춘다 */
const END_GUARD_SEC = 0.1;

/**
 * 집중 비교에서 한 연주의 위치를 다른 연주의 같은 지점으로 옮긴다.
 * 구간 안 상대 위치(비율)를 그대로 옮긴다. 정렬 지도가 없을 때 쓴다.
 */
export function alignAcross(seconds: number, fromLength: number, toLength: number): number {
  if (!(fromLength > 0) || !(toLength > 0) || !Number.isFinite(seconds)) return 0;
  const target = (seconds / fromLength) * toLength;
  return Math.max(0, Math.min(toLength - END_GUARD_SEC, target));
}

/** 같은 지점을 찾을 연주. 길이는 재생 중인 영상의 길이(초)다 */
export interface AlignedClip {
  id: number;
  lengthSec: number;
  alignment: ClipAlignment | null;
}

/** 지도 위에서 기준 시각(ms)의 이 연주 시점(ms) */
function positionAt(alignment: ClipAlignment, referenceMs: number): number {
  const { positionsMs, stepMs } = alignment;
  const index = Math.max(0, Math.min(positionsMs.length - 1, referenceMs / stepMs));
  const low = Math.floor(index);
  const high = Math.min(positionsMs.length - 1, low + 1);
  return positionsMs[low] + (positionsMs[high] - positionsMs[low]) * (index - low);
}

/** 이 연주 시점(ms)의 기준 시각(ms). 지도는 줄지 않으므로 이분 탐색한다. 같은 값이 이어지면 가운데로 */
function referenceAt(alignment: ClipAlignment, clipMs: number): number {
  const { positionsMs, stepMs } = alignment;
  const last = positionsMs.length - 1;
  if (clipMs <= positionsMs[0]) return 0;
  if (clipMs >= positionsMs[last]) return last * stepMs;
  let low = 0;
  let high = last;
  while (high - low > 1) {
    const middle = (low + high) >> 1;
    if (positionsMs[middle] <= clipMs) low = middle;
    else high = middle;
  }
  const span = positionsMs[high] - positionsMs[low];
  if (span <= 0) return ((low + high) / 2) * stepMs;
  return (low + (clipMs - positionsMs[low]) / span) * stepMs;
}

/** 두 연주가 같은 기준의 지도를 가졌는지. 기준 연주 자신도 자기 지도(그대로)를 가진다 */
export function sharesMap(from: AlignedClip, to: AlignedClip): boolean {
  return Boolean(
    from.alignment && to.alignment && from.alignment.referencePerformanceId === to.alignment.referencePerformanceId
  );
}

/**
 * `from` 의 `seconds` 와 같은 마디인 `to` 의 시점(초).
 * 둘 다 같은 기준의 정렬 지도가 있으면 지도로 찾고, 아니면 구간 안 비율로 옮긴다.
 * 지도 길이와 영상 길이가 조금 다를 수 있어(클립 경계 반올림) 영상 길이 비로 한 번 더 맞춘다.
 */
export function sameMoment(seconds: number, from: AlignedClip, to: AlignedClip): number {
  if (!(from.lengthSec > 0) || !(to.lengthSec > 0) || !Number.isFinite(seconds)) return 0;
  if (!sharesMap(from, to) || !from.alignment || !to.alignment) {
    return alignAcross(seconds, from.lengthSec, to.lengthSec);
  }
  const fromMapEnd = from.alignment.positionsMs[from.alignment.positionsMs.length - 1] / 1000;
  const toMapEnd = to.alignment.positionsMs[to.alignment.positionsMs.length - 1] / 1000;
  const fromScale = fromMapEnd > 0 ? fromMapEnd / from.lengthSec : 1;
  const toScale = toMapEnd > 0 ? to.lengthSec / toMapEnd : 1;
  const referenceMs = referenceAt(from.alignment, seconds * fromScale * 1000);
  const target = (positionAt(to.alignment, referenceMs) / 1000) * toScale;
  return Math.max(0, Math.min(to.lengthSec - END_GUARD_SEC, target));
}

/**
 * 지금 자리에서 `to` 가 `from` 을 따라가려면 얼마나 빨리 가야 하는지(재생 빠르기).
 * 앞으로 몇 초 사이의 같은 지점 변화로 잰다. 지도가 없으면 길이 비다
 */
export function followRate(seconds: number, from: AlignedClip, to: AlignedClip, aheadSec = 2): number {
  if (!(from.lengthSec > 0) || !(to.lengthSec > 0)) return 1;
  if (!sharesMap(from, to)) return to.lengthSec / from.lengthSec;
  const start = Math.min(seconds, Math.max(0, from.lengthSec - aheadSec));
  const rate = (sameMoment(start + aheadSec, from, to) - sameMoment(start, from, to)) / aheadSec;
  return Number.isFinite(rate) && rate > 0 ? rate : to.lengthSec / from.lengthSec;
}

/** 0.1초 단위 시각 (m:ss.s). 미세 조정에서 쓴다 */
export function fineClock(seconds: number): string {
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const tenths = Math.round(safe * 10);
  const minutes = Math.floor(tenths / 600);
  const rest = (tenths % 600) / 10;
  return `${minutes}:${rest < 10 ? '0' : ''}${rest.toFixed(1)}`;
}

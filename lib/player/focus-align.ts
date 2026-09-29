/**
 * 집중 비교에서 A의 위치를 B의 같은 대목으로 옮기는 계산.
 *
 * 기준점이 없으면 구간 안 상대 위치(비율)를 그대로 옮긴다.
 * 기준점(두 영상에서 같은 대목이라고 사용자가 맞춰 둔 위치 한 쌍)이 있으면, 기준점에서 지난 시간을
 * 두 연주 길이의 비율(빠르기 차이)만큼 늘이거나 줄여 옮긴다.
 *   to = anchor.to + (from − anchor.from) × (toLength / fromLength)
 */
export interface AlignAnchor {
  /** 옮겨 오는 쪽 기준점(초) */
  from: number;
  /** 옮겨 가는 쪽 기준점(초) */
  to: number;
}

/** 끝에 딱 붙으면 바로 끝나 버려서 조금 안쪽에서 멈춘다 */
const END_GUARD_SEC = 0.1;

export function alignAcross(
  seconds: number,
  fromLength: number,
  toLength: number,
  anchor: AlignAnchor | null
): number {
  if (!(fromLength > 0) || !(toLength > 0) || !Number.isFinite(seconds)) return 0;
  const target = anchor
    ? anchor.to + (seconds - anchor.from) * (toLength / fromLength)
    : (seconds / fromLength) * toLength;
  return Math.max(0, Math.min(toLength - END_GUARD_SEC, target));
}

/** 두 연주의 기준점 저장 키. 순서와 상관없이 같은 쌍이면 같은 키 */
export function anchorPairKey(first: number, second: number): string {
  return first < second ? `${first}-${second}` : `${second}-${first}`;
}

/** 0.1초 단위 시각 (m:ss.s). 미세 조정에서 쓴다 */
export function fineClock(seconds: number): string {
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const tenths = Math.round(safe * 10);
  const minutes = Math.floor(tenths / 600);
  const rest = (tenths % 600) / 10;
  return `${minutes}:${rest < 10 ? '0' : ''}${rest.toFixed(1)}`;
}

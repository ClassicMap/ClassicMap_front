/** 끝에 딱 붙으면 바로 끝나 버려서 조금 안쪽에서 멈춘다 */
const END_GUARD_SEC = 0.1;

/**
 * 집중 비교에서 한 연주의 위치를 다른 연주의 같은 지점으로 옮긴다.
 * 구간 안 상대 위치(비율)를 그대로 옮긴다.
 */
export function alignAcross(seconds: number, fromLength: number, toLength: number): number {
  if (!(fromLength > 0) || !(toLength > 0) || !Number.isFinite(seconds)) return 0;
  const target = (seconds / fromLength) * toLength;
  return Math.max(0, Math.min(toLength - END_GUARD_SEC, target));
}

/** 0.1초 단위 시각 (m:ss.s). 미세 조정에서 쓴다 */
export function fineClock(seconds: number): string {
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const tenths = Math.round(safe * 10);
  const minutes = Math.floor(tenths / 600);
  const rest = (tenths % 600) / 10;
  return `${minutes}:${rest < 10 ? '0' : ''}${rest.toFixed(1)}`;
}

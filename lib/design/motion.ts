/** 모션 토큰 (설계 문서 4.6). Tailwind의 `duration-*` / `ease-*`와 같은 값이다. */
export const MOTION = {
  instant: { duration: 90, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
  fast: { duration: 140, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
  base: { duration: 200, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
  slow: { duration: 320, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
} as const;

export type MotionToken = keyof typeof MOTION;

/** 네이티브 Reanimated `withSpring` 기본값 */
export const SPRING = { damping: 22, stiffness: 220 } as const;

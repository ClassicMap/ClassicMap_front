import { useLocale } from '@/lib/i18n';
import { comparePlayer } from '@/lib/player/compare-player-store';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { View } from 'react-native';

interface PlayerSlotProps {
  performanceId: number;
  fit?: 'cover' | 'contain';
  radius?: number;
  /** 영상 기본 조작부를 보인다 (좁은 화면에서 볼륨·위치를 여기서 조절) */
  controls?: boolean;
  className?: string;
}

/**
 * 셸의 비교 영상이 들어올 자리 (웹). 셸이 영상 무대를 이 요소 안으로 옮겨 넣으므로
 * 스크롤하면 영상도 자리와 함께 움직인다.
 * 이 자리가 사라지거나 가려지면 영상은 미니 플레이어로 옮겨 가고 재생은 이어진다.
 *
 * 형제로 둔 누름 자리(재생·일시정지)보다 위에 쌓아야 영상 위 조작부(전체 화면 버튼 등)를 누를 수 있다.
 * 자리 자체는 누름을 통과시키고, 조작부가 있는 자리에서만 안쪽 영상이 누름을 받는다.
 */
export function PlayerSlot({ performanceId, fit = 'cover', radius = 0, controls = false, className }: PlayerSlotProps) {
  useLocale();
  const ref = React.useRef<View>(null);

  // 레이아웃 효과로 건다: 자리가 지워질 때 React 가 DOM 을 떼기 전에 영상을 다른 곳으로 옮겨야
  // 영상이 문서에서 빠져 멈추지 않는다
  React.useLayoutEffect(() => {
    // 웹에서 View의 ref는 DOM 요소다
    const element = ref.current as unknown as HTMLElement | null;
    if (!element) return;
    return comparePlayer.registerSlot({ performanceId, element, fit, radius, controls });
  }, [performanceId, fit, radius, controls]);

  return (
    <View
      ref={ref}
      className={cn('absolute inset-0 bg-black', className)}
      style={{ zIndex: 1, pointerEvents: 'none' }}
    />
  );
}

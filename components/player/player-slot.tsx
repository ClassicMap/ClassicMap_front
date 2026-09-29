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
 * 셸의 비교 영상이 뜰 자리 (웹). 자리만 까맣게 비워 두면 셸 영상이 이 위치에 겹쳐 뜬다.
 * 이 자리가 사라지거나 가려지면 영상은 미니 플레이어로 옮겨 가고 재생은 이어진다.
 */
export function PlayerSlot({ performanceId, fit = 'cover', radius = 0, controls = false, className }: PlayerSlotProps) {
  const ref = React.useRef<View>(null);

  React.useEffect(() => {
    // 웹에서 View의 ref는 DOM 요소다
    const element = ref.current as unknown as HTMLElement | null;
    if (!element) return;
    return comparePlayer.registerSlot({ performanceId, element, fit, radius, controls });
  }, [performanceId, fit, radius, controls]);

  return <View ref={ref} className={cn('absolute inset-0 bg-black', className)} />;
}

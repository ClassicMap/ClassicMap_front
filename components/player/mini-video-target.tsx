import { comparePlayer } from '@/lib/player/compare-player-store';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { View } from 'react-native';

/** 셸 영상이 미니 플레이어로 올 때 뜨는 작은 자리 (웹) */
export function MiniVideoTarget({ width, height, className }: { width: number; height: number; className?: string }) {
  const ref = React.useRef<View>(null);
  React.useEffect(() => {
    // 웹에서 View의 ref는 DOM 요소다
    const element = ref.current as unknown as HTMLElement | null;
    if (!element) return;
    return comparePlayer.registerMiniTarget(element);
  }, []);
  return <View ref={ref} className={cn('overflow-hidden rounded-md bg-black', className)} style={{ width, height }} />;
}

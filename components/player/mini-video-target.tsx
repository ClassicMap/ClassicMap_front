import { useLocale } from '@/lib/i18n';
import { comparePlayer } from '@/lib/player/compare-player-store';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { View } from 'react-native';

/** 셸 영상이 미니 플레이어로 올 때 들어오는 작은 자리 (웹). 셸이 영상 무대를 이 요소 안으로 옮겨 넣는다 */
export function MiniVideoTarget({ width, height, className }: { width: number; height: number; className?: string }) {
  useLocale();
  const ref = React.useRef<View>(null);
  // 레이아웃 효과로 건다: 자리가 지워질 때 DOM 을 떼기 전에 영상을 다른 곳으로 옮겨야 재생이 이어진다
  React.useLayoutEffect(() => {
    // 웹에서 View의 ref는 DOM 요소다
    const element = ref.current as unknown as HTMLElement | null;
    if (!element) return;
    return comparePlayer.registerMiniTarget(element);
  }, []);
  return <View ref={ref} className={cn('overflow-hidden rounded-md bg-black', className)} style={{ width, height }} />;
}

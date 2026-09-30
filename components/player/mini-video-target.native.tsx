import { registerNativeSurface, surfaceRects } from '@/lib/player/native-surface';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { useWindowDimensions, View } from 'react-native';
import Animated, { measure, useAnimatedRef, useFrameCallback } from 'react-native-reanimated';

/** 루트의 비교 영상이 미니 플레이어로 올 때 뜨는 작은 자리 (네이티브) */
export function MiniVideoTarget({ width, height, className }: { width: number; height: number; className?: string }) {
  const ref = useAnimatedRef<View>();
  const { height: windowHeight } = useWindowDimensions();

  // 처음 배치되기 전에 재면 Reanimated가 경고를 낸다. 배치된 뒤부터 잰다
  const [laidOut, setLaidOut] = React.useState(false);
  const tracker = useFrameCallback(() => {
    const frame = measure(ref);
    if (!frame) return;
    const previous = surfaceRects.mini.value;
    if (previous.x === frame.pageX && previous.y === frame.pageY && previous.width === frame.width) return;
    surfaceRects.mini.value = { x: frame.pageX, y: frame.pageY, width: frame.width, height: frame.height };
  }, false);

  React.useEffect(() => {
    tracker.setActive(laidOut);
  }, [laidOut, tracker]);

  React.useEffect(() => {
    return registerNativeSurface({ kind: 'mini', bandTop: 0, bandBottom: windowHeight, radius: 6 });
  }, [windowHeight]);

  return (
    <Animated.View
      ref={ref}
      collapsable={false}
      onLayout={() => setLaidOut(true)}
      className={cn('overflow-hidden rounded-md bg-black', className)}
      style={{ width, height }}
    />
  );
}

import { tabBarHeight } from '@/components/player/player-bar-helpers';
import { registerNativeSurface, surfaceRects } from '@/lib/player/native-surface';
import { cn } from '@/lib/utils';
import { HeaderHeightContext } from '@react-navigation/elements';
import { useIsFocused } from '@react-navigation/native';
import * as React from 'react';
import { useWindowDimensions, View } from 'react-native';
import Animated, { measure, useAnimatedRef, useFrameCallback } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface PlayerSlotProps {
  performanceId: number;
  fit?: 'cover' | 'contain';
  radius?: number;
  controls?: boolean;
  className?: string;
}

/**
 * 루트의 비교 영상(YouTube)이 뜰 자리 (네이티브). 자리는 까맣게 비워 두고, 화면 좌표를 매 프레임
 * UI 스레드에서 적는다. 스크롤해도 영상이 자리를 따라오고, 헤더·탭바 밖으로는 잘린다.
 * 이 화면이 가려지면(다른 탭·위에 쌓인 화면) 자리를 거둬 영상이 미니 플레이어로 옮겨 간다.
 */
export function PlayerSlot({ performanceId, radius = 0, className }: PlayerSlotProps) {
  const ref = useAnimatedRef<View>();
  const focused = useIsFocused();
  const headerHeight = React.useContext(HeaderHeightContext) ?? 0;
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  const tracker = useFrameCallback(() => {
    const frame = measure(ref);
    if (!frame) return;
    const previous = surfaceRects.slot.value;
    if (
      previous.x === frame.pageX &&
      previous.y === frame.pageY &&
      previous.width === frame.width &&
      previous.height === frame.height
    ) {
      return;
    }
    surfaceRects.slot.value = { x: frame.pageX, y: frame.pageY, width: frame.width, height: frame.height };
  }, false);

  // 처음 배치되기 전에 재면 Reanimated가 경고를 낸다. 배치된 뒤부터 잰다
  const [laidOut, setLaidOut] = React.useState(false);

  React.useEffect(() => {
    tracker.setActive(focused && laidOut);
  }, [focused, laidOut, tracker]);

  React.useEffect(() => {
    if (!focused) return;
    return registerNativeSurface({
      kind: 'slot',
      bandTop: headerHeight,
      bandBottom: windowHeight - tabBarHeight(insets.bottom),
      radius,
    });
  }, [focused, headerHeight, insets.bottom, performanceId, radius, windowHeight]);

  return (
    <Animated.View
      ref={ref}
      collapsable={false}
      onLayout={() => setLaidOut(true)}
      className={cn('absolute inset-0 bg-black', className)}
    />
  );
}

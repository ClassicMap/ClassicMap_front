import { useLocale } from '@/lib/i18n';
import { tabBarHeight } from '@/features/player/components/player-bar-helpers';
import { registerNativeSurface, surfaceRects } from '@/lib/player/native-surface';
import { cn } from '@/lib/utils';
import { HeaderHeightContext } from '@react-navigation/elements';
import {
  type EventArg,
  type NavigationProp,
  type ParamListBase,
  useIsFocused,
  useNavigation,
} from '@react-navigation/native';
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
  useLocale();
  const ref = useAnimatedRef<View>();
  const isFocused = useIsFocused();
  const leaving = useLeavingTransition();
  // 밀어서 돌아가는 동안 화면은 옆으로 빠지는데 영상은 루트에서 제자리에 그려지므로, 빠지기 시작하면 자리를 거둔다
  const focused = isFocused && !leaving;
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
    surfaceRects.slot.value = {
      x: frame.pageX,
      y: frame.pageY,
      width: frame.width,
      height: frame.height,
    };
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

type TransitionEvent = EventArg<'transitionStart', false, { closing: boolean }>;

/**
 * 이 화면(또는 이 화면을 품은 탭 묶음)이 스택에서 빠지는 전환 중인지. 밀기가 시작되면 true,
 * 밀다 취소하면 false 로 돌아온다. 스택 밖이면 늘 false
 */
function useLeavingTransition(): boolean {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [leaving, setLeaving] = React.useState(false);
  React.useEffect(() => {
    const unsubscribes: (() => void)[] = [];
    let current: NavigationProp<ParamListBase> | undefined = navigation;
    while (current) {
      const target = current as unknown as {
        addListener: (type: string, callback: (event: TransitionEvent) => void) => () => void;
      };
      unsubscribes.push(
        target.addListener('transitionStart', (event) => setLeaving(event.data.closing)),
        target.addListener('transitionEnd', (event) => {
          if (!event.data.closing) setLeaving(false);
        }),
        target.addListener('gestureCancel', () => setLeaving(false))
      );
      current = current.getParent();
    }
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [navigation]);
  return leaving;
}

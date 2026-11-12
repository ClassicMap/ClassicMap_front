import { cn } from '@/lib/utils';
import * as React from 'react';
import { PanResponder, View } from 'react-native';

import type { SliderProps } from './types';

const THUMB = 16;

/**
 * 앱 구현. @rn-primitives/slider 는 끌기를 구현하지 않아(접근성 동작만) 직접 그린다.
 * 누른 자리로 바로 가고 끌면 따라간다. 스크린리더는 「조절 가능」으로 읽고 위·아래로 쓸어 한 눈금씩 옮긴다.
 * 웹 구현은 index.web.tsx (Base UI)
 */
function Slider({
  value,
  onValueChange,
  onValueCommitted,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  'aria-label': ariaLabel,
  getAriaValueText,
  className,
  classNames,
  indicatorColor,
  thumbChildren,
}: SliderProps) {
  const [width, setWidth] = React.useState(0);
  const [dragValue, setDragValue] = React.useState<number | null>(null);
  const origin = React.useRef(0);
  const latest = React.useRef({ width, min, max, step, disabled, onValueChange, onValueCommitted });
  latest.current = { width, min, max, step, disabled, onValueChange, onValueCommitted };

  const pan = React.useMemo(() => {
    const valueAt = (x: number) => {
      const current = latest.current;
      if (current.width <= 0) return current.min;
      const ratio = Math.max(0, Math.min(1, x / current.width));
      const raw = current.min + ratio * (current.max - current.min);
      const snapped = current.min + Math.round((raw - current.min) / current.step) * current.step;
      return Math.max(current.min, Math.min(current.max, snapped));
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => !latest.current.disabled,
      onMoveShouldSetPanResponder: () => !latest.current.disabled,
      onPanResponderGrant: (event) => {
        origin.current = event.nativeEvent.locationX;
        const next = valueAt(origin.current);
        setDragValue(next);
        latest.current.onValueChange?.(next);
      },
      onPanResponderMove: (_event, gesture) => {
        const next = valueAt(origin.current + gesture.dx);
        setDragValue(next);
        latest.current.onValueChange?.(next);
      },
      onPanResponderRelease: (_event, gesture) => {
        setDragValue(null);
        latest.current.onValueCommitted?.(valueAt(origin.current + gesture.dx));
      },
      // 다른 제스처(스크롤 등)에 넘어가면 끌던 자리에서 놓은 것으로 친다(쓰는 쪽의 끄는 중 상태가 풀리게)
      onPanResponderTerminate: (_event, gesture) => {
        setDragValue(null);
        latest.current.onValueCommitted?.(valueAt(origin.current + gesture.dx));
      },
    });
  }, []);

  const shown = dragValue ?? Math.max(min, Math.min(max, value));
  const ratio = max > min ? (shown - min) / (max - min) : 0;
  const nudge = (direction: 1 | -1) => {
    const next = Math.max(min, Math.min(max, shown + direction * step));
    onValueChange?.(next);
    onValueCommitted?.(next);
  };

  return (
    <View
      {...pan.panHandlers}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={ariaLabel}
      accessibilityState={{ disabled }}
      accessibilityValue={{ min, max, now: shown, text: getAriaValueText?.(shown) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => {
        if (disabled) return;
        if (event.nativeEvent.actionName === 'increment') nudge(1);
        if (event.nativeEvent.actionName === 'decrement') nudge(-1);
      }}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      className={cn(
        'h-8 min-w-0 flex-1 justify-center',
        disabled && 'opacity-50',
        className,
        classNames?.control
      )}>
      <View pointerEvents="none" className={cn('h-1 rounded-full bg-surface-3', classNames?.track)}>
        <View
          className={cn('h-full rounded-full bg-foreground', classNames?.indicator)}
          style={[
            { width: `${ratio * 100}%` },
            indicatorColor ? { backgroundColor: indicatorColor } : null,
          ]}
        />
      </View>
      <View
        pointerEvents="none"
        className={cn('absolute rounded-full bg-foreground', classNames?.thumb)}
        style={{ width: THUMB, height: THUMB, left: ratio * width - THUMB / 2 }}>
        {thumbChildren}
      </View>
    </View>
  );
}

export { Slider };

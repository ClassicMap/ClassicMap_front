import * as React from 'react';
import type { ViewStyle } from 'react-native';

export interface GradientWashProps {
  color?: string | null;
  direction?: 'down' | 'right';
  style?: ViewStyle;
}

/**
 * 웹 색 번짐. 단색 면에 마스크로 옅어짐을 주고 배경색만 바꿔서, 호버로 색이 바뀔 때
 * 그라데이션끼리는 못 하는 부드러운 색 전환(700ms)이 된다. 네이티브 구현은 gradient-wash.tsx
 */
export function GradientWash({ color, direction = 'down', style }: GradientWashProps) {
  return (
    <div
      aria-hidden
      className={direction === 'down' ? 'cm-wash cm-wash-down' : 'cm-wash cm-wash-right'}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        backgroundColor: color ?? 'transparent',
        ...(style as React.CSSProperties | undefined),
      }}
    />
  );
}

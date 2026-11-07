import * as React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

export interface GradientWashProps {
  /** 번지는 색. 없으면 그리지 않는다 */
  color?: string | null;
  /** down: 위에서 아래로 옅어짐(화면 머리), right: 왼쪽에서 오른쪽으로 옅어짐(카드) */
  direction?: 'down' | 'right';
  style?: ViewStyle;
}

/**
 * 화면 머리·카드 뒤에 까는 색 번짐 (스포티파이 상세 화면 위쪽 색). 부모를 꽉 채운다.
 * 네이티브는 SVG 그라데이션이라 색이 바뀔 때 전환 없이 바뀐다. 웹 구현은 gradient-wash.web.tsx
 */
export function GradientWash({ color, direction = 'down', style }: GradientWashProps) {
  const id = React.useId().replace(/:/g, '');
  if (!color) return null;
  const vector =
    direction === 'down'
      ? { x1: '0', y1: '0', x2: '0', y2: '1' }
      : { x1: '0', y1: '0', x2: '1', y2: '0' };
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} {...vector}>
            <Stop offset="0" stopColor={color} stopOpacity={1} />
            <Stop offset="0.45" stopColor={color} stopOpacity={0.5} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

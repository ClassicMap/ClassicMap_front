import * as React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

interface ScrimProps {
  /** 진한 쪽. bottom이면 아래가 진하고 위로 갈수록 투명해진다 */
  from?: 'bottom' | 'left' | 'top';
  color?: string;
  opacity?: number;
  /** 진한 쪽에서 몇 %까지 그라디언트를 깔지 */
  extent?: number;
  style?: ViewStyle;
}

/**
 * 이미지 위 글자를 읽히게 하는 그라디언트 막 (설계 문서 4.5).
 * NativeWind 그라디언트 클래스는 웹에서만 동작해서 SVG로 그린다.
 */
export function Scrim({ from = 'bottom', color = '#000', opacity = 0.72, extent = 60, style }: ScrimProps) {
  const id = React.useId().replace(/:/g, '');
  const vector =
    from === 'bottom'
      ? { x1: '0', y1: '1', x2: '0', y2: '0' }
      : from === 'top'
        ? { x1: '0', y1: '0', x2: '0', y2: '1' }
        : { x1: '0', y1: '0', x2: '1', y2: '0' };
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} {...vector}>
            <Stop offset="0" stopColor={color} stopOpacity={opacity} />
            <Stop offset={String(extent / 100)} stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

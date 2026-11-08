import { useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { Platform, View } from 'react-native';

/**
 * 지금 재생 중 표시 (스포티파이 이퀄라이저 막대). 웹은 막대가 오르내리고, 멈추면 낮게 선다.
 * 네이티브와 움직임 줄이기 설정에서는 서 있는 막대만 보인다.
 */
export function Equalizer({
  playing,
  size = 12,
  className,
  colorClassName = 'bg-primary',
}: {
  playing: boolean;
  size?: number;
  className?: string;
  colorClassName?: string;
}) {
  useLocale();
  const bar = Math.max(2, Math.round(size / 5));
  const rest = [0.45, 0.8, 0.6];
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={cn('flex-row items-end', playing && Platform.OS === 'web' && 'cm-eq', className)}
      style={{ height: size, gap: Math.max(1, Math.round(bar / 2)) }}>
      {rest.map((ratio, index) => (
        <View
          key={index}
          className={cn('rounded-[1px]', colorClassName)}
          style={{ width: bar, height: Math.round(size * (playing ? ratio : 0.3)) }}
        />
      ))}
    </View>
  );
}

import { getEraForeground } from '@/lib/design/era-palette';
import type { DecadeDensity } from '@/lib/design/timeline-layout';
import type { ColorScheme } from '@/lib/design/tokens';
import * as React from 'react';
import { type GestureResponderEvent, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

export const DENSITY_STRIP_HEIGHT = 32;

interface DensityStripProps {
  buckets: readonly DecadeDensity[];
  /** 아래에서부터 쌓는 시대 순서 */
  eraOrder: readonly string[];
  fromYear: number;
  toYear: number;
  width: number;
  /** 차트와 같은 좌우 여백. 기본 줌에서 띠와 차트 눈금이 맞는다 */
  padLeft: number;
  padRight: number;
  scheme: ColorScheme;
  /** 확대했을 때 지금 보이는 연도 구간 */
  viewport: { startYear: number; endYear: number } | null;
  onPressYear: (year: number) => void;
}

/** 10년마다 살아 있던 작곡가 수를 시대 색으로 쌓은 개요 띠. 누르면 그 해로 간다. */
export function DensityStrip({
  buckets,
  eraOrder,
  fromYear,
  toYear,
  width,
  padLeft,
  padRight,
  scheme,
  viewport,
  onPressYear,
}: DensityStripProps) {
  const inner = Math.max(1, width - padLeft - padRight);
  const pxPerYear = inner / Math.max(1, toYear - fromYear);
  const x = (year: number) => padLeft + (Math.min(toYear, Math.max(fromYear, year)) - fromYear) * pxPerYear;
  const maxTotal = Math.max(1, ...buckets.map((bucket) => bucket.total));
  const plotHeight = DENSITY_STRIP_HEIGHT - 2;
  const decadeWidth = 10 * pxPerYear;
  const gap = decadeWidth > 4 ? 1 : 0;

  const handleRelease = (event: GestureResponderEvent) => {
    const year = fromYear + (event.nativeEvent.locationX - padLeft) / pxPerYear;
    onPressYear(Math.round(Math.min(toYear, Math.max(fromYear, year))));
  };

  return (
    <View style={{ width, height: DENSITY_STRIP_HEIGHT }}>
      <Svg width={width} height={DENSITY_STRIP_HEIGHT}>
        {buckets.map((bucket) => {
          const left = x(bucket.decade);
          const right = x(bucket.decade + 10);
          const barWidth = Math.max(0.5, right - left - gap);
          let y = plotHeight;
          return eraOrder.map((era) => {
            const count = bucket.byEra[era] ?? 0;
            if (count === 0) return null;
            const height = (count / maxTotal) * plotHeight;
            y -= height;
            return (
              <Rect
                key={`${bucket.decade}-${era}`}
                x={left}
                y={y}
                width={barWidth}
                height={height}
                fill={getEraForeground(era, scheme) ?? '#888'}
                opacity={scheme === 'dark' ? 0.75 : 0.65}
              />
            );
          });
        })}
        {viewport ? (
          <Rect
            x={x(viewport.startYear)}
            y={0.5}
            width={Math.max(4, x(viewport.endYear) - x(viewport.startYear))}
            height={DENSITY_STRIP_HEIGHT - 1}
            rx={3}
            fill={scheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}
            stroke={scheme === 'dark' ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)'}
            strokeWidth={1}
          />
        ) : null}
      </Svg>
      <View className="absolute bottom-0 left-0 right-0 h-px bg-border" style={{ pointerEvents: 'none' }} />
      {/* 막대 위가 아니라 이 판이 눌려야 locationX가 띠 기준으로 잡힌다 */}
      <View
        className="absolute inset-0 web:cursor-pointer"
        accessibilityRole="adjustable"
        accessibilityLabel="시대별 작곡가 밀도"
        accessibilityHint="누른 연도로 타임라인을 옮겨요"
        onStartShouldSetResponder={() => true}
        onResponderRelease={handleRelease}
      />
    </View>
  );
}

import { Text } from '@/components/ui/text';
import { clipClock } from '@/lib/data/comparison';
import { THEME, withAlpha } from '@/lib/design/tokens';
import type { LoudnessProfile } from '@/lib/types/models';
import { cn } from '@/lib/utils';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

/** 곡선 폭이 이보다 좁으면 평평한 곡선이다. 압축된 녹음일 수 있어 점과 잰 값을 그리지 않는다 */
export const FLAT_RANGE_DB = 2;
/** 눈금 아래쪽 끝의 범위. 6dB 단위로 내린다 */
const SHALLOWEST_FLOOR_DB = -6;
const DEEPEST_FLOOR_DB = -30;

/**
 * 한 화면에 함께 그리는 곡선들의 공통 눈금 바닥. 곡선마다 5분위 값 가운데 가장 낮은 값을
 * 6dB 단위로 내린다(-6 ~ -30). 같은 눈금이라 타일끼리 모양을 견줄 수 있고, 조용한
 * 대목이 긴 곡선도 바닥에 다 붙지 않는다. 이보다 작은 값은 바닥에 붙인다.
 */
export function sharedFloorDb(profiles: readonly (LoudnessProfile | null | undefined)[]): number {
  let lowest = 0;
  for (const profile of profiles) {
    if (!profile || profile.curveRelDb.length === 0) continue;
    const sorted = [...profile.curveRelDb].sort((left, right) => left - right);
    lowest = Math.min(lowest, sorted[Math.floor((sorted.length - 1) * 0.05)]);
  }
  const stepped = Math.floor(lowest / 6) * 6;
  return Math.max(DEEPEST_FLOOR_DB, Math.min(SHALLOWEST_FLOOR_DB, stepped));
}

export type CurveTone = 'a' | 'b' | 'neutral';

export function isFlatLoudness(loudness: LoudnessProfile): boolean {
  return loudness.rangeDb < FLAT_RANGE_DB;
}

/** 곡선이 덮는 길이(ms). 마지막 점이 클립 끝이다 */
function curveSpanMs(loudness: LoudnessProfile): number {
  return Math.max(1, (loudness.curveRelDb.length - 1) * loudness.stepMs);
}

/** 클립 안 시점의 곡선 값. 점 사이는 직선으로 잇는다 */
function valueAt(loudness: LoudnessProfile, offsetMs: number): number {
  const curve = loudness.curveRelDb;
  const position = Math.min(curve.length - 1, Math.max(0, offsetMs / loudness.stepMs));
  const lower = Math.floor(position);
  const upper = Math.min(curve.length - 1, lower + 1);
  return curve[lower] + (curve[upper] - curve[lower]) * (position - lower);
}

function useCurveColors() {
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const theme = THEME[scheme];
  const stroke: Record<CurveTone, string> = {
    a: theme.primary,
    b: theme.info,
    neutral: theme.foregroundSubtle,
  };
  return {
    scheme,
    theme,
    stroke,
    fill: (tone: CurveTone) =>
      withAlpha(
        scheme,
        tone === 'a' ? 'primary' : tone === 'b' ? 'info' : 'foregroundSubtle',
        0.12
      ),
  };
}

function useWidth(): [number, (event: LayoutChangeEvent) => void] {
  const [width, setWidth] = React.useState(0);
  const onLayout = React.useCallback((event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.width);
    setWidth((previous) => (previous === next ? previous : next));
  }, []);
  return [width, onLayout];
}

interface Plot {
  left: number;
  top: number;
  width: number;
  height: number;
  /** 눈금 아래쪽 끝(dB, 음수) */
  floor: number;
}

const yOf = (plot: Plot, value: number) =>
  plot.top + (Math.max(plot.floor, Math.min(0, value)) / plot.floor) * plot.height;

/** 진행률(0~1) 축 위의 곡선 경로. `closed` 면 바닥까지 닫아 면을 만든다 */
function curvePath(loudness: LoudnessProfile, plot: Plot, closed: boolean): string {
  const curve = loudness.curveRelDb;
  const last = curve.length - 1;
  const points = curve.map((value, index) => {
    const x = plot.left + (index / last) * plot.width;
    return `${x.toFixed(1)},${yOf(plot, value).toFixed(1)}`;
  });
  const line = `M${points.join('L')}`;
  if (!closed) return line;
  const bottom = (plot.top + plot.height).toFixed(1);
  return `${line}L${(plot.left + plot.width).toFixed(1)},${bottom}L${plot.left.toFixed(1)},${bottom}Z`;
}

/**
 * 타일의 작은 곡선. 노트의 들을 곳을 곡선 위 점으로 찍는다.
 * 곡선이 평평하면 점을 찍지 않는다.
 */
export function LoudnessSparkline({
  loudness,
  marks = [],
  tone = 'neutral',
  height = 36,
  floorDb,
  className,
}: {
  loudness: LoudnessProfile;
  /** 들을 곳(클립 안 ms) */
  marks?: readonly number[];
  tone?: CurveTone;
  height?: number;
  /** 같은 화면의 곡선과 맞출 눈금 바닥. 없으면 이 곡선만으로 정한다 */
  floorDb?: number;
  className?: string;
}) {
  const [width, onLayout] = useWidth();
  const colors = useCurveColors();
  const flat = isFlatLoudness(loudness);
  const plot: Plot = {
    left: 4,
    top: 4,
    width: Math.max(0, width - 8),
    height: height - 8,
    floor: floorDb ?? sharedFloorDb([loudness]),
  };
  const span = curveSpanMs(loudness);
  const label = flat
    ? '음량 곡선. 처음부터 끝까지 거의 평평해요'
    : `음량 곡선. 가장 센 곳 ${clipClock(loudness.peakMs)}`;

  return (
    <View
      onLayout={onLayout}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      className={cn('w-full', className)}
      style={{ height }}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          <Path d={curvePath(loudness, plot, true)} fill={colors.fill(tone)} />
          <Path
            d={curvePath(loudness, plot, false)}
            fill="none"
            stroke={colors.stroke[tone]}
            strokeWidth={1.6}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {flat
            ? null
            : marks
                .filter((offsetMs) => offsetMs >= 0 && offsetMs <= span)
                .map((offsetMs) => (
                  <Circle
                    key={offsetMs}
                    cx={plot.left + (offsetMs / span) * plot.width}
                    cy={yOf(plot, valueAt(loudness, offsetMs))}
                    r={3.5}
                    fill={colors.stroke[tone === 'neutral' ? 'a' : tone]}
                    stroke={colors.theme.surface1}
                    strokeWidth={2}
                  />
                ))}
        </Svg>
      ) : null}
    </View>
  );
}

export interface OverlaySide {
  loudness: LoudnessProfile | null;
  durationMs: number;
}

/**
 * 1:1 의 겹친 곡선. 두 연주를 같은 진행률 축에 놓는다. 평평하지 않은 곡선에만 가장 센 곳 점을 찍는다.
 * `playhead` 는 지금 듣는 쪽의 진행률이다.
 */
export function LoudnessOverlay({
  a,
  b,
  playhead,
  height = 132,
}: {
  a: OverlaySide;
  b: OverlaySide;
  playhead?: number;
  height?: number;
}) {
  const [width, onLayout] = useWidth();
  const colors = useCurveColors();
  const floor = sharedFloorDb([a.loudness, b.loudness]);
  const plot: Plot = {
    left: 30,
    top: 8,
    width: Math.max(0, width - 38),
    height: height - 30,
    floor,
  };
  const sides = [
    { key: 'a' as const, side: a },
    { key: 'b' as const, side: b },
  ];

  return (
    <View
      onLayout={onLayout}
      accessible
      accessibilityRole="image"
      accessibilityLabel="두 연주의 음량 곡선을 같은 진행률 축에 겹친 그래프"
      className="w-full"
      style={{ height }}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          {[0, floor / 2, floor].map((db) => (
            <React.Fragment key={db}>
              <Line
                x1={plot.left}
                x2={plot.left + plot.width}
                y1={yOf(plot, db)}
                y2={yOf(plot, db)}
                stroke={colors.theme.border}
                strokeWidth={1}
              />
              <SvgText
                x={plot.left - 6}
                y={yOf(plot, db) + 4}
                fontSize={10.5}
                textAnchor="end"
                fill={colors.theme.foregroundSubtle}>
                {db === 0 ? '0' : `${db}`}
              </SvgText>
            </React.Fragment>
          ))}
          {[0, 0.5, 1].map((ratio) => (
            <SvgText
              key={ratio}
              x={plot.left + ratio * plot.width}
              y={height - 6}
              fontSize={10.5}
              textAnchor={ratio === 0 ? 'start' : ratio === 1 ? 'end' : 'middle'}
              fill={colors.theme.foregroundSubtle}>
              {`${Math.round(ratio * 100)}%`}
            </SvgText>
          ))}
          {sides.map(({ key, side }) =>
            side.loudness ? (
              <Path
                key={key}
                d={curvePath(side.loudness, plot, false)}
                fill="none"
                stroke={colors.stroke[key]}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ) : null
          )}
          {sides.map(({ key, side }) => {
            const loudness = side.loudness;
            if (!loudness || isFlatLoudness(loudness)) return null;
            const ratio = Math.min(1, loudness.peakMs / curveSpanMs(loudness));
            return (
              <Circle
                key={`${key}-peak`}
                cx={plot.left + ratio * plot.width}
                cy={yOf(plot, 0)}
                r={4}
                fill={colors.stroke[key]}
                stroke={colors.theme.surface1}
                strokeWidth={2}
              />
            );
          })}
          {playhead !== undefined && Number.isFinite(playhead) ? (
            <Line
              x1={plot.left + Math.min(1, Math.max(0, playhead)) * plot.width}
              x2={plot.left + Math.min(1, Math.max(0, playhead)) * plot.width}
              y1={plot.top}
              y2={plot.top + plot.height}
              stroke={colors.theme.foreground}
              strokeWidth={1.2}
              strokeDasharray="3 3"
            />
          ) : null}
        </Svg>
      ) : null}
    </View>
  );
}

function measuredCells(
  side: OverlaySide
): { start: string; peak: string; peakRatio: string } | null {
  const loudness = side.loudness;
  if (!loudness || isFlatLoudness(loudness)) return null;
  const start = loudness.startRelDb;
  return {
    start: start >= -0.05 ? '최고점과 같음' : `최고점 −${Math.abs(start).toFixed(1)}dB`,
    peak: clipClock(loudness.peakMs),
    peakRatio: `${Math.round(loudness.peakRatio * 100)}%`,
  };
}

/** 1:1 의 잰 값 표. 곡선이 평평한 연주는 칸을 비운다 */
export function LoudnessMeasures({
  a,
  b,
  nameA,
  nameB,
}: {
  a: OverlaySide;
  b: OverlaySide;
  nameA: string;
  nameB: string;
}) {
  const cellsA = measuredCells(a);
  const cellsB = measuredCells(b);
  const flatNames = [
    a.loudness && !cellsA ? nameA : null,
    b.loudness && !cellsB ? nameB : null,
  ].filter((name): name is string => name !== null);
  const rows = [
    { label: '처음 5초', a: cellsA?.start, b: cellsB?.start },
    {
      label: '가장 센 곳',
      a: cellsA ? `${cellsA.peak} · ${cellsA.peakRatio}` : undefined,
      b: cellsB ? `${cellsB.peak} · ${cellsB.peakRatio}` : undefined,
    },
    { label: '길이', a: clipClock(a.durationMs), b: clipClock(b.durationMs) },
  ];

  return (
    <View className="gap-2">
      <View className="flex-row border-b border-border pb-1.5">
        <Text variant="caption" className="w-24 font-semibold text-foreground-subtle">
          잰 값
        </Text>
        <Text variant="caption" numberOfLines={1} className="flex-1 font-semibold text-primary">
          {`A · ${nameA}`}
        </Text>
        <Text variant="caption" numberOfLines={1} className="flex-1 font-semibold text-info">
          {`B · ${nameB}`}
        </Text>
      </View>
      {rows.map((row) => (
        <View key={row.label} className="flex-row items-baseline">
          <Text variant="caption" className="w-24 text-foreground-subtle">
            {row.label}
          </Text>
          <Text className="flex-1 text-body-sm font-semibold tabular-nums text-foreground">
            {row.a ?? '—'}
          </Text>
          <Text className="flex-1 text-body-sm font-semibold tabular-nums text-foreground">
            {row.b ?? '—'}
          </Text>
        </View>
      ))}
      <Text variant="caption" className="mt-1 text-foreground-subtle">
        {flatNames.length > 0
          ? `${flatNames.join('·')} 연주는 곡선 폭이 2dB보다 좁아 잰 값을 비웠어요. 녹음이 압축됐을 수 있어요.`
          : '각 연주에서 가장 센 곳을 0dB로 맞춘 값이에요. 녹음마다 크기가 달라 두 연주의 세기를 견주지는 않아요.'}
      </Text>
    </View>
  );
}

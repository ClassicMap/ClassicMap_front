import { type Performer, PerformerMark } from '@/components/compare/performer-mark';
import { Text } from '@/components/ui/text';
import { clipClock } from '@/lib/data/comparison';
import { THEME, withAlpha } from '@/lib/design/tokens';
import type { LoudnessProfile } from '@/lib/types/models';
import { cn } from '@/lib/utils';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { type GestureResponderEvent, type LayoutChangeEvent, Platform, Pressable, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

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
 * 재생 중 위치를 부드럽게 옮긴다. 셸 영상은 위치를 초당 4번쯤만 알려 주므로, 웹에서는 마지막 값에서
 * 흐른 시간만큼 앞으로 그린다. 재생 중이 아니면 받은 값 그대로다.
 */
function useGlide(ratio: number | undefined, playing: boolean, spanMs: number): number | undefined {
  const [shown, setShown] = React.useState(ratio);
  const anchor = React.useRef({ ratio, at: 0 });
  const known = ratio !== undefined;
  React.useEffect(() => {
    anchor.current = { ratio, at: Date.now() };
    setShown(ratio);
  }, [ratio]);
  React.useEffect(() => {
    if (Platform.OS !== 'web' || !playing || !known || !(spanMs > 0)) return;
    let frame = 0;
    const tick = () => {
      const { ratio: base, at } = anchor.current;
      if (base !== undefined) {
        // 다음 보고가 늦어도 0.5초 넘게 앞서 나가지 않는다
        const ahead = Math.min(500, Date.now() - at) / spanMs;
        setShown(Math.min(1, base + ahead));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, known, spanMs]);
  return shown;
}

/**
 * 누른 자리의 가로 위치(요소 왼쪽 기준 px). 웹은 locationX 가 비어 올 때가 있어 화면 좌표에서 요소 위치를 뺀다
 */
function pressX(event: GestureResponderEvent): number | null {
  const native = event.nativeEvent as unknown as { locationX?: number; clientX?: number; pageX?: number };
  if (Platform.OS === 'web') {
    const target = event.currentTarget as unknown as { getBoundingClientRect?: () => { left: number } };
    const clientX = native.clientX ?? native.pageX;
    if (typeof target?.getBoundingClientRect === 'function' && typeof clientX === 'number') {
      return clientX - target.getBoundingClientRect().left;
    }
  }
  return typeof native.locationX === 'number' && Number.isFinite(native.locationX) ? native.locationX : null;
}

/** 0(바닥)~1(가장 센 곳). 재생 점의 빛 크기에 쓴다 */
function levelAt(loudness: LoudnessProfile, offsetMs: number, floor: number): number {
  return Math.max(0, Math.min(1, (valueAt(loudness, offsetMs) - floor) / -floor));
}

/**
 * 타일의 작은 곡선. 재생 바를 겸한다.
 * - `playhead`(진행률)가 있으면 들은 만큼 칠하고, 점이 곡선을 따라간다. 점의 빛은 그 순간 소리 크기만큼 커진다.
 * - `resumeAt` 이 있으면 이어 들을 자리를 빈 점으로 찍는다 (지금 듣지 않는 연주).
 * - `onSeek` 이 있으면 누른 자리의 진행률을 넘긴다.
 * 노트의 들을 곳은 곡선 위 점으로 찍는다. 곡선이 평평하면 들을 곳 점을 찍지 않는다.
 */
export function LoudnessSparkline({
  loudness,
  marks = [],
  tone = 'neutral',
  height = 36,
  floorDb,
  playhead,
  playing = false,
  resumeAt,
  onSeek,
  label,
  className,
}: {
  loudness: LoudnessProfile;
  /** 들을 곳(클립 안 ms) */
  marks?: readonly number[];
  tone?: CurveTone;
  height?: number;
  /** 같은 화면의 곡선과 맞출 눈금 바닥. 없으면 이 곡선만으로 정한다 */
  floorDb?: number;
  /** 지금 듣는 연주의 진행률(0~1) */
  playhead?: number;
  playing?: boolean;
  /** 이어 들을 자리의 진행률(0~1) */
  resumeAt?: number;
  onSeek?: (ratio: number) => void;
  /** 접근성 라벨 앞에 붙일 연주자 이름 */
  label?: string;
  className?: string;
}) {
  const [width, onLayout] = useWidth();
  const colors = useCurveColors();
  const clipId = `spark-${React.useId().replace(/:/g, '')}`;
  const flat = isFlatLoudness(loudness);
  const span = curveSpanMs(loudness);
  const plot: Plot = {
    left: 4,
    top: 4,
    width: Math.max(0, width - 8),
    height: height - 8,
    floor: floorDb ?? sharedFloorDb([loudness]),
  };
  const shownHead = useGlide(playhead, playing, span);
  const line = React.useMemo(
    () => (width > 0 ? curvePath(loudness, plot, false) : ''),
    // 경로는 폭·눈금·곡선이 바뀔 때만 다시 만든다
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loudness, width, height, plot.floor]
  );
  const area = React.useMemo(
    () => (width > 0 ? curvePath(loudness, plot, true) : ''),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loudness, width, height, plot.floor]
  );
  const describe = flat ? '처음부터 끝까지 거의 평평해요' : `가장 센 곳 ${clipClock(loudness.peakMs)}`;
  const head = shownHead !== undefined && Number.isFinite(shownHead) ? Math.min(1, Math.max(0, shownHead)) : undefined;
  const headX = head !== undefined ? plot.left + head * plot.width : 0;
  const headY = head !== undefined ? yOf(plot, valueAt(loudness, head * span)) : 0;
  const level = head !== undefined ? levelAt(loudness, head * span, plot.floor) : 0;
  const stroke = colors.stroke[tone === 'neutral' ? 'a' : tone];
  const resume = resumeAt !== undefined && resumeAt > 0 && head === undefined ? Math.min(1, resumeAt) : undefined;

  const svg =
    width > 0 ? (
      <Svg width={width} height={height}>
        <Defs>
          <ClipPath id={clipId}>
            <Rect x={0} y={0} width={head !== undefined ? headX : 0} height={height} />
          </ClipPath>
        </Defs>
        {/* 듣는 연주는 남은 부분을 옅게, 들은 부분을 진하게. 안 듣는 연주는 회색 한 줄 */}
        <Path d={area} fill={head !== undefined ? colors.fill(tone) : colors.fill('neutral')} />
        <Path
          d={line}
          fill="none"
          stroke={head !== undefined ? stroke : colors.stroke.neutral}
          strokeOpacity={head !== undefined ? 0.35 : 1}
          strokeWidth={1.6}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {head !== undefined ? (
          <>
            <Path d={area} fill={colors.fill(tone)} clipPath={`url(#${clipId})`} />
            <Path
              d={line}
              fill="none"
              stroke={stroke}
              strokeOpacity={playing ? 0.28 : 0.16}
              strokeWidth={5}
              strokeLinejoin="round"
              clipPath={`url(#${clipId})`}
            />
            <Path
              d={line}
              fill="none"
              stroke={stroke}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              clipPath={`url(#${clipId})`}
            />
          </>
        ) : null}
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
                  fill={head !== undefined ? stroke : colors.stroke.neutral}
                  stroke={colors.theme.surface1}
                  strokeWidth={2}
                />
              ))}
        {resume !== undefined ? (
          <Circle
            cx={plot.left + resume * plot.width}
            cy={yOf(plot, valueAt(loudness, resume * span))}
            r={3.5}
            fill={colors.theme.surface1}
            stroke={colors.theme.foregroundSubtle}
            strokeWidth={1.6}
          />
        ) : null}
        {head !== undefined ? (
          <>
            <Circle cx={headX} cy={headY} r={playing ? 4 + level * 6 : 5} fill={stroke} fillOpacity={0.22} />
            <Circle cx={headX} cy={headY} r={4} fill={stroke} stroke={colors.theme.surface1} strokeWidth={2} />
          </>
        ) : null}
      </Svg>
    ) : null;

  const name = label ? `${label} ` : '';
  if (!onSeek) {
    return (
      <View
        onLayout={onLayout}
        accessible
        accessibilityRole="image"
        accessibilityLabel={`${name}음량 곡선. ${describe}`}
        className={cn('w-full', className)}
        style={{ height }}>
        {svg}
      </View>
    );
  }
  return (
    <Pressable
      onLayout={onLayout}
      onPress={(event) => {
        const x = pressX(event);
        if (plot.width <= 0 || x === null) return;
        onSeek(Math.max(0, Math.min(1, (x - plot.left) / plot.width)));
      }}
      accessibilityRole="adjustable"
      accessibilityLabel={`${name}재생 위치. 음량 곡선, ${describe}. 누른 자리부터 들어요`}
      accessibilityValue={head !== undefined ? { text: clipClock(head * span) } : undefined}
      className={cn('w-full web:cursor-pointer', className)}
      style={{ height }}>
      {svg}
    </Pressable>
  );
}

export interface OverlaySide {
  loudness: LoudnessProfile | null;
  durationMs: number;
}

/**
 * 1:1 의 겹친 곡선. 두 연주를 같은 진행률 축에 놓는다.
 * 지금 듣는 쪽(`active`)은 진하게 빛나고 들은 만큼 칠한다. 안 듣는 쪽은 흐리게 내리고 이어 들을 자리를 빈 점으로 찍는다.
 * 점의 빛은 그 순간 소리 크기만큼 커진다. 평평하지 않은 곡선에는 가장 센 곳을 작은 점으로 찍는다.
 */
export function LoudnessOverlay({
  a,
  b,
  active = 'a',
  positions = {},
  playing = false,
  height = 132,
}: {
  a: OverlaySide;
  b: OverlaySide;
  /** 지금 소리 나는 쪽 */
  active?: 'a' | 'b';
  /** 두 연주의 진행률(0~1) */
  positions?: { a?: number; b?: number };
  playing?: boolean;
  height?: number;
}) {
  const [width, onLayout] = useWidth();
  const colors = useCurveColors();
  const clipBase = `overlay-${React.useId().replace(/:/g, '')}`;
  const floor = sharedFloorDb([a.loudness, b.loudness]);
  const plot: Plot = {
    left: 30,
    top: 8,
    width: Math.max(0, width - 38),
    height: height - 30,
    floor,
  };
  const activeSpan = (active === 'a' ? a : b).loudness;
  const glided = useGlide(positions[active], playing, activeSpan ? curveSpanMs(activeSpan) : 0);
  const ratioOf = (key: 'a' | 'b') => {
    const value = key === active ? glided : positions[key];
    return value !== undefined && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : undefined;
  };
  // 안 듣는 쪽을 먼저 그려 듣는 쪽이 위에 오게 한다
  const order: ('a' | 'b')[] = active === 'a' ? ['b', 'a'] : ['a', 'b'];
  const sideOf = (key: 'a' | 'b') => (key === 'a' ? a : b);

  return (
    <View
      onLayout={onLayout}
      accessible
      accessibilityRole="image"
      accessibilityLabel="두 연주의 음량 곡선을 같은 진행률 축에 겹친 그래프. 지금 듣는 연주가 진하게 보여요"
      className="w-full"
      style={{ height }}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          <Defs>
            {order.map((key) => {
              const ratio = ratioOf(key);
              return (
                <ClipPath key={key} id={`${clipBase}-${key}`}>
                  <Rect x={0} y={0} width={ratio !== undefined ? plot.left + ratio * plot.width : 0} height={height} />
                </ClipPath>
              );
            })}
          </Defs>
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
          {order.map((key) => {
            const loudness = sideOf(key).loudness;
            if (!loudness) return null;
            const on = key === active;
            const line = curvePath(loudness, plot, false);
            const ratio = ratioOf(key);
            const span = curveSpanMs(loudness);
            const x = ratio !== undefined ? plot.left + ratio * plot.width : 0;
            const y = ratio !== undefined ? yOf(plot, valueAt(loudness, ratio * span)) : 0;
            const peakRatio = Math.min(1, loudness.peakMs / span);
            return (
              <React.Fragment key={key}>
                <Path
                  d={line}
                  fill="none"
                  stroke={colors.stroke[key]}
                  strokeOpacity={on ? 0.45 : 0.25}
                  strokeWidth={on ? 1.8 : 1.6}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {on ? (
                  <>
                    <Path
                      d={line}
                      fill="none"
                      stroke={colors.stroke[key]}
                      strokeOpacity={playing ? 0.3 : 0.18}
                      strokeWidth={7}
                      strokeLinejoin="round"
                      clipPath={`url(#${clipBase}-${key})`}
                    />
                    <Path
                      d={line}
                      fill="none"
                      stroke={colors.stroke[key]}
                      strokeWidth={2.6}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      clipPath={`url(#${clipBase}-${key})`}
                    />
                  </>
                ) : null}
                {isFlatLoudness(loudness) ? null : (
                  <Circle
                    cx={plot.left + peakRatio * plot.width}
                    cy={yOf(plot, 0)}
                    r={3}
                    fill={colors.stroke[key]}
                    fillOpacity={on ? 1 : 0.35}
                  />
                )}
                {ratio !== undefined ? (
                  on ? (
                    <>
                      <Circle
                        cx={x}
                        cy={y}
                        r={playing ? 5 + levelAt(loudness, ratio * span, floor) * 9 : 7}
                        fill={colors.stroke[key]}
                        fillOpacity={0.25}
                      />
                      <Circle cx={x} cy={y} r={5} fill={colors.stroke[key]} stroke={colors.theme.surface1} strokeWidth={2} />
                    </>
                  ) : (
                    <Circle cx={x} cy={y} r={4} fill={colors.theme.surface1} stroke={colors.stroke[key]} strokeOpacity={0.6} strokeWidth={1.8} />
                  )
                ) : null}
              </React.Fragment>
            );
          })}
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
  performerA,
  performerB,
}: {
  a: OverlaySide;
  b: OverlaySide;
  performerA: Performer;
  performerB: Performer;
}) {
  const nameA = performerA.name;
  const nameB = performerB.name;
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
        <MeasureHead performer={performerA} tone="a" />
        <MeasureHead performer={performerB} tone="b" />
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

/** 잰 값 표 머리: 곡선과 같은 색 테두리의 얼굴, 그 색 이름 */
function MeasureHead({ performer, tone }: { performer: Performer; tone: 'a' | 'b' }) {
  return (
    <View className="min-w-0 flex-1 flex-row items-center gap-1.5">
      <PerformerMark performer={performer} tone={tone} size={18} />
      <Text
        variant="caption"
        numberOfLines={1}
        className={cn('shrink font-semibold', tone === 'a' ? 'text-primary' : 'text-info')}>
        {performer.name}
      </Text>
    </View>
  );
}

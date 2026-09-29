import { EntityThumb } from '@/components/ui/entity-thumb';
import { Text } from '@/components/ui/text';
import { getEraFill, getEraForeground } from '@/lib/design/era-palette';
import type { PlacedLabeledSpan } from '@/lib/design/timeline-layout';
import type { ColorScheme } from '@/lib/design/tokens';
import type { Composer, Period } from '@/lib/types/models';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { Pressable, View } from 'react-native';

/** 한 줄 높이. 이름표(12) + 막대(4) + 숨 쉴 틈 */
export const GANTT_ROW_HEIGHT = 18;
/** 눈금 글자(14) + 시대 띠 두 줄(2×14) + 여백 */
export const GANTT_LANES_TOP = 46;
/** 자리가 모자란 작곡가를 묶은 "+N" 칩 줄 */
export const GANTT_OVERFLOW_ROW = 30;
export const GANTT_BOTTOM_PAD = 6;
/** 사진(대표 작곡가만) 폭 + 이름과의 간격 */
export const GANTT_PORTRAIT_SPACE = 19;
/** 비교 영상 도트 폭 + 간격 */
export const GANTT_DOT_SPACE = 8;

const PORTRAIT_SIZE = 16;
const LABEL_LINE = 12;
const BAR_TOP = 11;
const BAR_HEIGHT = 4;
const ERA_ROW_TOP = 15;
const ERA_ROW_HEIGHT = 14;

export interface OverflowGroup {
  eraId: string;
  eraName: string;
  count: number;
  /** 칩 왼쪽 px (서로 겹치지 않게 밀어 둔 값) */
  left: number;
  width: number;
}

interface ComposerGanttProps {
  width: number;
  placed: readonly PlacedLabeledSpan<Composer>[];
  laneCount: number;
  overflowGroups: readonly OverflowGroup[];
  eras: readonly Period[];
  ticks: readonly number[];
  x: (year: number) => number;
  fromYear: number;
  toYear: number;
  focusEraId: string | null;
  selectedId: number | null;
  comparable: ReadonlyMap<number, number> | undefined;
  scheme: ColorScheme;
  onSelect: (id: number) => void;
  onOverflowPress: (group: OverflowGroup) => void;
}

export function ganttHeight(laneCount: number, hasOverflow: boolean): number {
  return (
    GANTT_LANES_TOP +
    Math.max(1, laneCount) * GANTT_ROW_HEIGHT +
    (hasOverflow ? GANTT_OVERFLOW_ROW : GANTT_BOTTOM_PAD)
  );
}

/** 얇은 간트: 막대는 생애, 위에 이름표. 대표 작곡가만 사진을 단다. */
export function ComposerGantt({
  width,
  placed,
  laneCount,
  overflowGroups,
  eras,
  ticks,
  x,
  fromYear,
  toYear,
  focusEraId,
  selectedId,
  comparable,
  scheme,
  onSelect,
  onOverflowPress,
}: ComposerGanttProps) {
  const height = ganttHeight(laneCount, overflowGroups.length > 0);
  const focusEra = eras.find((era) => era.id === focusEraId);
  const overflowTop = GANTT_LANES_TOP + Math.max(1, laneCount) * GANTT_ROW_HEIGHT + 8;

  return (
    <View nativeID="timeline-gantt" style={{ width, height }}>
      {focusEra ? (
        <View
          className="absolute"
          style={{
            pointerEvents: 'none',
            opacity: scheme === 'dark' ? 0.6 : 0.85,
            left: x(Math.max(focusEra.startYear, fromYear)),
            width: x(Math.min(focusEra.endYear, toYear)) - x(Math.max(focusEra.startYear, fromYear)),
            top: ERA_ROW_TOP - 2,
            bottom: 0,
            backgroundColor: getEraFill(focusEra.name, scheme),
            borderRadius: 6,
          }}
        />
      ) : null}

      {ticks.map((year) => (
        <View
          key={year}
          className="absolute bottom-0 w-px bg-border"
          style={{ pointerEvents: 'none', left: x(year), top: 14 }}>
          <Text variant="mono" className="absolute -top-[15px] left-[-20px] w-10 text-center text-[10.5px] text-foreground-subtle">
            {year}
          </Text>
        </View>
      ))}

      {/* 시대는 서로 겹친다. 두 줄에 번갈아 둔다 */}
      {eras.map((era, index) => {
        const left = x(Math.max(era.startYear, fromYear));
        const eraWidth = x(Math.min(era.endYear, toYear)) - left;
        const color = getEraForeground(era.name, scheme);
        const dimmed = focusEra !== undefined && focusEra.id !== era.id;
        return (
          <View
            key={era.id}
            className="absolute flex-row items-center"
            style={{
              pointerEvents: 'none',
              left,
              top: ERA_ROW_TOP + (index % 2) * ERA_ROW_HEIGHT,
              width: eraWidth,
              height: ERA_ROW_HEIGHT,
              opacity: dimmed ? 0.4 : 1,
            }}>
            <Text numberOfLines={1} className="text-micro" style={{ color, lineHeight: ERA_ROW_HEIGHT }}>
              {focusEra?.id === era.id ? `${era.name} ${era.startYear}–${era.endYear}` : era.name}
            </Text>
            <View className="ml-1.5 h-0.5 min-w-0 flex-1 rounded-full" style={{ backgroundColor: color, opacity: 0.7 }} />
          </View>
        );
      })}

      {placed.map((span) => (
        <GanttRow
          key={span.item.id}
          span={span}
          selected={span.item.id === selectedId}
          hasComparison={(comparable?.get(span.item.id) ?? 0) > 0}
          dimmed={focusEra !== undefined && span.item.period !== focusEra.name}
          scheme={scheme}
          onSelect={onSelect}
        />
      ))}

      {overflowGroups.map((group) => {
        const color = getEraForeground(group.eraName, scheme);
        return (
          <Pressable
            key={group.eraId}
            accessibilityRole="button"
            accessibilityLabel={`${group.eraName} 작곡가 ${group.count}명 더 보기`}
            onPress={() => onOverflowPress(group)}
            className="absolute h-[22px] flex-row items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2 web:hover:bg-surface-3"
            style={{ left: group.left, top: overflowTop, width: group.width }}>
            <View className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
            <Text numberOfLines={1} className="text-caption font-semibold text-foreground-muted">
              {`${group.eraName} +${group.count}`}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function GanttRowBase({
  span,
  selected,
  hasComparison,
  dimmed,
  scheme,
  onSelect,
}: {
  span: PlacedLabeledSpan<Composer>;
  selected: boolean;
  hasComparison: boolean;
  dimmed: boolean;
  scheme: ColorScheme;
  onSelect: (id: number) => void;
}) {
  const { item, lane, startX, endX, labelX, labelWidth } = span;
  const left = Math.min(startX, labelX);
  const right = Math.max(endX, labelX + labelWidth);
  const isStar = item.tier === 'S';
  const isMajor = isStar || item.tier === 'A';
  const barColor = getEraForeground(item.period, scheme);
  const textLeft = labelX - left + (isStar ? GANTT_PORTRAIT_SPACE : 0);

  return (
    <Pressable
      onPress={() => onSelect(item.id)}
      accessibilityRole="button"
      accessibilityLabel={`${item.name} ${item.birthYear}–${item.deathYear ?? ''}`}
      className="absolute web:cursor-pointer"
      style={{
        left,
        top: GANTT_LANES_TOP + lane * GANTT_ROW_HEIGHT,
        width: right - left,
        height: GANTT_ROW_HEIGHT,
        opacity: dimmed && !selected ? 0.35 : 1,
      }}>
      <View
        className={cn('absolute rounded-full', selected && 'bg-primary')}
        style={{
          left: startX - left,
          top: selected ? BAR_TOP - 1 : BAR_TOP,
          width: Math.max(BAR_HEIGHT, endX - startX),
          height: selected ? BAR_HEIGHT + 2 : BAR_HEIGHT,
          backgroundColor: selected ? undefined : barColor,
          opacity: selected ? 1 : isMajor ? 0.9 : 0.55,
        }}
      />
      {isStar ? (
        <View
          className="absolute overflow-hidden rounded-full border border-background"
          style={{ left: labelX - left, top: 0, width: PORTRAIT_SIZE + 2, height: PORTRAIT_SIZE + 2 }}>
          <EntityThumb name={item.name} image={item.avatarUrl} shape="circle" size={PORTRAIT_SIZE} />
        </View>
      ) : null}
      <View className="absolute flex-row items-center" style={{ left: textLeft, top: -1, height: LABEL_LINE + 1 }}>
        <Text
          numberOfLines={1}
          className={cn(
            'text-micro',
            selected ? 'text-primary' : isMajor ? 'text-foreground' : 'font-medium text-foreground-muted'
          )}
          style={{ lineHeight: LABEL_LINE + 1 }}>
          {item.name}
        </Text>
        {hasComparison ? <View className="ml-1 size-[5px] rounded-full bg-primary" /> : null}
      </View>
    </Pressable>
  );
}

const GanttRow = React.memo(GanttRowBase);

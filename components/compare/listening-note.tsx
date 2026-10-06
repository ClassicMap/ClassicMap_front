import { type Performer, PerformerMark, performerOf } from '@/components/compare/performer-mark';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { clipClock } from '@/lib/data/comparison';
import type {
  ComparisonPerformance,
  FeaturedPair,
  ListeningMoment,
  PerformanceListeningNote,
} from '@/lib/types/models';
import { cn } from '@/lib/utils';
import { ChevronRightIcon, PlayIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

/** 1:1 의 A·B 색. A 는 브랜드 금색, B 는 파랑이다 */
export type NoteTone = 'a' | 'b';

const TONE_TEXT: Record<NoteTone, string> = { a: 'text-primary', b: 'text-info' };
const TONE_BORDER: Record<NoteTone, string> = { a: 'border-primary', b: 'border-info' };
const TONE_FILL: Record<NoteTone, string> = { a: 'fill-primary', b: 'fill-info' };

/** 들을 곳 칩: "▶ 0:20 절정". 연주자가 둘인 자리에서는 ▶ 대신 그 연주자 얼굴을 둔다. 누르면 그 지점부터 튼다 */
export function MomentChip({
  moment,
  tone = 'a',
  performer,
  onPress,
}: {
  moment: ListeningMoment;
  tone?: NoteTone;
  performer?: Performer;
  onPress?: () => void;
}) {
  const clock = clipClock(moment.offsetMs);
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={`${performer ? `${performer.name} ` : ''}${clock} ${moment.label}부터 듣기`}
      className={cn(
        'h-7 flex-row items-center gap-1.5 self-start rounded-full border px-2.5',
        TONE_BORDER[tone],
        onPress ? 'web:hover:bg-surface-2' : 'opacity-60'
      )}>
      {performer ? (
        <PerformerMark performer={performer} tone="none" size={16} className="-ml-1.5 border-0 p-0" />
      ) : (
        <Icon as={PlayIcon} size={9} className={cn(TONE_TEXT[tone], TONE_FILL[tone])} />
      )}
      <Text
        numberOfLines={1}
        className={cn('text-label font-semibold tabular-nums', TONE_TEXT[tone])}>
        {`${clock} ${moment.label}`}
      </Text>
    </Pressable>
  );
}

interface PerformanceNoteProps {
  note: PerformanceListeningNote;
  tone?: NoteTone;
  /** 노트 본문을 이 줄 수까지만 보인다 (모바일 목록) */
  bodyLines?: number;
  /** 들을 곳을 숨긴다 (모바일 목록에서 고르지 않은 연주) */
  hideMoments?: boolean;
  onMoment?: (moment: ListeningMoment) => void;
  /** 본문과 들을 곳 사이에 둘 음량 곡선 */
  curve?: React.ReactNode;
  className?: string;
}

/** 연주 노트: 제목, 두세 문장, 음량 곡선, 들을 곳 */
export function PerformanceNote({
  note,
  tone = 'a',
  bodyLines,
  hideMoments = false,
  onMoment,
  curve,
  className,
}: PerformanceNoteProps) {
  return (
    <View className={cn('gap-1.5', className)}>
      <Text className="text-[16px] font-bold leading-[22px] tracking-tight text-foreground">
        {note.headline}
      </Text>
      <Text numberOfLines={bodyLines} className="text-body-sm text-foreground-muted">
        {note.body}
      </Text>
      {note.facts.length > 0 ? (
        <Text variant="caption" className="text-foreground-subtle">
          {note.facts.join(' · ')}
        </Text>
      ) : null}
      {curve}
      {!hideMoments && note.moments.length > 0 ? (
        <View className="mt-1 flex-row flex-wrap gap-2">
          {note.moments.map((moment) => (
            <MomentChip
              key={`${moment.offsetMs}-${moment.label}`}
              moment={moment}
              tone={tone}
              onPress={onMoment ? () => onMoment(moment) : undefined}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** 구간의 추천 쌍을 지금 목록의 연주로 찾는다. 둘 중 하나라도 없으면 null */
export function resolveFeaturedPair(
  pair: FeaturedPair | null,
  performances: readonly ComparisonPerformance[]
): [ComparisonPerformance, ComparisonPerformance] | null {
  if (!pair) return null;
  const a = performances.find((performance) => performance.id === pair.performanceIds[0]);
  const b = performances.find((performance) => performance.id === pair.performanceIds[1]);
  return a && b ? [a, b] : null;
}

/**
 * 구간 안내 아래의 추천 비교 줄. 누르면 그 두 연주로 1:1 비교가 열린다.
 * `compact` 는 모바일: 제목을 빼고 이름과 화살표만 둔다.
 */
export function FeaturedPairLink({
  pair,
  a,
  b,
  compact = false,
  onOpen,
}: {
  pair: FeaturedPair;
  a: ComparisonPerformance;
  b: ComparisonPerformance;
  compact?: boolean;
  onOpen: () => void;
}) {
  const performerA = performerOf(a);
  const performerB = performerOf(b);
  const nameA = performerA.name;
  const nameB = performerB.name;
  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`추천 비교 ${nameA}와 ${nameB}, ${pair.title}. 1:1로 듣기`}
      className="group mt-2 flex-row flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-border pt-2.5">
      <Text className="text-micro text-primary">추천 비교</Text>
      <View className="flex-row items-center gap-1.5">
        <PerformerMark performer={performerA} tone="a" size={20} />
        <Text className="text-body-sm font-semibold text-foreground">{nameA}</Text>
        <Text className="text-body-sm text-foreground-subtle">↔</Text>
        <PerformerMark performer={performerB} tone="b" size={20} />
        <Text className="text-body-sm font-semibold text-foreground">{nameB}</Text>
      </View>
      {compact ? null : <Text className="text-body-sm text-foreground-muted">{pair.title}</Text>}
      <View className="ml-auto flex-row items-center gap-0.5">
        {compact ? null : (
          <Text className="text-label font-semibold text-primary group-hover:underline">
            1:1로 듣기
          </Text>
        )}
        <Icon as={ChevronRightIcon} size={15} className="text-primary" />
      </View>
    </Pressable>
  );
}

/** 1:1 위의 추천 비교 노트. 들을 곳마다 그 연주자 얼굴을 붙이고, 누르면 그쪽 연주가 그 지점부터 나온다 */
export function FeaturedPairNote({
  pair,
  a,
  b,
  imageOf,
  onMoment,
}: {
  pair: FeaturedPair;
  /** 1:1 의 첫째(금색)·둘째(파랑) 연주 */
  a: ComparisonPerformance;
  b: ComparisonPerformance;
  imageOf?: (performance: ComparisonPerformance) => string | null;
  onMoment: (side: NoteTone, offsetMs: number) => void;
}) {
  const sideOf = (performanceId: number): NoteTone | null =>
    performanceId === a.id ? 'a' : performanceId === b.id ? 'b' : null;
  return (
    // 본문은 72자에서 줄을 바꾸니 상자도 내용만큼만 둔다. 넓은 화면에서 오른쪽이 빈 띠로 남지 않게
    <View className="max-w-full gap-2 self-start rounded-lg bg-surface-2 px-4 py-3.5">
      <Text className="text-micro text-primary">추천 비교</Text>
      <Text className="text-[18px] font-bold leading-[24px] tracking-tight text-foreground">
        {pair.title}
      </Text>
      <Text className="max-w-[72ch] text-body-sm text-foreground">{pair.note}</Text>
      {pair.moments.length > 0 ? (
        <View className="mt-1 flex-row flex-wrap gap-2">
          {pair.moments.map((moment) => {
            const side = sideOf(moment.performanceId);
            if (!side) return null;
            return (
              <MomentChip
                key={`${moment.performanceId}-${moment.offsetMs}`}
                moment={moment}
                tone={side}
                performer={performerOf(side === 'a' ? a : b, imageOf)}
                onPress={() => onMoment(side, moment.offsetMs)}
              />
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

import { ComposerFormModal } from '@/components/admin/ComposerFormModal';
import { useTabScrollInsets } from '@/components/navigation/tab-chrome';
import {
  ComposerGantt,
  GANTT_DOT_SPACE,
  GANTT_LANES_TOP,
  GANTT_OVERFLOW_ROW,
  GANTT_PORTRAIT_SPACE,
  GANTT_ROW_HEIGHT,
  type OverflowGroup,
} from '@/components/timeline/composer-gantt';
import { DENSITY_STRIP_HEIGHT, DensityStrip } from '@/components/timeline/density-strip';
import { Button } from '@/components/ui/button';
import { Chip, ChipDot } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { EntityThumb } from '@/components/ui/entity-thumb';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { PERIODS } from '@/lib/data/periods';
import { getEraForeground } from '@/lib/design/era-palette';
import {
  decadeDensity,
  estimateLabelWidth,
  placeLabeledSpans,
  yearTicks,
  type LabeledSpanInput,
} from '@/lib/design/timeline-layout';
import { useAuth } from '@/lib/hooks/useAuth';
import { useComparableComposers, useComparisonPieces } from '@/lib/query/hooks/useComparisonPerformances';
import { useAllComposers } from '@/lib/query/hooks/useComposers';
import type { Composer, Period } from '@/lib/types/models';
import { cn } from '@/lib/utils';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { AlertCircleIcon, ChevronLeftIcon, MinusIcon, PlusIcon, UsersIcon, XIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import {
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
} from 'react-native';

type Scope = 'major' | 'comparable' | 'all';

const SCOPES: { key: Scope; label: string }[] = [
  { key: 'major', label: '주요 작곡가' },
  { key: 'comparable', label: '비교 있는 작곡가' },
  { key: 'all', label: '전체' },
];

/**
 * 줌 단계: 기본 폭(데스크톱은 화면 폭에 맞춤)에 곱하는 배율.
 * 누구를 보여 줄지는 위 칩이 정하고, 줌은 가로 해상도만 바꾼다.
 * 줄 수는 화면 높이로 묶고, 못 들어간 작곡가는 우선순위가 낮은 쪽부터 시대별 "+N"으로 모은다.
 */
const ZOOM_MULTIPLIERS = [1, 2, 3.5, 6] as const;
const PAD_LEFT = 24;
const PAD_RIGHT = 24;
/** 모바일은 화면 폭에 맞추면 이름이 안 읽힌다. 이보다 좁히지 않고 가로 스크롤을 둔다 */
const MIN_PX_PER_YEAR = 1.5;
const LABEL_GAP_PX = 8;
const MIN_LANES = 8;
const MAX_LANES = 26;
/** 밀도 띠 위 설명 줄(16) + 띠 + 차트와의 간격 */
const STRIP_BLOCK = 16 + DENSITY_STRIP_HEIGHT + 10;

/** 줄이 모자랄 때 먼저 자리를 받는 순서: 초점 시대 → S → A → 비교 영상 → 나머지 */
function priorityOf(composer: Composer, hasComparison: boolean, focusEraName: string | null): number {
  const base =
    composer.tier === 'S' ? 0 : composer.tier === 'A' ? 1 : hasComparison ? 2 : composer.tier === 'B' ? 3 : 4;
  return focusEraName !== null && composer.period === focusEraName ? base - 10 : base;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** 시대별 "+N" 칩을 시대 가운데에 두되 서로 겹치지 않게 민다 */
function layoutOverflowGroups(
  overflow: readonly Composer[],
  eras: readonly Period[],
  x: (year: number) => number,
  fromYear: number,
  toYear: number,
  chartWidth: number
): OverflowGroup[] {
  const counts = new Map<string, number>();
  for (const composer of overflow) counts.set(composer.period, (counts.get(composer.period) ?? 0) + 1);
  const groups: OverflowGroup[] = [];
  for (const era of eras) {
    const count = counts.get(era.name) ?? 0;
    if (count === 0) continue;
    const width = estimateLabelWidth(`${era.name} +${count}`, 12) + 30;
    const center = x((Math.max(era.startYear, fromYear) + Math.min(era.endYear, toYear)) / 2);
    groups.push({ eraId: era.id, eraName: era.name, count, width, left: center - width / 2 });
  }
  groups.sort((a, b) => a.left - b.left);
  for (let index = 0; index < groups.length; index += 1) {
    const previous = groups[index - 1];
    const minLeft = previous ? previous.left + previous.width + 6 : 4;
    groups[index].left = clamp(Math.max(groups[index].left, minLeft), 4, chartWidth - groups[index].width - 4);
  }
  for (let index = groups.length - 2; index >= 0; index -= 1) {
    groups[index].left = Math.min(groups[index].left, groups[index + 1].left - groups[index].width - 6);
  }
  return groups;
}

export default function TimelineScreen() {
  const scrollInsets = useTabScrollInsets();
  const router = useRouter();
  // 홈 "시대로 듣기"에서 오면 그 시대에 초점을 맞춰 연다
  const { era: focusEraParam } = useLocalSearchParams<{ era?: string }>();
  const chartScrollRef = React.useRef<ScrollView>(null);
  const { canEdit } = useAuth();
  const { layout } = useBreakpoint();
  const wide = layout === 'desktop' || layout === 'wide';
  const { height: windowHeight } = useWindowDimensions();
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const [scope, setScope] = React.useState<Scope>('major');
  const [zoom, setZoom] = React.useState(0);
  const [focusEraId, setFocusEraId] = React.useState<string | null>(null);
  const [expanded, setExpanded] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [showForm, setShowForm] = React.useState(false);
  const [viewportWidth, setViewportWidth] = React.useState(0);
  const [pageHeight, setPageHeight] = React.useState(0);
  const [headerHeight, setHeaderHeight] = React.useState(0);
  const [scrollX, setScrollX] = React.useState(0);
  const pendingCenterRef = React.useRef<number | null>(null);
  const appliedParamRef = React.useRef<string | null>(null);

  const composersQuery = useAllComposers();
  const comparableQuery = useComparableComposers();
  // 작곡가 id → 비교할 수 있는 작품 수
  const comparable = React.useMemo<ReadonlyMap<number, number> | undefined>(
    () =>
      comparableQuery.data
        ? new Map(comparableQuery.data.composers.map((entry) => [entry.composerId, entry.pieceCount]))
        : undefined,
    [comparableQuery.data]
  );
  const currentYear = new Date().getFullYear();

  const validComposers = React.useMemo(
    () => (composersQuery.data ?? []).filter((c) => Number.isFinite(c.birthYear) && c.birthYear > 0),
    [composersQuery.data]
  );
  const composers = React.useMemo(() => {
    if (scope === 'major') return validComposers.filter((c) => c.tier === 'S' || c.tier === 'A');
    if (scope === 'comparable') return validComposers.filter((c) => comparable?.has(c.id));
    return validComposers;
  }, [validComposers, scope, comparable]);

  // 축은 칩과 상관없이 전체 작곡가 범위로 고정한다. 칩을 바꿔도 눈금이 흔들리지 않고 밀도 띠와 맞는다
  const fromYear =
    validComposers.length > 0
      ? Math.floor((Math.min(...validComposers.map((c) => c.birthYear)) - 10) / 50) * 50
      : 1600;
  const toYear = Math.max(currentYear, ...validComposers.map((c) => c.deathYear ?? currentYear));
  const span = Math.max(1, toYear - fromYear);

  const fitPxPerYear = viewportWidth > 0 ? (viewportWidth - PAD_LEFT - PAD_RIGHT) / span : MIN_PX_PER_YEAR;
  const basePxPerYear = wide ? fitPxPerYear : Math.max(fitPxPerYear, MIN_PX_PER_YEAR);
  const pxPerYearAt = React.useCallback(
    (level: number) => basePxPerYear * ZOOM_MULTIPLIERS[clamp(level, 0, ZOOM_MULTIPLIERS.length - 1)],
    [basePxPerYear]
  );
  const ppy = pxPerYearAt(zoom);
  const x = React.useCallback((year: number) => PAD_LEFT + (year - fromYear) * ppy, [fromYear, ppy]);
  const chartWidth = Math.max(viewportWidth, PAD_LEFT + span * ppy + PAD_RIGHT);
  const scrollable = chartWidth > viewportWidth + 1;

  // 화면 높이에서 머리·밀도 띠·차트 머리를 빼고 남는 만큼만 줄을 쓴다
  const laneBudget =
    pageHeight > 0 && headerHeight > 0
      ? pageHeight - (wide ? 8 : 12) - headerHeight - STRIP_BLOCK - GANTT_LANES_TOP - GANTT_OVERFLOW_ROW - 20
      : windowHeight * 0.45;
  const maxLanes = expanded
    ? Number.POSITIVE_INFINITY
    : clamp(Math.floor(laneBudget / GANTT_ROW_HEIGHT), MIN_LANES, MAX_LANES);

  const eras = React.useMemo(() => PERIODS.filter((era) => era.endYear > fromYear), [fromYear]);
  const focusEra = eras.find((era) => era.id === focusEraId) ?? null;

  const { placed, overflow, laneCount } = React.useMemo(() => {
    const inputs: LabeledSpanInput<Composer>[] = composers.map((composer) => {
      const hasComparison = (comparable?.get(composer.id) ?? 0) > 0;
      return {
        item: composer,
        startX: x(composer.birthYear),
        endX: x(Math.max(composer.birthYear + 1, composer.deathYear ?? currentYear)),
        labelWidth:
          estimateLabelWidth(composer.name) +
          (composer.tier === 'S' ? GANTT_PORTRAIT_SPACE : 0) +
          (hasComparison ? GANTT_DOT_SPACE : 0) +
          2,
        priority: priorityOf(composer, hasComparison, focusEra?.name ?? null),
      };
    });
    return placeLabeledSpans(inputs, { gapPx: LABEL_GAP_PX, maxLanes, rightEdge: chartWidth - 4 });
  }, [composers, comparable, x, currentYear, focusEra, maxLanes, chartWidth]);

  const overflowGroups = React.useMemo(
    () => layoutOverflowGroups(overflow, eras, x, fromYear, toYear, chartWidth),
    [overflow, eras, x, fromYear, toYear, chartWidth]
  );
  const density = React.useMemo(
    () => decadeDensity(validComposers, { fromYear, toYear, currentYear }),
    [validComposers, fromYear, toYear, currentYear]
  );
  const eraOrder = React.useMemo(() => PERIODS.map((era) => era.name), []);
  const ticks = yearTicks(fromYear, toYear, ppy);

  const yearAt = (px: number) => fromYear + (px - PAD_LEFT) / ppy;
  const stripViewport = scrollable
    ? { startYear: yearAt(scrollX), endYear: yearAt(scrollX + viewportWidth) }
    : null;

  const scrollToYear = React.useCallback(
    (year: number, level: number, animated: boolean) => {
      const targetPpy = pxPerYearAt(level);
      const targetWidth = Math.max(viewportWidth, PAD_LEFT + span * targetPpy + PAD_RIGHT);
      const left = clamp(
        PAD_LEFT + (year - fromYear) * targetPpy - viewportWidth / 2,
        0,
        Math.max(0, targetWidth - viewportWidth)
      );
      chartScrollRef.current?.scrollTo({ x: left, animated });
      setScrollX(left);
    },
    [pxPerYearAt, viewportWidth, span, fromYear]
  );

  /** 그 해가 가운데 오게 줌 단계를 바꾼다. 단계가 바뀌면 다시 그린 다음 옮긴다 */
  const centerAt = (year: number, level: number) => {
    const next = clamp(level, 0, ZOOM_MULTIPLIERS.length - 1);
    if (next === zoom) {
      scrollToYear(year, next, true);
      return;
    }
    pendingCenterRef.current = year;
    setZoom(next);
  };

  React.useEffect(() => {
    const year = pendingCenterRef.current;
    if (year === null || viewportWidth === 0) return;
    pendingCenterRef.current = null;
    // 차트 폭이 새로 잡힌 다음 프레임에 옮겨야 스크롤 범위가 맞다
    const frame = requestAnimationFrame(() => scrollToYear(year, zoom, false));
    return () => cancelAnimationFrame(frame);
  }, [zoom, viewportWidth, scrollToYear]);

  const currentCenterYear = () =>
    scrollable ? yearAt(scrollX + viewportWidth / 2) : focusEra ? eraMid(focusEra) : (fromYear + toYear) / 2;

  const eraMid = (era: Period) => (Math.max(era.startYear, fromYear) + Math.min(era.endYear, toYear)) / 2;

  /** 데스크톱은 그 시대가 화면에 꽉 차게 확대하고, 모바일은 그 자리로 옮기기만 한다 */
  const focusOnEra = (era: Period) => {
    setFocusEraId(era.id);
    setExpanded(false);
    if (!wide) {
      centerAt(eraMid(era), zoom);
      return;
    }
    const eraSpan = Math.min(era.endYear, toYear) - Math.max(era.startYear, fromYear);
    const target = (viewportWidth * 0.9) / (eraSpan + 16);
    let level = 1;
    for (let index = 1; index < ZOOM_MULTIPLIERS.length; index += 1) {
      if (pxPerYearAt(index) <= target) level = index;
    }
    centerAt(eraMid(era), level);
  };

  const clearFocus = () => {
    setFocusEraId(null);
    setExpanded(false);
    if (wide) centerAt((fromYear + toYear) / 2, 0);
  };

  const onOverflowPress = (group: OverflowGroup) => {
    const era = eras.find((item) => item.id === group.eraId);
    if (!era) return;
    if (focusEraId !== era.id) focusOnEra(era);
    else setExpanded(true);
  };

  const onStripPress = (year: number) => {
    // 전체가 보이는 기본 줌에서 누르면 한 단계 확대해 그 해로 간다
    centerAt(year, scrollable ? zoom : Math.max(1, zoom));
  };

  const ready = viewportWidth > 0 && validComposers.length > 0;
  React.useEffect(() => {
    if (!ready || !focusEraParam || appliedParamRef.current === focusEraParam) return;
    appliedParamRef.current = focusEraParam;
    const era = eras.find((item) => item.id === focusEraParam);
    // 딥링크는 처음 한 번만 적용한다
    if (era) focusOnEra(era);
  }, [ready, focusEraParam, eras]);

  // 모바일은 가로로 넘겨 보는 차트라, 처음에는 대표 작곡가들이 몰린 곳을 가운데에 둔다
  const initialCenteredRef = React.useRef(false);
  React.useEffect(() => {
    if (!ready || initialCenteredRef.current || focusEraParam) return;
    initialCenteredRef.current = true;
    if (!scrollable) return;
    const stars = validComposers
      .filter((c) => c.tier === 'S')
      .map((c) => (c.birthYear + (c.deathYear ?? currentYear)) / 2)
      .sort((a, b) => a - b);
    const center = stars.length > 0 ? stars[Math.floor(stars.length / 2)] : (fromYear + toYear) / 2;
    const frame = requestAnimationFrame(() => scrollToYear(center, zoom, false));
    return () => cancelAnimationFrame(frame);
  }, [ready, focusEraParam, scrollable, validComposers, currentYear, fromYear, toYear, scrollToYear, zoom]);

  // 스크롤할 때마다 화면이 다시 그려진다. 막대 줄(memo)이 다시 그려지지 않게 콜백을 고정한다
  const toggleSelected = React.useCallback(
    (id: number) => setSelectedId((current) => (current === id ? null : id)),
    []
  );
  const selected = composers.find((c) => c.id === selectedId) ?? null;
  const hiddenCount = overflow.length;
  const comparableLoading = scope === 'comparable' && comparableQuery.isLoading;

  const zoomControls = (
    <View className="flex-row items-center gap-1.5">
      <Pressable
        accessibilityLabel="축소"
        disabled={zoom === 0}
        onPress={() => centerAt(currentCenterYear(), zoom - 1)}
        className={cn('size-8 items-center justify-center rounded-full bg-surface-2', zoom === 0 && 'opacity-40')}>
        <Icon as={MinusIcon} size={16} className="text-foreground" />
      </Pressable>
      <Pressable
        accessibilityLabel="확대"
        disabled={zoom === ZOOM_MULTIPLIERS.length - 1}
        onPress={() => centerAt(currentCenterYear(), zoom + 1)}
        className={cn(
          'size-8 items-center justify-center rounded-full bg-surface-2',
          zoom === ZOOM_MULTIPLIERS.length - 1 && 'opacity-40'
        )}>
        <Icon as={PlusIcon} size={16} className="text-foreground" />
      </Pressable>
    </View>
  );

  const eraChips = (
    <>
      <Chip size="sm" label="전체 기간" selected={focusEraId === null} onPress={clearFocus} />
      {eras.map((era) => (
        <Chip
          key={era.id}
          size="sm"
          label={era.name}
          selected={focusEraId === era.id}
          leading={<ChipDot color={getEraForeground(era.name, scheme) ?? era.color} />}
          onPress={() => (focusEraId === era.id ? clearFocus() : focusOnEra(era))}
        />
      ))}
    </>
  );

  return (
    <View className="flex-1 bg-background web:bg-surface-1">
      <ScrollView
        {...scrollInsets}
        onLayout={(event: LayoutChangeEvent) => setPageHeight(event.nativeEvent.layout.height)}
        contentContainerClassName={cn('pb-40', wide ? 'px-7 pt-2' : 'px-4 pt-3')}>
        <View onLayout={(event: LayoutChangeEvent) => setHeaderHeight(event.nativeEvent.layout.height)}>
          <View className={cn('gap-4', wide && 'flex-row items-end justify-between')}>
            <View className="min-w-0 flex-1">
              <Pressable
                onPress={() => router.push('/artists' as Href)}
                accessibilityRole="link"
                className="mb-1 flex-row items-center gap-1 self-start">
                <Icon as={ChevronLeftIcon} size={14} className="text-foreground-muted" />
                <Text variant="caption" className="text-foreground-muted">
                  작곡가 목록으로 보기
                </Text>
              </Pressable>
              <Text variant={wide ? 'display' : 'title1'}>타임라인</Text>
              <Text variant="bodySm" className="mt-1 text-foreground-muted">
                작곡가들이 살았던 시간을 겹쳐 봐요. 누가 같은 시대를 살았는지 한눈에 보여요.
              </Text>
            </View>
            <View className="flex-row items-center gap-2.5">
              <View className="flex-row gap-0.5 rounded-full bg-surface-2 p-[3px]" accessibilityRole="tablist">
                {SCOPES.map((item) => (
                  <Pressable
                    key={item.key}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: scope === item.key }}
                    onPress={() => {
                      setScope(item.key);
                      setExpanded(false);
                    }}
                    className={cn('h-[30px] justify-center rounded-full px-3.5', scope === item.key && 'bg-surface-3')}>
                    <Text
                      className={cn(
                        'text-label font-semibold',
                        scope === item.key ? 'text-foreground' : 'text-foreground-muted'
                      )}>
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {zoomControls}
            </View>
          </View>

          {wide ? (
            <View className="mt-4 flex-row items-center gap-4">
              <View className="flex-row flex-wrap gap-1.5">{eraChips}</View>
              <Legend className="ml-auto" />
              {canEdit ? (
                <Button variant="outline" size="sm" onPress={() => setShowForm(true)}>
                  <Icon as={PlusIcon} size={14} className="text-foreground" />
                  <Text>작곡가 추가</Text>
                </Button>
              ) : null}
            </View>
          ) : (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="-mx-4 mt-3"
                contentContainerClassName="gap-1.5 px-4">
                {eraChips}
              </ScrollView>
              <View className="mt-3 flex-row flex-wrap items-center gap-3">
                <Legend />
                {canEdit ? (
                  <Button variant="outline" size="sm" className="ml-auto" onPress={() => setShowForm(true)}>
                    <Icon as={PlusIcon} size={14} className="text-foreground" />
                    <Text>작곡가 추가</Text>
                  </Button>
                ) : null}
              </View>
            </>
          )}
        </View>

        <View
          className="mt-4"
          onLayout={(event: LayoutChangeEvent) => setViewportWidth(Math.floor(event.nativeEvent.layout.width))}>
          {composersQuery.isLoading || comparableLoading ? (
            <TimelineSkeleton />
          ) : composersQuery.isError ? (
            <EmptyState
              icon={AlertCircleIcon}
              tone="error"
              title="작곡가를 불러오지 못했어요"
              description="연결이 잠시 끊겼을 수 있어요. 다시 시도해 주세요."
              action={{ label: '다시 시도', onPress: () => composersQuery.refetch() }}
            />
          ) : scope === 'comparable' && comparableQuery.isError ? (
            <EmptyState
              icon={AlertCircleIcon}
              tone="error"
              title="비교 영상 정보를 불러오지 못했어요"
              description="잠시 뒤 다시 시도하거나 주요 작곡가부터 둘러봐 주세요."
              action={{ label: '다시 시도', onPress: () => comparableQuery.refetch() }}
            />
          ) : composers.length === 0 ? (
            <EmptyState
              icon={UsersIcon}
              title="보여 줄 작곡가가 아직 없어요"
              description="다른 범위를 골라 보세요."
              action={{ label: '전체 작곡가 보기', onPress: () => setScope('all') }}
            />
          ) : viewportWidth > 0 ? (
            <>
              <View className="h-4 flex-row items-center justify-between gap-3">
                <Text numberOfLines={1} className="min-w-0 shrink text-micro text-foreground-subtle">
                  {`10년마다 살았던 작곡가 수 · ${scrollable ? '누르면 그 해로 가요' : '누르면 확대해요'}`}
                </Text>
                {expanded ? (
                  <Pressable accessibilityRole="button" onPress={() => setExpanded(false)} hitSlop={8}>
                    <Text className="text-micro text-primary">한 화면으로 접기</Text>
                  </Pressable>
                ) : hiddenCount > 0 && wide ? (
                  <Text numberOfLines={1} className="shrink-0 text-micro text-foreground-subtle">
                    {`${hiddenCount}명은 시대별로 묶었어요`}
                  </Text>
                ) : null}
              </View>
              <DensityStrip
                buckets={density}
                eraOrder={eraOrder}
                fromYear={fromYear}
                toYear={toYear}
                width={viewportWidth}
                padLeft={PAD_LEFT}
                padRight={PAD_RIGHT}
                scheme={scheme}
                viewport={stripViewport}
                onPressYear={onStripPress}
              />
              <ScrollView
                ref={chartScrollRef}
                horizontal
                scrollEnabled={scrollable}
                showsHorizontalScrollIndicator={scrollable}
                scrollEventThrottle={32}
                onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) =>
                  setScrollX(event.nativeEvent.contentOffset.x)
                }
                className="mt-2.5">
                <ComposerGantt
                  width={chartWidth}
                  placed={placed}
                  laneCount={laneCount}
                  overflowGroups={overflowGroups}
                  eras={eras}
                  ticks={ticks}
                  x={x}
                  fromYear={fromYear}
                  toYear={toYear}
                  focusEraId={focusEraId}
                  selectedId={selectedId}
                  comparable={comparable}
                  scheme={scheme}
                  onSelect={toggleSelected}
                  onOverflowPress={onOverflowPress}
                />
              </ScrollView>
            </>
          ) : null}
        </View>
      </ScrollView>

      {/* 선택 카드는 스크롤과 상관없이 화면 아래에 뜬다 */}
      {selected ? (
        <View className={cn('absolute bottom-4', wide ? 'right-6 w-[380px]' : 'left-3 right-3')}>
          <SelectedComposer
            composer={selected}
            comparableCount={comparable?.get(selected.id) ?? 0}
            onOpenComposer={() => router.push(`/composer/${selected.id}` as Href)}
            onClose={() => setSelectedId(null)}
          />
        </View>
      ) : null}

      <ComposerFormModal
        visible={showForm}
        onClose={() => setShowForm(false)}
        onSuccess={() => {
          setShowForm(false);
          void composersQuery.refetch();
        }}
      />
    </View>
  );
}

function Legend({ className }: { className?: string }) {
  return (
    <View className={cn('flex-row flex-wrap items-center gap-x-3 gap-y-1', className)}>
      <View className="flex-row items-center gap-1.5">
        <View className="size-1.5 rounded-full bg-primary" />
        <Text variant="caption">비교 영상 있음</Text>
      </View>
      <Text variant="caption">사진은 대표 작곡가 · 막대는 생애</Text>
    </View>
  );
}

function TimelineSkeleton() {
  return (
    <View className="gap-2.5">
      <Skeleton className="h-8 w-full rounded-md" />
      {Array.from({ length: 12 }, (_, index) => (
        <View key={index} style={{ marginLeft: `${(index * 13) % 60}%`, width: `${14 + ((index * 17) % 26)}%` }}>
          <Skeleton className="h-2.5 w-3/5 rounded-sm" />
          <Skeleton className="mt-1 h-1 rounded-full" />
        </View>
      ))}
    </View>
  );
}

/** 선택한 작곡가: 여기서 바로 비교로 간다 */
function SelectedComposer({
  composer,
  comparableCount,
  onOpenComposer,
  onClose,
}: {
  composer: Composer;
  comparableCount: number;
  onOpenComposer: () => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const pieces = useComparisonPieces(composer.id, comparableCount > 0);
  const firstPiece = comparableCount > 0 ? pieces.data?.pages[0]?.[0] : undefined;

  return (
    <View
      className="rounded-xl border border-border-strong bg-surface-2 p-4"
      style={{ shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 24, shadowOffset: { width: 0, height: 12 } }}>
      <View className="flex-row items-center gap-3">
        <EntityThumb name={composer.name} image={composer.avatarUrl} shape="circle" size={48} />
        <View className="min-w-0 flex-1">
          <Text className="text-body font-bold text-foreground">{composer.name}</Text>
          <Text variant="mono" className="mt-0.5 text-foreground-muted">
            {`${composer.birthYear}–${composer.deathYear ?? ''} · ${composer.period}`}
          </Text>
        </View>
        <Pressable accessibilityLabel="닫기" onPress={onClose} hitSlop={10} className="size-8 items-center justify-center">
          <Icon as={XIcon} size={16} className="text-foreground-muted" />
        </Pressable>
      </View>
      <Text variant="caption" className="mt-3">
        {comparableCount > 0 ? `비교할 수 있는 작품 ${comparableCount}곡` : '아직 비교할 수 있는 작품이 없어요'}
      </Text>
      <View className="mt-3 flex-row gap-2">
        {firstPiece ? (
          <Button
            size="sm"
            className="rounded-full"
            onPress={() =>
              router.push(`/compare?composerId=${firstPiece.composerId}&pieceId=${firstPiece.pieceId}` as Href)
            }>
            <Text className="text-primary-foreground">비교 보기</Text>
          </Button>
        ) : null}
        <Button size="sm" variant="outline" className="rounded-full" onPress={onOpenComposer}>
          <Text>작곡가 정보</Text>
        </Button>
      </View>
    </View>
  );
}

import { ComposerFormModal } from '@/components/admin/ComposerFormModal';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { EntityThumb } from '@/components/ui/entity-thumb';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { PERIODS } from '@/lib/data/periods';
import { getEraFill, getEraForeground } from '@/lib/design/era-palette';
import { placeLifeSpans, yearTicks } from '@/lib/design/timeline-layout';
import { useAuth } from '@/lib/hooks/useAuth';
import { useComparableComposers, useComparisonPieces } from '@/lib/query/hooks/useComparisonPerformances';
import { useAllComposers } from '@/lib/query/hooks/useComposers';
import type { Composer } from '@/lib/types/models';
import { cn } from '@/lib/utils';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { AlertCircleIcon, MinusIcon, PlusIcon, XIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

type Scope = 'major' | 'comparable' | 'all';

const SCOPES: { key: Scope; label: string }[] = [
  { key: 'major', label: '주요 작곡가' },
  { key: 'comparable', label: '비교 있는 작곡가' },
  { key: 'all', label: '전체' },
];

/** 한 해를 몇 px로 그릴지. 확대·축소 단계 */
const ZOOM_STEPS = [2.2, 3.2, 4.6, 6.4];
const LANE_HEIGHT = 40;
const BAR_HEIGHT = 32;
const RIBBON_AREA = 78;

export default function TimelineScreen() {
  const router = useRouter();
  // 홈 "시대로 듣기"에서 오면 그 시대가 보이는 곳부터 연다
  const { era: focusEraId } = useLocalSearchParams<{ era?: string }>();
  const chartScrollRef = React.useRef<ScrollView>(null);
  const { canEdit } = useAuth();
  const { layout } = useBreakpoint();
  const wide = layout === 'desktop' || layout === 'wide';
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const [scope, setScope] = React.useState<Scope>('major');
  const [zoom, setZoom] = React.useState(1);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [showForm, setShowForm] = React.useState(false);

  const composersQuery = useAllComposers();
  const comparable = useComparableComposers().data;
  const currentYear = new Date().getFullYear();

  const composers = React.useMemo(() => {
    const all = composersQuery.data ?? [];
    if (scope === 'major') return all.filter((c) => c.tier === 'S' || c.tier === 'A');
    if (scope === 'comparable') return all.filter((c) => comparable?.has(c.id));
    return all;
  }, [composersQuery.data, scope, comparable]);

  const ppy = ZOOM_STEPS[zoom];
  const { placed, laneCount } = React.useMemo(
    () => placeLifeSpans(composers, { currentYear, gapYears: 3, minSpanYears: Math.ceil(96 / ppy) }),
    [composers, currentYear, ppy]
  );
  const fromYear =
    placed.length > 0 ? Math.floor((Math.min(...placed.map((p) => p.startYear)) - 10) / 50) * 50 : 1600;
  const toYear = Math.max(currentYear, ...placed.map((p) => p.endYear));
  // 왼쪽 끝 눈금 글자가 잘리지 않게 여백을 둔다
  const x = (year: number) => 20 + (year - fromYear) * ppy;
  const chartWidth = x(toYear) + 28;
  const chartHeight = RIBBON_AREA + Math.max(1, laneCount) * LANE_HEIGHT + 16;

  const eras = PERIODS.filter((era) => era.endYear > fromYear);
  const selected = composers.find((c) => c.id === selectedId) ?? null;
  const focusEra = eras.find((era) => era.id === focusEraId);
  const focusX = focusEra ? Math.max(0, x(Math.max(focusEra.startYear, fromYear)) - 24) : null;

  React.useEffect(() => {
    if (focusX === null || placed.length === 0) return;
    // 차트가 그려진 다음 프레임에 옮겨야 스크롤 폭이 잡혀 있다
    const frame = requestAnimationFrame(() => chartScrollRef.current?.scrollTo({ x: focusX, animated: false }));
    return () => cancelAnimationFrame(frame);
  }, [focusX, placed.length]);

  return (
    <View className="flex-1 bg-background web:bg-surface-1">
      <ScrollView contentContainerClassName={cn('pb-40', wide ? 'px-7 pt-2' : 'px-4 pt-3')}>
        <View className={cn('gap-4', wide && 'flex-row items-end justify-between')}>
          <View className="min-w-0 flex-1">
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
                  onPress={() => setScope(item.key)}
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
            <Pressable
              accessibilityLabel="축소"
              disabled={zoom === 0}
              onPress={() => setZoom((value) => Math.max(0, value - 1))}
              className={cn('size-8 items-center justify-center rounded-full bg-surface-2', zoom === 0 && 'opacity-40')}>
              <Icon as={MinusIcon} size={16} className="text-foreground" />
            </Pressable>
            <Pressable
              accessibilityLabel="확대"
              disabled={zoom === ZOOM_STEPS.length - 1}
              onPress={() => setZoom((value) => Math.min(ZOOM_STEPS.length - 1, value + 1))}
              className={cn(
                'size-8 items-center justify-center rounded-full bg-surface-2',
                zoom === ZOOM_STEPS.length - 1 && 'opacity-40'
              )}>
              <Icon as={PlusIcon} size={16} className="text-foreground" />
            </Pressable>
          </View>
        </View>

        <View className="mt-4 flex-row flex-wrap items-center gap-4">
          <View className="flex-row items-center gap-1.5">
            <View className="size-1.5 rounded-full bg-primary" />
            <Text variant="caption">비교 영상이 있는 작곡가</Text>
          </View>
          <Text variant="caption">막대 길이는 생애, 가로축은 연도</Text>
          {canEdit ? (
            <Button variant="outline" size="sm" className="ml-auto" onPress={() => setShowForm(true)}>
              <Icon as={PlusIcon} size={14} className="text-foreground" />
              <Text>작곡가 추가</Text>
            </Button>
          ) : null}
        </View>

        {composersQuery.isLoading ? (
          <View className="mt-8 gap-3">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton
                key={index}
                className="h-8 rounded-full"
                style={{ width: `${40 + ((index * 17) % 45)}%`, marginLeft: `${(index * 11) % 40}%` }}
              />
            ))}
          </View>
        ) : composersQuery.isError ? (
          <EmptyState
            icon={AlertCircleIcon}
            tone="error"
            title="작곡가를 불러오지 못했어요"
            description="연결이 잠시 끊겼을 수 있어요. 다시 시도해 주세요."
            action={{ label: '다시 시도', onPress: () => composersQuery.refetch() }}
          />
        ) : (
          <ScrollView ref={chartScrollRef} horizontal showsHorizontalScrollIndicator className="mt-8">
            <View style={{ width: chartWidth, height: chartHeight }}>
              {yearTicks(fromYear, toYear).map((year) => (
                <View key={year} className="absolute bottom-0 top-0 w-px bg-border" style={{ left: x(year) }}>
                  <Text variant="mono" className="absolute -left-4 -top-1 w-8 text-center text-foreground-subtle">
                    {year}
                  </Text>
                </View>
              ))}

              {/* 시대는 서로 겹친다. 두 줄에 번갈아 둔다 */}
              {eras.map((era, index) => {
                const left = x(Math.max(era.startYear, fromYear));
                const width = x(Math.min(era.endYear, toYear)) - left;
                const top = index % 2 === 0 ? 22 : 50;
                const color = getEraForeground(era.name, scheme);
                const dimmed = focusEra !== undefined && focusEra.id !== era.id;
                return (
                  <View key={era.id} className="absolute" style={{ left, top, width, opacity: dimmed ? 0.45 : 1 }}>
                    <View className="h-1.5 rounded-full" style={{ backgroundColor: color, opacity: 0.8 }} />
                    <Text className="mt-1 text-caption font-semibold" style={{ color }}>
                      {focusEra?.id === era.id ? `${era.name} · ${era.startYear}–${era.endYear}` : era.name}
                    </Text>
                  </View>
                );
              })}

              {placed.map(({ item, lane, startYear, endYear }) => {
                const width = (endYear - startYear) * ppy;
                const isSelected = item.id === selectedId;
                const hasComparison = comparable?.has(item.id) ?? false;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => setSelectedId(isSelected ? null : item.id)}
                    accessibilityLabel={`${item.name} ${item.birthYear}–${item.deathYear ?? ''}`}
                    className={cn(
                      'absolute flex-row items-center gap-1.5 overflow-hidden rounded-full pl-1 pr-2.5',
                      isSelected && 'border-2 border-primary'
                    )}
                    style={{
                      left: x(startYear),
                      top: RIBBON_AREA + lane * LANE_HEIGHT,
                      width,
                      height: BAR_HEIGHT,
                      backgroundColor: getEraFill(item.period, scheme) ?? undefined,
                    }}>
                    <EntityThumb name={item.name} image={item.avatarUrl} shape="circle" size={24} />
                    <Text numberOfLines={1} className="shrink text-caption font-semibold text-foreground">
                      {item.name}
                    </Text>
                    {width > 170 ? (
                      <Text variant="mono" className="text-[10.5px] text-foreground-muted">
                        {`${item.birthYear}–${item.deathYear ?? ''}`}
                      </Text>
                    ) : null}
                    {hasComparison ? <View className="size-1.5 shrink-0 rounded-full bg-primary" /> : null}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        )}
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

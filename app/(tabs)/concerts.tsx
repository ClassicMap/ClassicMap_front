import { ConcertFormModal } from '@/components/admin/ConcertFormModal';
import { concertClock, daysLeft, parseDay, shortVenue } from '@/components/concert/concert-parts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { EntityThumb } from '@/components/ui/entity-thumb';
import { Icon } from '@/components/ui/icon';
import { TicketIcon } from '@/components/ui/icons';
import { Skeleton, SkeletonCard } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { BoxofficeAPI, type BoxofficeConcert } from '@/lib/api/client';
import { normalizeAreas, type AreaOption } from '@/lib/data/areas';
import { getRankForeground } from '@/lib/design/rank-palette';
import { useAuth } from '@/lib/hooks/useAuth';
import { useAreas, useConcerts } from '@/lib/query/hooks/useConcerts';
import type { Concert } from '@/lib/types/models';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { type Href, useRouter } from 'expo-router';
import { AlertCircleIcon, PlusIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { type LayoutChangeEvent, Pressable, ScrollView, View } from 'react-native';

const WEEKDAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

interface DateGroup {
  key: string;
  title: string;
  subtitle: string;
  concerts: Concert[];
}

/** 시작일로 묶는다. 이미 시작한 여러 날 공연은 '공연 중'으로 모은다. */
function groupByDay(concerts: Concert[]): DateGroup[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const groups = new Map<string, DateGroup>();
  for (const concert of concerts) {
    const start = parseDay(concert.startDate);
    if (!start) continue;
    const diff = Math.round((start.getTime() - today.getTime()) / 86_400_000);
    let key: string;
    let title: string;
    let subtitle = `${start.getMonth() + 1}월 ${start.getDate()}일 ${WEEKDAYS[start.getDay()]}`;
    if (diff < 0) {
      key = 'ongoing';
      title = '공연 중';
      subtitle = '이미 시작한 여러 날 공연';
    } else {
      key = concert.startDate;
      title = diff === 0 ? '오늘' : diff === 1 ? '내일' : subtitle;
      if (diff > 1) subtitle = '';
    }
    const group = groups.get(key) ?? { key, title, subtitle, concerts: [] };
    group.concerts.push(concert);
    groups.set(key, group);
  }
  return [...groups.values()];
}

export default function ConcertsScreen() {
  const router = useRouter();
  const { canEdit } = useAuth();
  const { layout } = useBreakpoint();
  const wide = layout === 'desktop' || layout === 'wide';
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const [area, setArea] = React.useState<AreaOption | null>(null);
  const [gridWidth, setGridWidth] = React.useState(0);
  const [showForm, setShowForm] = React.useState(false);

  const areasQuery = useAreas();
  const areas = React.useMemo(() => normalizeAreas(areasQuery.data ?? []), [areasQuery.data]);
  const concertsQuery = useConcerts(area?.value);
  const concerts = React.useMemo(() => {
    const all = concertsQuery.data?.pages.flat() ?? [];
    return Array.from(new Map(all.map((concert) => [concert.id, concert])).values());
  }, [concertsQuery.data]);
  const groups = React.useMemo(() => groupByDay(concerts), [concerts]);

  const kopisCode = area ? area.kopisCode : '00';
  const boxofficeQuery = useQuery({
    queryKey: ['boxoffice', kopisCode ?? 'none'],
    queryFn: () => BoxofficeAPI.getTop3(kopisCode),
    enabled: kopisCode !== undefined,
    staleTime: 10 * 60_000,
  });
  // 집계 기간이 다른 같은 공연이 두 번 올 수 있어 공연 ID로 한 번만 남긴다
  const boxoffice = React.useMemo(() => {
    const seen = new Set<number>();
    return (boxofficeQuery.data ?? [])
      .slice()
      .sort((a, b) => a.ranking - b.ranking)
      .filter((item) => (seen.has(item.concertId) ? false : (seen.add(item.concertId), true)));
  }, [boxofficeQuery.data]);

  const columns = wide ? Math.max(3, Math.floor((gridWidth + 18) / 196)) : 2;
  const cardWidth = gridWidth > 0 ? (gridWidth - 18 * (columns - 1)) / columns : 0;

  const onGridLayout = (event: LayoutChangeEvent) => setGridWidth(event.nativeEvent.layout.width);

  const boxofficePanel =
    kopisCode === undefined ? null : (
      <View>
        <Text variant="headline">많이 찾는 공연</Text>
        <Text variant="caption" className="mb-2 mt-1 text-foreground-subtle">
          {boxoffice[0]
            ? `KOPIS 예매 순위 · ${boxoffice[0].syncStartDate.slice(5).replace('-', '.')}–${boxoffice[0].syncEndDate
                .slice(5)
                .replace('-', '.')}`
            : 'KOPIS 예매 순위'}
        </Text>
        {boxofficeQuery.isLoading ? (
          <Skeleton className="h-20 w-full rounded-lg" />
        ) : boxoffice.length === 0 ? (
          <Text variant="caption">이 지역 순위가 아직 없어요.</Text>
        ) : (
          <View className={cn(wide ? 'gap-1' : 'flex-row gap-3')}>
            {boxoffice.map((item: BoxofficeConcert) => (
              <Pressable
                key={item.concertId}
                onPress={() => router.push(`/concert/${item.concertId}` as Href)}
                className={cn(
                  'flex-row items-center gap-3 rounded-lg p-2.5 active:bg-surface-2 web:hover:bg-surface-2',
                  wide ? '-mx-2.5' : 'w-[280px] bg-surface-2'
                )}>
                <Text
                  className="w-6 text-center text-[22px] font-extrabold"
                  style={{ color: getRankForeground(item.ranking, scheme) }}>
                  {item.ranking}
                </Text>
                <EntityThumb name={item.title} image={item.posterUrl} shape="square" size={52} aspect={4 / 3} />
                <View className="min-w-0 flex-1">
                  <Text numberOfLines={2} className="text-body-sm font-semibold text-foreground">
                    {item.title}
                  </Text>
                  <Text variant="caption" numberOfLines={1} className="mt-1">
                    {[item.startDate.slice(5).replace('-', '.'), shortVenue(item.facilityName)].filter(Boolean).join(' · ')}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    );

  return (
    <View className="flex-1 bg-background web:bg-surface-1">
      <ScrollView
        className="flex-1"
        contentContainerClassName={cn('pb-20', wide ? 'px-7 pt-2' : 'px-4 pt-3')}
        onScroll={(event) => {
          const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
          if (
            layoutMeasurement.height + contentOffset.y >= contentSize.height - 600 &&
            concertsQuery.hasNextPage &&
            !concertsQuery.isFetchingNextPage
          ) {
            void concertsQuery.fetchNextPage();
          }
        }}
        scrollEventThrottle={200}>
        <View className="flex-row items-end justify-between gap-4">
          <View className="min-w-0 flex-1">
            <Text variant={wide ? 'display' : 'title1'}>공연</Text>
            <Text variant="caption" className="mt-1">
              클래식 공연 일정 · KOPIS 공연예술통합전산망 제공
            </Text>
          </View>
          {canEdit ? (
            <Button variant="outline" size="sm" onPress={() => setShowForm(true)}>
              <Icon as={PlusIcon} size={14} className="text-foreground" />
              <Text>공연 추가</Text>
            </Button>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-5 border-b border-border pb-4"
          contentContainerClassName="gap-2">
          <Chip label="전국" selected={area === null} onPress={() => setArea(null)} />
          {areas.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={area?.value === option.value}
              onPress={() => setArea(option)}
            />
          ))}
        </ScrollView>

        {!wide ? <View className="mt-5">{boxofficePanel}</View> : null}

        <View className={cn(wide && 'flex-row gap-9')}>
          <View className="min-w-0 flex-1" onLayout={onGridLayout}>
            {concertsQuery.isLoading ? (
              <View className="mt-8 flex-row flex-wrap gap-[18px]">
                {Array.from({ length: wide ? 10 : 4 }, (_, index) => (
                  <View key={index} style={{ width: cardWidth || 160 }}>
                    <SkeletonCard aspect="poster" />
                  </View>
                ))}
              </View>
            ) : concertsQuery.isError ? (
              <EmptyState
                icon={AlertCircleIcon}
                tone="error"
                title="공연 목록을 불러오지 못했어요"
                description="연결이 잠시 끊겼을 수 있어요. 다시 시도해 주세요."
                action={{ label: '다시 시도', onPress: () => concertsQuery.refetch() }}
              />
            ) : groups.length === 0 ? (
              <EmptyState
                icon={TicketIcon}
                title={area ? `${area.label}에 예정된 공연이 없어요` : '예정된 공연이 없어요'}
                description="다른 지역을 골라 보세요."
                action={area ? { label: '전국 보기', onPress: () => setArea(null) } : undefined}
              />
            ) : (
              groups.map((group) => (
                <View key={group.key}>
                  <View className="mb-3.5 mt-8 flex-row items-baseline gap-2.5">
                    <Text className="text-[18px] font-bold text-foreground">{group.title}</Text>
                    {group.subtitle ? <Text variant="caption">{group.subtitle}</Text> : null}
                  </View>
                  <View className="flex-row flex-wrap gap-x-[18px] gap-y-5">
                    {group.concerts.map((concert) => (
                      <ConcertCard key={concert.id} concert={concert} width={cardWidth} />
                    ))}
                  </View>
                </View>
              ))
            )}
            {concertsQuery.isFetchingNextPage ? (
              <View className="mt-6 flex-row gap-[18px]">
                <Skeleton className="h-4 w-1/3" />
              </View>
            ) : null}
          </View>
          {wide ? <View className="w-[300px] pt-8">{boxofficePanel}</View> : null}
        </View>
      </ScrollView>

      <ConcertFormModal
        visible={showForm}
        onClose={() => setShowForm(false)}
        onSuccess={() => {
          setShowForm(false);
          void concertsQuery.refetch();
        }}
      />
    </View>
  );
}

function ConcertCard({ concert, width }: { concert: Concert; width: number }) {
  const router = useRouter();
  const days = daysLeft(concert.startDate);
  const time = concertClock(concert.concertTime);
  if (width <= 0) return null;
  return (
    <Pressable
      onPress={() => router.push(`/concert/${concert.id}` as Href)}
      accessibilityRole="link"
      style={{ width }}
      className="rounded-md web:hover:opacity-90">
      <View className="relative">
        <EntityThumb name={concert.title} image={concert.posterUrl} shape="square" size={width} aspect={4 / 3} />
        {days === 0 ? <Badge tone="accent" label="오늘" className="absolute left-2 top-2" /> : null}
        {concert.status === 'cancelled' ? <Badge tone="danger" label="취소" className="absolute left-2 top-2" /> : null}
      </View>
      <Text numberOfLines={2} className="mt-2.5 text-body-sm font-semibold text-foreground">
        {concert.title}
      </Text>
      <Text variant="caption" numberOfLines={1} className="mt-1">
        {[time, shortVenue(concert.facilityName)].filter(Boolean).join(' · ')}
      </Text>
    </Pressable>
  );
}

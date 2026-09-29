import { ConcertFormModal } from '@/components/admin/ConcertFormModal';
import { ConcertCard } from '@/components/concert/concert-card';
import { ConcertFilterBar, ConcertMobileFilter, ConcertSearchField } from '@/components/concert/concert-filter-bar';
import type { ArtistChoice } from '@/components/concert/concert-filter-panels';
import { FavoriteArtistConcerts } from '@/components/concert/favorite-artist-concerts';
import { parseDay, shortVenue } from '@/components/concert/concert-parts';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { EntityThumb } from '@/components/ui/entity-thumb';
import { Icon } from '@/components/ui/icon';
import { TicketIcon } from '@/components/ui/icons';
import { Skeleton, SkeletonCard } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { BoxofficeAPI, type BoxofficeConcert } from '@/lib/api/client';
import { normalizeAreas } from '@/lib/data/areas';
import {
  type ConcertFilter,
  type ConcertFilterParams,
  countActiveFilters,
  DEFAULT_CONCERT_FILTER,
  parseConcertFilter,
  selectVisibleConcerts,
  periodRange,
  toConcertFilterParams,
  toDayString,
} from '@/lib/data/concert-filters';
import { getRankForeground } from '@/lib/design/rank-palette';
import { useAuth } from '@/lib/hooks/useAuth';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useArtist } from '@/lib/query/hooks/useArtists';
import { useAreas, useFilteredConcerts } from '@/lib/query/hooks/useConcerts';
import { useMyFavorites } from '@/lib/query/hooks/useMyPage';
import type { Concert } from '@/lib/types/models';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { AlertCircleIcon, PlusIcon, SearchXIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { type LayoutChangeEvent, Pressable, ScrollView, View } from 'react-native';
import { useTabScrollInsets } from '@/components/navigation/tab-chrome';

/** 걸러낸 결과가 이보다 적으면 다음 페이지를 더 불러온다 */
const MIN_VISIBLE = 12;
const AUTOFILL_PAGE_LIMIT = 8;

const WEEKDAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

interface DateGroup {
  key: string;
  title: string;
  subtitle: string;
  concerts: Concert[];
}

/**
 * 시작일로 묶는다. 이미 시작한 여러 날 공연은 '공연 중'으로 모으고,
 * 기간 필터 첫날보다 먼저 시작한 공연은 그 첫날에 둔다 (주말을 골랐는데 금요일 묶음이 뜨지 않게).
 */
function groupByDay(concerts: Concert[], fromDay: string): DateGroup[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = toDayString(today);
  const groups = new Map<string, DateGroup>();
  for (const concert of concerts) {
    const day = fromDay > todayKey && concert.startDate < fromDay ? fromDay : concert.startDate;
    const start = parseDay(day);
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
      key = day;
      title = diff === 0 ? '오늘' : diff === 1 ? '내일' : subtitle;
      if (diff > 1) subtitle = '';
    }
    const group = groups.get(key) ?? { key, title, subtitle, concerts: [] };
    group.concerts.push(concert);
    groups.set(key, group);
  }
  // 'ongoing'은 날짜 문자열보다 뒤로 정렬되니 따로 앞에 둔다
  return [...groups.values()].sort((a, b) =>
    a.key === 'ongoing' ? -1 : b.key === 'ongoing' ? 1 : a.key.localeCompare(b.key)
  );
}

export default function ConcertsScreen() {
  const scrollInsets = useTabScrollInsets();
  const router = useRouter();
  const { canEdit, isSignedIn } = useAuth();
  const { layout } = useBreakpoint();
  const wide = layout === 'desktop' || layout === 'wide';
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const [gridWidth, setGridWidth] = React.useState(0);
  const [showForm, setShowForm] = React.useState(false);

  // 필터는 주소 파라미터가 곧 상태다. 검색어만 입력 중 값을 따로 두고 늦춰서 반영한다.
  const params = useLocalSearchParams<Record<keyof ConcertFilterParams, string>>();
  const filter = React.useMemo(
    () =>
      parseConcertFilter({
        genre: params.genre,
        period: params.period,
        visit: params.visit,
        festival: params.festival,
        area: params.area,
        instrument: params.instrument,
        artist: params.artist,
        q: params.q,
      }),
    [params.genre, params.period, params.visit, params.festival, params.area, params.instrument, params.artist, params.q]
  );
  const updateFilter = React.useCallback(
    (next: Partial<ConcertFilter>) => router.setParams(toConcertFilterParams({ ...filter, ...next })),
    [router, filter]
  );

  // 검색어는 입력 중 값을 따로 두고, 멈춘 뒤에만 주소에 올린다
  const [query, setQuery] = React.useState(filter.q);
  const debouncedQuery = useDebounce(query, 300);
  const sentQuery = React.useRef(filter.q);
  const updateFilterRef = React.useRef(updateFilter);
  updateFilterRef.current = updateFilter;
  React.useEffect(() => {
    if (debouncedQuery === sentQuery.current) return;
    sentQuery.current = debouncedQuery;
    updateFilterRef.current({ q: debouncedQuery });
  }, [debouncedQuery]);
  const resetFilter = () => {
    sentQuery.current = '';
    setQuery('');
    router.setParams(toConcertFilterParams(DEFAULT_CONCERT_FILTER));
  };

  const areasQuery = useAreas();
  const areas = React.useMemo(() => normalizeAreas(areasQuery.data ?? []), [areasQuery.data]);
  const area = areas.find((option) => option.value === filter.area) ?? null;

  const favorites = useMyFavorites(isSignedIn);
  const favoriteArtists: ArtistChoice[] = React.useMemo(
    () =>
      (favorites.data?.artists ?? []).map((artist) => ({
        artistId: artist.artistId,
        name: artist.name,
        imageUrl: artist.imageUrl,
      })),
    [favorites.data?.artists]
  );

  // 주소에는 연주자 id만 있다. 방금 고른 값 → 찜 목록 → 아티스트 상세 순으로 이름을 찾는다
  const [pickedArtist, setPickedArtist] = React.useState<ArtistChoice | undefined>(undefined);
  const knownArtist =
    (pickedArtist?.artistId === filter.artist ? pickedArtist : undefined) ??
    favoriteArtists.find((artist) => artist.artistId === filter.artist);
  const artistDetail = useArtist(knownArtist ? undefined : filter.artist);
  const selectedArtist: ArtistChoice | undefined =
    knownArtist ??
    (artistDetail.data && filter.artist
      ? { artistId: filter.artist, name: artistDetail.data.name, imageUrl: artistDetail.data.imageUrl }
      : undefined);
  const changeArtist = (artist: ArtistChoice | undefined) => {
    setPickedArtist(artist);
    updateFilter({ artist: artist?.artistId });
  };

  const range = React.useMemo(() => periodRange(filter.period), [filter.period]);
  const { query: concertsQuery, localQuery, waiting } = useFilteredConcerts(filter, range, {
    artistName: selectedArtist?.name,
  });
  const pageCount = concertsQuery.data?.pages.length ?? 0;
  const loaded = React.useMemo(() => concertsQuery.data?.pages.flat() ?? [], [concertsQuery.data]);
  const concerts = React.useMemo(
    () => selectVisibleConcerts(loaded, filter, range, localQuery),
    [loaded, filter, range, localQuery]
  );
  const groups = React.useMemo(() => groupByDay(concerts, range.from), [concerts, range.from]);

  // 서버가 아직 모르는 조건은 화면에서 걸러 한 페이지가 비어 보일 수 있다. 몇 페이지까지 더 채운다.
  React.useEffect(() => {
    if (
      concerts.length < MIN_VISIBLE &&
      pageCount > 0 &&
      pageCount < AUTOFILL_PAGE_LIMIT &&
      concertsQuery.hasNextPage &&
      !concertsQuery.isFetchingNextPage
    ) {
      void concertsQuery.fetchNextPage();
    }
  }, [concerts.length, pageCount, concertsQuery]);

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
  const activeCount = countActiveFilters(filter) + Number(Boolean(filter.q.trim()));
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
        {...scrollInsets}
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
          {wide ? <ConcertSearchField value={query} onChange={setQuery} className="w-[300px]" /> : null}
          {canEdit ? (
            <Button variant="outline" size="sm" onPress={() => setShowForm(true)}>
              <Icon as={PlusIcon} size={14} className="text-foreground" />
              <Text>공연 추가</Text>
            </Button>
          ) : null}
        </View>

        {isSignedIn && favoriteArtists.length > 0 && !filter.q.trim() && !filter.artist ? (
          <FavoriteArtistConcerts artists={favoriteArtists} from={periodRange('all').from} cardWidth={wide ? 188 : 156} />
        ) : null}

        <View className={cn('border-b border-border pb-4', wide ? 'mt-6' : 'mt-4')}>
          {wide ? (
            <ConcertFilterBar
              filter={filter}
              areas={areas}
              artist={selectedArtist}
              favoriteArtists={favoriteArtists}
              onChange={updateFilter}
              onArtistChange={changeArtist}
              onReset={resetFilter}
            />
          ) : (
            <ConcertMobileFilter
              filter={filter}
              areas={areas}
              artist={selectedArtist}
              favoriteArtists={favoriteArtists}
              onChange={updateFilter}
              onArtistChange={changeArtist}
              onReset={resetFilter}
              query={query}
              onQueryChange={setQuery}
              resultCount={concerts.length}
              more={Boolean(concertsQuery.hasNextPage)}
            />
          )}
        </View>

        {!wide ? <View className="mt-5">{boxofficePanel}</View> : null}

        <View className={cn(wide && 'flex-row gap-9')}>
          <View className="min-w-0 flex-1" onLayout={onGridLayout}>
            {concertsQuery.isLoading || waiting ? (
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
            ) : groups.length === 0 &&
              (concertsQuery.isFetchingNextPage || (concertsQuery.hasNextPage && pageCount < AUTOFILL_PAGE_LIMIT)) ? (
              <View className="mt-8">
                <Skeleton className="h-4 w-1/3" />
              </View>
            ) : groups.length === 0 ? (
              activeCount > 0 ? (
                <EmptyState
                  icon={SearchXIcon}
                  title="조건에 맞는 공연이 없어요"
                  description={
                    area ? `${area.label} 말고 다른 지역이나 날짜로 넓혀 보세요.` : '날짜를 넓히거나 조건을 몇 개 빼 보세요.'
                  }
                  action={
                    concertsQuery.hasNextPage
                      ? { label: '더 찾아보기', onPress: () => void concertsQuery.fetchNextPage() }
                      : { label: '필터 초기화', onPress: resetFilter }
                  }
                />
              ) : (
                <EmptyState icon={TicketIcon} title="예정된 공연이 없어요" description="잠시 뒤 다시 확인해 주세요." />
              )
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

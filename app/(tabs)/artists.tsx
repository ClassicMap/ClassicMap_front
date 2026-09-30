import { SELECTED_SHADOW } from '@/components/compare/switch-mode-toggle';
import { ArtistFormModal } from '@/components/admin/ArtistFormModal';
import { PeopleGrid, PeopleShelf, type PersonItem } from '@/components/artists/people-grid';
import { useTabScrollInsets } from '@/components/navigation/tab-chrome';
import { Button } from '@/components/ui/button';
import { Chip, ChipDot } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { EraIcon } from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useRepertoireIds } from '@/hooks/use-repertoire-ids';
import { ArtistAPI } from '@/lib/api/client';
import { PERIODS } from '@/lib/data/periods';
import { type ArtistCategoryCode, getArtistCategoryLabel, isArtistCategoryCode } from '@/lib/design/artist-category';
import { getEraForeground } from '@/lib/design/era-palette';
import { useAuth } from '@/lib/hooks/useAuth';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { ARTIST_QUERY_KEYS } from '@/lib/query/hooks/useArtists';
import { useBrowseComposers } from '@/lib/query/hooks/useComposers';
import { useMyFavorites } from '@/lib/query/hooks/useMyPage';
import type { Artist, Composer } from '@/lib/types/models';
import { cn } from '@/lib/utils';
import { useAuth as useClerkAuth } from '@clerk/clerk-expo';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { AlertCircleIcon, PlusIcon, SearchIcon, UsersIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { type NativeScrollEvent, type NativeSyntheticEvent, Pressable, RefreshControl, ScrollView, View } from 'react-native';

type Segment = 'composer' | 'artist';

const ARTIST_PAGE_SIZE = 30;

/** 작곡가가 있는 시대만. 칩 라벨은 짧게 */
const ERA_FILTERS = PERIODS.filter((era) => era.id !== 'medieval').map((era) => ({
  id: era.id,
  name: era.name,
  label: era.name.replace(/주의$/, ''),
}));

/** 자주 찾는 분류만 칩으로. 나머지는 이름으로 찾는다 */
const CATEGORY_FILTERS: ArtistCategoryCode[] = [
  'pianist',
  'violinist',
  'cellist',
  'violist',
  'vocalist',
  'conductor',
  'orchestra',
  'choir',
  'ensemble',
  'flutist',
  'guitarist',
];

function paramOf(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw || undefined;
}

function lifeSpan(composer: { birthYear?: number | null; deathYear?: number | null }): string {
  if (!composer.birthYear) return '';
  return `${composer.birthYear}–${composer.deathYear ?? ''}`;
}

/**
 * 아티스트 탭 (기획 C): 작곡가 | 연주자를 목록으로 훑는다.
 * 세그먼트·시대·분류는 주소 파라미터(type·period·category)라 링크로 그대로 열린다.
 */
export default function ArtistsScreen() {
  const scrollInsets = useTabScrollInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string; period?: string; category?: string }>();
  const { layout } = useBreakpoint();
  const wide = layout === 'desktop' || layout === 'wide';
  const segment: Segment = paramOf(params.type) === 'artist' ? 'artist' : 'composer';
  const eraId = paramOf(params.period);
  const era = ERA_FILTERS.find((item) => item.id === eraId) ?? null;
  const categoryParam = paramOf(params.category);
  const category = categoryParam && isArtistCategoryCode(categoryParam) ? categoryParam : null;
  const [query, setQuery] = React.useState('');
  const debounced = useDebounce(query.trim(), 300);
  const { canEdit } = useAuth();
  const [showForm, setShowForm] = React.useState(false);
  const queryClient = useQueryClient();

  // 세그먼트를 바꾸면 검색어는 비운다 (작곡가 이름으로 연주자를 찾지 않게)
  React.useEffect(() => setQuery(''), [segment]);

  const composers = useBrowseComposers(era?.name, segment === 'composer' ? debounced : '');
  const artists = useInfiniteQuery({
    queryKey: [...ARTIST_QUERY_KEYS.all, 'browse', debounced, category ?? 'all'] as const,
    queryFn: ({ pageParam }) =>
      debounced || category
        ? ArtistAPI.search({
            q: debounced || undefined,
            category: category ?? undefined,
            offset: pageParam,
            limit: ARTIST_PAGE_SIZE,
          })
        : ArtistAPI.getAll(pageParam, ARTIST_PAGE_SIZE),
    getNextPageParam: (lastPage, pages) =>
      lastPage.length < ARTIST_PAGE_SIZE ? undefined : pages.length * ARTIST_PAGE_SIZE,
    initialPageParam: 0,
    staleTime: 3 * 60_000,
    enabled: segment === 'artist',
  });
  const active = segment === 'composer' ? composers : artists;

  const { isSignedIn } = useClerkAuth();
  const favorites = useMyFavorites(isSignedIn === true);
  const repertoire = useRepertoireIds();

  const openComposer = React.useCallback((id: number) => router.push(`/composer/${id}` as Href), [router]);
  const openArtist = React.useCallback((id: number) => router.push(`/artist/${id}` as Href), [router]);

  // 레퍼토리에 담은 사람: 지금 시대·분류에 맞는 사람만 위 선반에. 검색 중에는 선반을 숨긴다
  const shelf: PersonItem[] = React.useMemo(() => {
    if (debounced || !favorites.data) return [];
    if (segment === 'composer') {
      return favorites.data.composers
        .filter((item) => !era || item.period === era.name)
        .map((item) => ({
          key: `c-${item.composerId}`,
          name: item.name,
          image: item.avatarUrl,
          caption: item.period,
          onPress: () => openComposer(item.composerId),
        }));
    }
    return favorites.data.artists
      .filter((item) => !category || item.category === category)
      .map((item) => ({
        key: `a-${item.artistId}`,
        name: item.name,
        image: item.imageUrl,
        caption: getArtistCategoryLabel(item.category),
        onPress: () => openArtist(item.artistId),
      }));
  }, [category, debounced, era, favorites.data, openArtist, openComposer, segment]);

  const grid: PersonItem[] = React.useMemo(() => {
    const seen = new Set<number>();
    if (segment === 'composer') {
      return (composers.data?.pages.flat() ?? [])
        .filter((composer: Composer) => (seen.has(composer.id) ? false : (seen.add(composer.id), true)))
        .map((composer) => ({
          key: `c-${composer.id}`,
          name: composer.name,
          image: composer.avatarUrl,
          caption: era ? lifeSpan(composer) : [composer.period, lifeSpan(composer)].filter(Boolean).join(' · '),
          inRepertoire: repertoire.composers.has(composer.id),
          onPress: () => openComposer(composer.id),
        }));
    }
    return (artists.data?.pages.flat() ?? [])
      .filter((artist: Artist) => (seen.has(artist.id) ? false : (seen.add(artist.id), true)))
      .map((artist) => ({
        key: `a-${artist.id}`,
        name: artist.name,
        image: artist.imageUrl,
        caption: getArtistCategoryLabel(artist.category),
        inRepertoire: repertoire.artists.has(artist.id),
        onPress: () => openArtist(artist.id),
      }));
  }, [artists.data, composers.data, era, openArtist, openComposer, repertoire, segment]);

  const setParams = (next: { type?: Segment; period?: string | null; category?: string | null }) =>
    router.setParams({
      type: (next.type ?? segment) === 'artist' ? 'artist' : undefined,
      period: next.period === undefined ? eraId : next.period ?? undefined,
      category: next.category === undefined ? categoryParam : next.category ?? undefined,
    });

  const onScroll = ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nearEnd =
      nativeEvent.layoutMeasurement.height + nativeEvent.contentOffset.y >= nativeEvent.contentSize.height - 600;
    if (nearEnd && active.hasNextPage && !active.isFetchingNextPage) void active.fetchNextPage();
  };

  const noun = segment === 'composer' ? '작곡가' : '연주자';

  return (
    <View className="flex-1 bg-background web:bg-surface-1">
      <ScrollView
        {...scrollInsets}
        className="flex-1"
        onScroll={onScroll}
        scrollEventThrottle={200}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={active.isRefetching} onRefresh={() => active.refetch()} />}
        contentContainerClassName={cn('pb-28', wide ? 'px-7 pt-3' : 'px-4 pt-2')}>
        <View className={cn('gap-4', wide && 'flex-row items-end justify-between')}>
          <View>
            <Text variant={wide ? 'display' : 'title1'}>아티스트</Text>
            <Text variant="bodySm" className="mt-1 text-foreground-muted">
              {segment === 'composer'
                ? '추천 순으로 보여요. 시대를 고르거나 이름으로 찾아보세요.'
                : '추천 순으로 보여요. 악기나 편성을 고르거나 이름으로 찾아보세요.'}
            </Text>
          </View>
          <View className={cn('flex-row items-center gap-2', wide && 'w-[380px]')}>
            <View className="flex-1 justify-center">
              <Input
                value={query}
                onChangeText={setQuery}
                placeholder={`${noun} 이름으로 찾기`}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                accessibilityLabel={`${noun} 이름으로 찾기`}
                className="h-11 rounded-full pl-10 sm:h-11"
              />
              <View pointerEvents="none" className="absolute left-3.5">
                <Icon as={SearchIcon} size={16} className="text-foreground-subtle" />
              </View>
            </View>
            {canEdit && segment === 'artist' ? (
              <Button
                variant="outline"
                size="icon"
                className="rounded-full"
                accessibilityLabel="연주자 추가"
                onPress={() => setShowForm(true)}>
                <Icon as={PlusIcon} size={16} className="text-foreground" />
              </Button>
            ) : null}
          </View>
        </View>

        <SegmentedControl value={segment} onChange={(type) => setParams({ type, period: null, category: null })} />

        <View className="mt-4 flex-row items-center gap-3">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-1" contentContainerClassName="gap-2">
            {segment === 'composer' ? (
              <>
                <Chip label="전체" selected={era === null} onPress={() => setParams({ period: null })} />
                {ERA_FILTERS.map((item) => (
                  <EraChip
                    key={item.id}
                    name={item.name}
                    label={item.label}
                    selected={era?.id === item.id}
                    onPress={() => setParams({ period: item.id })}
                  />
                ))}
              </>
            ) : (
              <>
                <Chip label="전체" selected={category === null} onPress={() => setParams({ category: null })} />
                {CATEGORY_FILTERS.map((code) => (
                  <Chip
                    key={code}
                    label={getArtistCategoryLabel(code)}
                    selected={category === code}
                    onPress={() => setParams({ category: code })}
                  />
                ))}
              </>
            )}
          </ScrollView>
          {segment === 'composer' && wide ? (
            <TimelineLink onPress={() => router.push((era ? `/timeline?era=${era.id}` : '/timeline') as Href)} />
          ) : null}
        </View>
        {segment === 'composer' && !wide ? (
          <View className="mt-3 flex-row">
            <TimelineLink onPress={() => router.push((era ? `/timeline?era=${era.id}` : '/timeline') as Href)} />
          </View>
        ) : null}

        {shelf.length > 0 ? (
          <View className="mt-7">
            <Text variant="caption" className="mb-3 font-semibold text-foreground-subtle">
              레퍼토리에 담은 {noun} {shelf.length}
            </Text>
            <PeopleShelf items={shelf} wide={wide} />
          </View>
        ) : null}

        <View className="mt-7">
          {shelf.length > 0 && grid.length > 0 ? (
            <Text variant="caption" className="mb-3 font-semibold text-foreground-subtle">
              {debounced ? `‘${debounced}’ 검색 결과` : `모든 ${noun}`}
            </Text>
          ) : null}
          <PeopleGrid items={grid} loading={active.isLoading} wide={wide} />
        </View>

        {active.isError ? (
          <EmptyState
            icon={AlertCircleIcon}
            tone="error"
            title={`${noun}를 불러오지 못했어요`}
            description="연결이 잠시 끊겼을 수 있어요. 다시 시도해 주세요."
            action={{ label: '다시 시도', onPress: () => active.refetch() }}
          />
        ) : !active.isLoading && grid.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title={debounced ? `‘${debounced}’에 맞는 ${noun}가 없어요` : `이 조건에는 아직 ${noun}가 없어요`}
            description={debounced ? '다른 표기나 영문 이름으로 찾아보세요.' : '다른 시대나 분류를 골라 보세요.'}
            action={
              debounced
                ? { label: '검색어 지우기', onPress: () => setQuery('') }
                : { label: '전체 보기', onPress: () => setParams({ period: null, category: null }) }
            }
          />
        ) : active.isFetchingNextPage ? (
          <Text variant="caption" className="mt-6 text-center">
            더 불러오는 중…
          </Text>
        ) : null}
      </ScrollView>

      <ArtistFormModal
        visible={showForm}
        onClose={() => setShowForm(false)}
        onSuccess={() => {
          setShowForm(false);
          void queryClient.invalidateQueries({ queryKey: ARTIST_QUERY_KEYS.all });
        }}
      />
    </View>
  );
}

function SegmentedControl({ value, onChange }: { value: Segment; onChange: (value: Segment) => void }) {
  const options: { value: Segment; label: string }[] = [
    { value: 'composer', label: '작곡가' },
    { value: 'artist', label: '연주자' },
  ];
  return (
    <View
      accessibilityRole="tablist"
      className="mt-5 flex-row self-start rounded-full border border-border bg-surface-2 p-1">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            // 그림자는 className으로 켜고 끄지 않는다 (SELECTED_SHADOW 주석)
            style={selected ? SELECTED_SHADOW : undefined}
            className={cn(
              'h-9 min-w-[88px] items-center justify-center rounded-full px-5 web:transition-colors',
              selected ? 'bg-background web:bg-surface-1' : 'web:hover:bg-surface-3'
            )}>
            <Text className={cn('text-body-sm font-semibold', selected ? 'text-foreground' : 'text-foreground-muted')}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function EraChip({
  name,
  label,
  selected,
  onPress,
}: {
  name: string;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colorScheme } = useColorScheme();
  const color = getEraForeground(name, colorScheme === 'dark' ? 'dark' : 'light');
  return <Chip label={label} selected={selected} onPress={onPress} leading={color ? <ChipDot color={color} /> : undefined} />;
}

function TimelineLink({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      className="h-8 shrink-0 flex-row items-center gap-1.5 rounded-full px-3 active:bg-surface-2 web:hover:bg-surface-2">
      <EraIcon size={16} className="text-primary" />
      <Text className="text-label font-semibold text-foreground">타임라인으로 보기</Text>
    </Pressable>
  );
}

import { ArtistFormModal } from '@/components/admin/ArtistFormModal';
import { PersonCard } from '@/components/home/cards';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { ArtistAPI } from '@/lib/api/client';
import { type ArtistCategoryCode, getArtistCategoryLabel } from '@/lib/design/artist-category';
import { useAuth } from '@/lib/hooks/useAuth';
import { ARTIST_QUERY_KEYS } from '@/lib/query/hooks/useArtists';
import { cn } from '@/lib/utils';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { type Href, useRouter } from 'expo-router';
import { AlertCircleIcon, PlusIcon, SearchIcon, UsersIcon } from 'lucide-react-native';
import * as React from 'react';
import { type LayoutChangeEvent, RefreshControl, ScrollView, View } from 'react-native';
import { useTabScrollInsets } from '@/components/navigation/tab-chrome';

const PAGE_SIZE = 30;

/** 자주 찾는 분류만 칩으로. 나머지는 검색으로 찾는다 */
const FILTERS: ArtistCategoryCode[] = [
  'pianist',
  'violinist',
  'cellist',
  'violist',
  'vocalist',
  'conductor',
  'orchestra',
  'flutist',
  'guitarist',
];

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/** 연주자 둘러보기: 추천 순 원형 그리드 + 분류 칩 + 이름 검색 (검색 둘러보기에서 들어온다) */
export default function ArtistsScreen() {
  const scrollInsets = useTabScrollInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { canEdit } = useAuth();
  const { layout } = useBreakpoint();
  const wide = layout === 'desktop' || layout === 'wide';
  const [query, setQuery] = React.useState('');
  const [category, setCategory] = React.useState<ArtistCategoryCode | null>(null);
  const [showForm, setShowForm] = React.useState(false);
  const [width, setWidth] = React.useState(0);
  const q = useDebounced(query.trim(), 300);

  const artists = useInfiniteQuery({
    queryKey: [...ARTIST_QUERY_KEYS.all, 'browse', q, category ?? 'all'] as const,
    queryFn: ({ pageParam }) =>
      q || category
        ? ArtistAPI.search({ q: q || undefined, category: category ?? undefined, offset: pageParam, limit: PAGE_SIZE })
        : ArtistAPI.getAll(pageParam, PAGE_SIZE),
    getNextPageParam: (lastPage, pages) => (lastPage.length < PAGE_SIZE ? undefined : pages.length * PAGE_SIZE),
    initialPageParam: 0,
    staleTime: 3 * 60_000,
  });
  const list = React.useMemo(() => {
    const seen = new Set<number>();
    return (artists.data?.pages.flat() ?? []).filter((artist) => (seen.has(artist.id) ? false : seen.add(artist.id)));
  }, [artists.data]);

  const gap = wide ? 24 : 14;
  const minItem = wide ? 148 : 96;
  const columns = width > 0 ? Math.max(3, Math.floor((width + gap) / (minItem + gap))) : 0;
  const itemWidth = columns > 0 ? Math.floor((width - gap * (columns - 1)) / columns) : 0;

  const onScroll = ({ nativeEvent }: { nativeEvent: { layoutMeasurement: { height: number }; contentOffset: { y: number }; contentSize: { height: number } } }) => {
    const nearEnd = nativeEvent.layoutMeasurement.height + nativeEvent.contentOffset.y >= nativeEvent.contentSize.height - 600;
    if (nearEnd && artists.hasNextPage && !artists.isFetchingNextPage) void artists.fetchNextPage();
  };

  return (
    <View className="flex-1 bg-background web:bg-surface-1">
      <ScrollView
        {...scrollInsets}
        className="flex-1"
        onScroll={onScroll}
        scrollEventThrottle={200}
        refreshControl={<RefreshControl refreshing={artists.isRefetching} onRefresh={() => artists.refetch()} />}
        contentContainerClassName={cn('pb-28', wide ? 'px-7 pt-3' : 'px-4 pt-2')}>
        <View className={cn('gap-4', wide && 'flex-row items-end justify-between')}>
          <View>
            <Text variant={wide ? 'display' : 'title1'}>연주자</Text>
            <Text variant="bodySm" className="mt-1 text-foreground-muted">
              추천 순으로 보여요. 분류를 고르거나 이름으로 찾아보세요.
            </Text>
          </View>
          <View className={cn('flex-row items-center gap-2', wide && 'w-[380px]')}>
            <View className="flex-1 justify-center">
              <Input
                value={query}
                onChangeText={setQuery}
                placeholder="이름으로 찾기"
                autoCapitalize="none"
                returnKeyType="search"
                accessibilityLabel="연주자 이름으로 찾기"
                className="h-11 rounded-full pl-10 sm:h-11"
              />
              <View pointerEvents="none" className="absolute left-3.5">
                <Icon as={SearchIcon} size={16} className="text-foreground-subtle" />
              </View>
            </View>
            {canEdit ? (
              <Button variant="outline" size="icon" className="rounded-full" accessibilityLabel="연주자 추가" onPress={() => setShowForm(true)}>
                <Icon as={PlusIcon} size={16} className="text-foreground" />
              </Button>
            ) : null}
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-5" contentContainerClassName="gap-2">
          <Chip label="전체" selected={category === null} onPress={() => setCategory(null)} />
          {FILTERS.map((code) => (
            <Chip key={code} label={getArtistCategoryLabel(code)} selected={category === code} onPress={() => setCategory(code)} />
          ))}
        </ScrollView>

        <View
          className="mt-7 flex-row flex-wrap"
          style={{ columnGap: gap, rowGap: gap + 8 }}
          onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}>
          {artists.isLoading ? (
            Array.from({ length: columns || 6 }, (_, index) => (
              <View key={index} style={{ width: itemWidth || minItem }} className="items-center gap-2">
                <Skeleton className="aspect-square w-full rounded-full" />
                <Skeleton className="h-3 w-2/3" />
              </View>
            ))
          ) : itemWidth > 0 ? (
            list.map((artist) => (
              <View key={artist.id} style={{ width: itemWidth }}>
                <PersonCard
                  name={artist.name}
                  image={artist.imageUrl}
                  caption={getArtistCategoryLabel(artist.category)}
                  width={itemWidth}
                  onPress={() => router.push(`/artist/${artist.id}` as Href)}
                />
              </View>
            ))
          ) : null}
        </View>

        {artists.isError ? (
          <EmptyState
            icon={AlertCircleIcon}
            tone="error"
            title="연주자를 불러오지 못했어요"
            description="연결이 잠시 끊겼을 수 있어요. 다시 시도해 주세요."
            action={{ label: '다시 시도', onPress: () => artists.refetch() }}
          />
        ) : !artists.isLoading && list.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title={q ? `"${q}"에 맞는 연주자가 없어요` : '이 분류에는 아직 연주자가 없어요'}
            description={q ? '다른 표기나 영문 이름으로 찾아보세요.' : '다른 분류를 골라 보세요.'}
          />
        ) : artists.isFetchingNextPage ? (
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

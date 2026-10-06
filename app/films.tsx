import { ScrollShelf } from '@/components/home/shelf';
import { SCREEN_KIND_LABELS, shortTitleMeta, titleMeta } from '@/components/screen/labels';
import { POSTER_ASPECT, ScreenPoster } from '@/components/screen/screen-poster';
import { ScreenWorksList } from '@/components/screen/screen-works-list';
import { TmdbAttribution } from '@/components/screen/tmdb-attribution';
import { SELECTED_SHADOW } from '@/components/compare/switch-mode-toggle';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useDebounce } from '@/lib/hooks/useDebounce';
import {
  useFeaturedScreenCues,
  usePrefetchScreenTitle,
  useScreenTitles,
  useScreenTitleSearch,
} from '@/lib/query/hooks/useScreen';
import type { FeaturedScreenCue, ScreenTitleKind, ScreenTitleSummary } from '@/lib/types/models';
import { cn } from '@/lib/utils';
import { type Href, useRouter } from 'expo-router';
import { AlertCircleIcon, ArrowLeftIcon, ClapperboardIcon, SearchIcon, XIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type KindFilter = ScreenTitleKind | 'all';
/** 작품에서 찾기(포스터 목록) · 곡에서 찾기(작곡가별 곡 목록) */
type BrowseView = 'titles' | 'works';

const VIEW_OPTIONS: { value: BrowseView; label: string }[] = [
  { value: 'titles', label: '작품' },
  { value: 'works', label: '곡' },
];

const KIND_CHIPS: { key: KindFilter; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'MOVIE', label: SCREEN_KIND_LABELS.MOVIE },
  { key: 'SERIES', label: SCREEN_KIND_LABELS.SERIES },
  { key: 'ANIME', label: SCREEN_KIND_LABELS.ANIME },
];

const MAX_CONTENT_WIDTH = 880;
/** '그 대목 바로 듣기' 카드. 곡 이름이 두 줄까지 들어가게 넓게 둔다 */
const FEATURED_WIDTH = 296;
const FEATURED_POSTER = 64;
const GRID_GAP = 12;

export default function FilmsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { layout } = useBreakpoint();
  const wide = layout === 'desktop' || layout === 'wide';
  const { width: windowWidth } = useWindowDimensions();
  const contentWidth = Math.min(windowWidth, MAX_CONTENT_WIDTH) - (wide ? 48 : 32);
  const columns = contentWidth >= 720 ? 5 : contentWidth >= 520 ? 4 : 3;
  const posterWidth = Math.floor((contentWidth - GRID_GAP * (columns - 1)) / columns);

  const [query, setQuery] = React.useState('');
  const [kind, setKind] = React.useState<KindFilter>('all');
  const [view, setView] = React.useState<BrowseView>('titles');
  const debounced = useDebounce(query, 300).trim();
  const titles = useScreenTitles(kind);
  const search = useScreenTitleSearch(debounced, kind);
  const featured = useFeaturedScreenCues();

  const searching = debounced.length > 0;
  // 검색 결과는 늘 작품이다(곡·작곡가 이름으로도 찾는다)
  const showWorks = view === 'works' && !searching;
  const listed = titles.data?.pages.flatMap((page) => page.items) ?? [];
  const found = search.data?.pages.flatMap((page) => page.items) ?? [];
  const items = searching ? found : listed;
  const paging = searching ? search : titles;
  const loading = searching ? search.isLoading : titles.isLoading;
  const failed = searching ? search.isError : titles.isError;

  return (
    <ScrollView
      className="flex-1 bg-background"
      keyboardShouldPersistTaps="handled"
      contentContainerClassName={cn('px-4 pb-24', wide && 'mx-auto w-full max-w-[880px] px-6')}>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.push('/search' as Href))}
        accessibilityLabel="뒤로"
        style={{ marginTop: insets.top + 4 }}
        className="mb-1 size-11 items-center justify-center">
        <Icon as={ArrowLeftIcon} size={22} className="text-foreground" />
      </Pressable>

      <Text variant="title1">영화 속 클래식</Text>
      <Text variant="bodySm" className="mt-1 text-foreground-muted">
        영화·드라마·애니에서 들은 그 곡을 찾고, 나온 대목을 여러 연주로 들어 봐요.
      </Text>

      <View className="mt-5 h-11 flex-row items-center gap-2.5 rounded-full border border-border-strong bg-surface-2 px-4">
        <Icon as={SearchIcon} size={18} className="text-foreground-subtle" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="작품 제목이나 곡 이름"
          placeholderTextColor="hsl(33 6% 46%)"
          returnKeyType="search"
          autoCorrect={false}
          accessibilityLabel="영화·드라마 검색어"
          className="flex-1 text-base text-foreground web:outline-none"
        />
        {query ? (
          <Pressable accessibilityLabel="검색어 지우기" hitSlop={10} onPress={() => setQuery('')}>
            <Icon as={XIcon} size={16} className="text-foreground-subtle" />
          </Pressable>
        ) : null}
      </View>

      {searching ? null : (
        <View className="mt-3 flex-row items-center gap-3">
          <ViewToggle value={view} onChange={setView} />
          {showWorks ? (
            <Text variant="caption" className="min-w-0 flex-1">
              작곡가별로 영화에 나온 곡을 모았어요.
            </Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-1" contentContainerClassName="gap-2">
              {KIND_CHIPS.map((chip) => (
                <Chip key={chip.key} label={chip.label} selected={kind === chip.key} onPress={() => setKind(chip.key)} />
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {showWorks ? (
        <View className="mt-7">
          <ScreenWorksList />
        </View>
      ) : null}

      {!showWorks && !searching && kind === 'all' && featured.isLoading ? (
        <View className="mt-7 gap-3">
          <View className="gap-1.5">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3 w-56" />
          </View>
          <View className="flex-row gap-3 overflow-hidden">
            {Array.from({ length: 4 }, (_, index) => (
              <View key={index} style={{ width: FEATURED_WIDTH }} className="flex-row gap-3 rounded-lg bg-surface-2 p-2.5">
                <Skeleton style={{ width: FEATURED_POSTER, height: Math.round(FEATURED_POSTER * POSTER_ASPECT) }} />
                <View className="flex-1 justify-center gap-2">
                  <Skeleton className="h-3.5 w-4/5" />
                  <Skeleton className="h-3 w-3/5" />
                  <Skeleton className="h-3 w-2/5" />
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {!showWorks && !searching && kind === 'all' && (featured.data?.length ?? 0) > 0 ? (
        <View className="mt-7 gap-3">
          <View>
            <Text variant="headline">그 대목 바로 듣기</Text>
            <Text variant="caption" className="mt-0.5">
              영화에 나온 대목을 그대로 비교할 수 있어요.
            </Text>
          </View>
          <ScrollShelf gap={12}>
            {(featured.data ?? []).map((cue) => (
              <FeaturedCueCard key={cue.cueId} cue={cue} />
            ))}
          </ScrollShelf>
        </View>
      ) : null}

      {showWorks ? null : (
        <View className="mt-7">
          <Text variant="headline" className="mb-3">
            {searching ? `“${debounced}” 검색 결과` : '작품'}
          </Text>
          {loading ? (
            <View className="flex-row flex-wrap" style={{ columnGap: GRID_GAP, rowGap: 18 }}>
              {Array.from({ length: columns * 2 }, (_, index) => (
                <View key={index} style={{ width: posterWidth }} className="gap-1.5">
                  <Skeleton style={{ width: posterWidth, height: Math.round(posterWidth * POSTER_ASPECT) }} />
                  <Skeleton className="mt-0.5 h-3.5 w-4/5" />
                  <Skeleton className="h-3 w-1/2" />
                </View>
              ))}
            </View>
          ) : failed ? (
            <EmptyState
              icon={AlertCircleIcon}
              tone="error"
              compact
              title="작품을 불러오지 못했어요"
              description="연결이 잠시 끊겼을 수 있어요. 다시 시도해 주세요."
              action={{
                label: '다시 시도',
                onPress: () => void (searching ? search.refetch() : titles.refetch()),
              }}
            />
          ) : items.length === 0 ? (
            <EmptyState
              icon={ClapperboardIcon}
              compact
              title={searching ? `“${debounced}”가 나온 작품을 아직 못 찾았어요` : '아직 정리한 작품이 없어요'}
              description={searching ? '다른 제목이나 곡 이름으로 찾아보세요.' : '근거를 확인한 작품부터 하나씩 채우고 있어요.'}
            />
          ) : (
            <View className="flex-row flex-wrap" style={{ columnGap: GRID_GAP, rowGap: 18 }}>
              {items.map((item) => (
                <TitleTile key={item.id} item={item} width={posterWidth} />
              ))}
            </View>
          )}
          {paging.hasNextPage ? (
            <Button
              variant="outline"
              className="mt-6 h-11 self-center rounded-full px-6"
              disabled={paging.isFetchingNextPage}
              onPress={() => void paging.fetchNextPage()}>
              <Text className="font-semibold text-foreground">{paging.isFetchingNextPage ? '불러오는 중…' : '작품 더 보기'}</Text>
            </Button>
          ) : null}
        </View>
      )}

      {/* 그림 출처. 곡 목록에는 그림이 없다 */}
      {showWorks ? null : (
        <View className="mt-12 gap-3">
          {items.some((item) => item.posterUrl) ? (
            <Text variant="micro">포스터는 한국영상자료원 KMDb에서 가져와요.</Text>
          ) : null}
          <Text variant="micro">
            포스터가 없는 작품은 배급사·방송사·OTT 공식 YouTube 예고편과 클립의 장면을 보여 줘요.
          </Text>
          {items.some((item) => item.posterPath || item.backdropPath) ? <TmdbAttribution /> : null}
        </View>
      )}
    </ScrollView>
  );
}

function ViewToggle({ value, onChange }: { value: BrowseView; onChange: (value: BrowseView) => void }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="찾는 방법" className="h-9 flex-row rounded-full bg-surface-2 p-0.5">
      {VIEW_OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={selected ? SELECTED_SHADOW : undefined}
            className={cn('h-8 items-center justify-center rounded-full px-4', selected && 'bg-surface-1')}>
            <Text className={cn('text-label', selected ? 'font-semibold text-foreground' : 'text-foreground-muted')}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function TitleTile({ item, width }: { item: ScreenTitleSummary; width: number }) {
  const router = useRouter();
  const prefetch = usePrefetchScreenTitle();
  return (
    <Pressable
      onHoverIn={() => prefetch(item.id)}
      onPressIn={() => prefetch(item.id)}
      onPress={() => router.push(`/film/${item.id}` as Href)}
      accessibilityRole="link"
      accessibilityLabel={`${item.titleKo}, ${titleMeta(item.kind, item.releaseYear)}, 클래식 ${item.cueCount}곡`}
      style={{ width }}
      className="gap-1.5">
      <ScreenPoster
        title={item.titleKo}
        posterPath={item.posterPath}
        posterUrl={item.posterUrl}
        coverVideoId={item.coverVideoId}
        coverThumbs={item.coverThumbs}
        width={width}
      />
      <Text numberOfLines={1} className="text-label font-semibold text-foreground">
        {item.titleKo}
      </Text>
      <Text variant="micro" numberOfLines={1}>
        {shortTitleMeta(item.kind, item.releaseYear)} · {item.cueCount}곡
      </Text>
    </Pressable>
  );
}

function FeaturedCueCard({ cue }: { cue: FeaturedScreenCue }) {
  const router = useRouter();
  const open = () => {
    const params = new URLSearchParams({
      composerId: String(cue.composerId),
      pieceId: String(cue.pieceId),
      sectorId: String(cue.sectorId),
    });
    router.push(`/compare?${params.toString()}` as Href);
  };
  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={`${cue.titleKo}에 나온 ${cue.composerName} ${cue.workTitle} 비교해 듣기`}
      style={{ width: FEATURED_WIDTH }}
      className="flex-row items-center gap-3 rounded-lg bg-surface-2 p-2.5 active:bg-surface-3 web:hover:bg-surface-3">
      <ScreenPoster
        title={cue.titleKo}
        posterPath={cue.posterPath}
        posterUrl={cue.posterUrl}
        coverVideoId={cue.coverVideoId}
        coverThumbs={cue.coverThumbs}
        width={FEATURED_POSTER}
      />
      <View className="min-w-0 flex-1 gap-1">
        <Text variant="micro" numberOfLines={1} className="font-semibold text-primary">
          {cue.titleKo}
        </Text>
        <Text numberOfLines={2} className="text-label font-semibold text-foreground">
          {cue.partLabel ?? cue.workTitle}
        </Text>
        <Text variant="micro" numberOfLines={1}>
          {cue.partLabel ? `${cue.composerName} · ${cue.workTitle}` : cue.composerName}
        </Text>
      </View>
    </Pressable>
  );
}

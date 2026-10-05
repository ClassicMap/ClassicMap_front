import { ScrollShelf } from '@/components/home/shelf';
import { SCREEN_KIND_LABELS, titleMeta } from '@/components/screen/labels';
import { ScreenPoster } from '@/components/screen/screen-poster';
import { TmdbAttribution } from '@/components/screen/tmdb-attribution';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useFeaturedScreenCues, useScreenTitles, useScreenTitleSearch } from '@/lib/query/hooks/useScreen';
import type { FeaturedScreenCue, ScreenTitleKind, ScreenTitleSummary } from '@/lib/types/models';
import { cn } from '@/lib/utils';
import { type Href, useRouter } from 'expo-router';
import { AlertCircleIcon, ArrowLeftIcon, ClapperboardIcon, SearchIcon, XIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type KindFilter = ScreenTitleKind | 'all';

const KIND_CHIPS: { key: KindFilter; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'MOVIE', label: SCREEN_KIND_LABELS.MOVIE },
  { key: 'SERIES', label: SCREEN_KIND_LABELS.SERIES },
  { key: 'ANIME', label: SCREEN_KIND_LABELS.ANIME },
];

const MAX_CONTENT_WIDTH = 880;
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
  const debounced = useDebounce(query, 300).trim();
  const titles = useScreenTitles(kind);
  const search = useScreenTitleSearch(debounced);
  const featured = useFeaturedScreenCues();

  const searching = debounced.length > 0;
  const listed = titles.data?.pages.flatMap((page) => page.items) ?? [];
  const found = (search.data?.items ?? []).filter((item) => kind === 'all' || item.kind === kind);
  const items = searching ? found : listed;
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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3" contentContainerClassName="gap-2">
        {KIND_CHIPS.map((chip) => (
          <Chip key={chip.key} label={chip.label} selected={kind === chip.key} onPress={() => setKind(chip.key)} />
        ))}
      </ScrollView>

      {!searching && kind === 'all' && (featured.data?.length ?? 0) > 0 ? (
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

      <View className="mt-7">
        <Text variant="headline" className="mb-3">
          {searching ? `“${debounced}” 검색 결과` : '작품'}
        </Text>
        {loading ? (
          <View className="flex-row flex-wrap" style={{ gap: GRID_GAP }}>
            {Array.from({ length: columns * 2 }, (_, index) => (
              <Skeleton key={index} style={{ width: posterWidth, height: posterWidth * 1.5 }} className="rounded-md" />
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
        {!searching && titles.hasNextPage ? (
          <Button
            variant="outline"
            className="mt-6 h-11 self-center rounded-full px-6"
            disabled={titles.isFetchingNextPage}
            onPress={() => void titles.fetchNextPage()}>
            <Text className="font-semibold text-foreground">{titles.isFetchingNextPage ? '불러오는 중…' : '작품 더 보기'}</Text>
          </Button>
        ) : null}
      </View>

      <TmdbAttribution className="mt-12" />
    </ScrollView>
  );
}

function TitleTile({ item, width }: { item: ScreenTitleSummary; width: number }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(`/films/${item.id}` as Href)}
      accessibilityRole="link"
      accessibilityLabel={`${item.titleKo}, ${titleMeta(item.kind, item.releaseYear)}, 클래식 ${item.cueCount}곡`}
      style={{ width }}
      className="gap-1.5">
      <ScreenPoster title={item.titleKo} posterPath={item.posterPath} width={width} />
      <Text numberOfLines={1} className="text-label font-semibold text-foreground">
        {item.titleKo}
      </Text>
      <Text variant="micro" numberOfLines={1}>
        {titleMeta(item.kind, item.releaseYear)} · {item.cueCount}곡
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
      className="w-[248px] flex-row gap-3 rounded-lg bg-surface-2 p-2.5 active:bg-surface-3 web:hover:bg-surface-3">
      <ScreenPoster title={cue.titleKo} posterPath={cue.posterPath} width={48} />
      <View className="min-w-0 flex-1 justify-center">
        <Text numberOfLines={1} className="text-label font-semibold text-foreground">
          {cue.partLabel ?? cue.workTitle}
        </Text>
        <Text variant="micro" numberOfLines={1} className="mt-0.5">
          {cue.composerName} · {cue.workTitle}
        </Text>
        <Text variant="micro" numberOfLines={1} className="mt-1 text-primary">
          {cue.titleKo}
        </Text>
      </View>
    </Pressable>
  );
}

import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { EntityThumb } from '@/components/ui/entity-thumb';
import { Icon } from '@/components/ui/icon';
import { CompareIcon, EraIcon, PerformerKindIcon, TicketIcon } from '@/components/ui/icons';
import { SkeletonList } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useUnifiedSearch } from '@/hooks/use-unified-search';
import { getArtistCategoryLabel } from '@/lib/design/artist-category';
import { useDebounce } from '@/lib/hooks/useDebounce';
import type { Artist, Composer, Concert, PieceSearchResult } from '@/lib/types/models';
import { cn } from '@/lib/utils';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { AlertCircleIcon, SearchIcon, XIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useTabHeaderInset } from '@/components/navigation/tab-chrome';

type ResultType = 'all' | 'composer' | 'piece' | 'artist' | 'concert';

const TYPE_CHIPS: { key: ResultType; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'composer', label: '작곡가' },
  { key: 'piece', label: '작품' },
  { key: 'artist', label: '연주자' },
  { key: 'concert', label: '공연' },
];

/** 한 종류만 볼 때는 더 많이 가져온다. */
const LIMIT_ALL = 5;
const LIMIT_SINGLE = 20;

interface BrowseTile {
  label: string;
  description: string;
  href: Href;
  renderIcon: (className: string) => React.ReactNode;
}

const BROWSE_TILES: BrowseTile[] = [
  {
    label: '비교할 수 있는 작품',
    description: '같은 구간을 연주자별로 들어 봐요',
    href: '/compare',
    renderIcon: (className) => <CompareIcon size={22} className={className} />,
  },
  {
    label: '연주자',
    description: '피아니스트부터 오케스트라까지',
    href: '/artists',
    renderIcon: (className) => <PerformerKindIcon size={22} className={className} />,
  },
  {
    label: '타임라인',
    description: '작곡가들이 살았던 시간을 겹쳐 봐요',
    href: '/timeline',
    renderIcon: (className) => <EraIcon size={22} className={className} />,
  },
  {
    label: '공연',
    description: '이번 주 클래식 공연 일정',
    href: '/concerts',
    renderIcon: (className) => <TicketIcon size={22} className={className} />,
  },
];

function formatLife(composer: Composer): string {
  if (!composer.birthYear) return '';
  return `${composer.birthYear}–${composer.deathYear ?? ''}`;
}

function formatShortDate(date: string): string {
  const [, month, day] = date.split('-');
  if (!month || !day) return date;
  return `${Number(month)}.${Number(day)}`;
}

/** 이름이 검색어로 시작하는 결과를 "가장 근접"으로 올린다. 없으면 카드를 그리지 않는다. */
function pickTopHit(
  query: string,
  composers: Composer[],
  artists: Artist[]
): { kind: 'composer'; item: Composer } | { kind: 'artist'; item: Artist } | null {
  const q = query.toLowerCase();
  const composer = composers.find(
    (c) => c.name.toLowerCase().startsWith(q) || c.englishName?.toLowerCase().startsWith(q)
  );
  if (composer) return { kind: 'composer', item: composer };
  const artist = artists.find(
    (a) => a.name.toLowerCase().startsWith(q) || a.englishName?.toLowerCase().startsWith(q)
  );
  if (artist) return { kind: 'artist', item: artist };
  return null;
}

export default function SearchScreen() {
  const headerInset = useTabHeaderInset();
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string }>();
  const { layout } = useBreakpoint();
  const isWide = layout === 'desktop' || layout === 'wide';
  const [query, setQuery] = React.useState(typeof params.q === 'string' ? params.q : '');
  const [type, setType] = React.useState<ResultType>('all');
  const debounced = useDebounce(query, 300);
  const result = useUnifiedSearch(debounced, { limit: type === 'all' ? LIMIT_ALL : LIMIT_SINGLE });

  React.useEffect(() => {
    router.setParams({ q: debounced.trim() || undefined });
  }, [debounced, router]);

  const show = (kind: Exclude<ResultType, 'all'>) => type === 'all' || type === kind;
  const topHit = type === 'all' ? pickTopHit(result.query, result.composers, result.artists) : null;
  // 가장 근접 카드에 올린 항목은 아래 묶음에서 빼서 같은 줄이 두 번 보이지 않게 한다.
  const composers = result.composers.filter(
    (item) => !(topHit?.kind === 'composer' && topHit.item.id === item.id)
  );
  const artists = result.artists.filter(
    (item) => !(topHit?.kind === 'artist' && topHit.item.id === item.id)
  );
  const total =
    result.composers.length + result.pieces.length + result.artists.length + result.concerts.length;

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: headerInset }}>
      <View className={cn('gap-3 px-4 pb-2 pt-3', isWide && 'mx-auto w-full max-w-[880px] px-6')}>
        <View className="h-11 flex-row items-center gap-2.5 rounded-full border border-border-strong bg-surface-2 px-4">
          <Icon as={SearchIcon} size={18} className="text-foreground-subtle" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="작곡가, 작품, 연주자, 공연"
            placeholderTextColor="hsl(33 6% 46%)"
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel="검색어"
            className="flex-1 text-base text-foreground web:outline-none"
          />
          {query ? (
            <Pressable accessibilityLabel="검색어 지우기" hitSlop={10} onPress={() => setQuery('')}>
              <Icon as={XIcon} size={16} className="text-foreground-subtle" />
            </Pressable>
          ) : null}
        </View>
        {result.query ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
            {TYPE_CHIPS.map((chip) => (
              <Chip
                key={chip.key}
                label={chip.label}
                selected={type === chip.key}
                onPress={() => setType(chip.key)}
              />
            ))}
          </ScrollView>
        ) : null}
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerClassName={cn('px-4 pb-16', isWide && 'mx-auto w-full max-w-[880px] px-6')}>
        {!result.query ? (
          <View className="mt-4 gap-3">
            <Text variant="title3">둘러보기</Text>
            <View className={cn('gap-3', isWide && 'flex-row flex-wrap')}>
              {BROWSE_TILES.map((tile) => (
                <Pressable
                  key={tile.label}
                  onPress={() => router.push(tile.href)}
                  className={cn(
                    'flex-row items-center gap-4 rounded-lg bg-surface-2 p-4 active:bg-surface-3 web:hover:bg-surface-3',
                    isWide && 'w-[calc(50%-6px)]'
                  )}>
                  <View className="size-11 items-center justify-center rounded-md bg-surface-3">
                    {tile.renderIcon('text-primary')}
                  </View>
                  <View className="flex-1">
                    <Text variant="headline">{tile.label}</Text>
                    <Text variant="caption" className="mt-0.5">
                      {tile.description}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        ) : result.isLoading ? (
          <SkeletonList rows={6} className="mt-2" />
        ) : total === 0 && result.failedCount === 0 ? (
          <EmptyState
            icon={SearchIcon}
            title={`“${result.query}”에 맞는 결과가 없어요`}
            description="다른 표기나 영문 이름으로 찾아보세요."
          />
        ) : (
          <View>
            {result.failedCount > 0 ? (
              <Pressable
                onPress={result.retry}
                className="mt-3 flex-row items-center gap-2.5 rounded-lg bg-surface-2 p-3">
                <Icon as={AlertCircleIcon} size={18} className="text-destructive" />
                <Text variant="bodySm" className="flex-1 text-foreground-muted">
                  일부 검색이 실패했어요. 눌러서 다시 시도해 주세요.
                </Text>
              </Pressable>
            ) : null}

            {topHit ? (
              <Pressable
                onPress={() =>
                  router.push(
                    topHit.kind === 'composer'
                      ? `/composer/${topHit.item.id}`
                      : `/artist/${topHit.item.id}`
                  )
                }
                className="mt-4 flex-row items-center gap-4 rounded-xl bg-surface-2 p-4 active:bg-surface-3 web:hover:bg-surface-3">
                <EntityThumb
                  name={topHit.item.name}
                  image={topHit.kind === 'composer' ? topHit.item.avatarUrl : topHit.item.imageUrl}
                  shape="circle"
                  size={64}
                />
                <View className="flex-1">
                  <Text className="text-title-3">{topHit.item.name}</Text>
                  <Text variant="caption" className="mt-1">
                    {topHit.kind === 'composer'
                      ? ['작곡가', formatLife(topHit.item)].filter(Boolean).join(' · ')
                      : getArtistCategoryLabel(topHit.item.category)}
                  </Text>
                </View>
              </Pressable>
            ) : null}

            {show('composer') && composers.length > 0 ? (
              <ResultGroup title="작곡가">
                {composers.map((composer) => (
                  <ResultRow
                    key={composer.id}
                    title={composer.name}
                    subtitle={[composer.period, formatLife(composer)].filter(Boolean).join(' · ')}
                    thumb={<EntityThumb name={composer.name} image={composer.avatarUrl} shape="circle" size={44} />}
                    onPress={() => router.push(`/composer/${composer.id}`)}
                  />
                ))}
              </ResultGroup>
            ) : null}

            {show('piece') && result.pieces.length > 0 ? (
              <ResultGroup title="작품">
                {result.pieces.map((piece: PieceSearchResult) => (
                  <ResultRow
                    key={piece.id}
                    title={piece.title}
                    subtitle={[piece.composerName, piece.opusNumber].filter(Boolean).join(' · ')}
                    thumb={<EntityThumb name={piece.title} image={piece.composerAvatarUrl} shape="square" size={44} />}
                    onPress={() =>
                      router.push(`/compare?composerId=${piece.composerId}&pieceId=${piece.id}`)
                    }
                  />
                ))}
              </ResultGroup>
            ) : null}

            {show('artist') && artists.length > 0 ? (
              <ResultGroup title="연주자">
                {artists.map((artist) => (
                  <ResultRow
                    key={artist.id}
                    title={artist.name}
                    subtitle={getArtistCategoryLabel(artist.category)}
                    thumb={<EntityThumb name={artist.name} image={artist.imageUrl} shape="circle" size={44} />}
                    onPress={() => router.push(`/artist/${artist.id}`)}
                  />
                ))}
              </ResultGroup>
            ) : null}

            {show('concert') && result.concerts.length > 0 ? (
              <ResultGroup title="공연">
                {result.concerts.map((concert: Concert) => (
                  <ResultRow
                    key={concert.id}
                    title={concert.title}
                    subtitle={[formatShortDate(concert.startDate), concert.facilityName]
                      .filter(Boolean)
                      .join(' · ')}
                    thumb={
                      <EntityThumb name={concert.title} image={concert.posterUrl} shape="square" size={44} aspect={4 / 3} />
                    }
                    onPress={() => router.push(`/concert/${concert.id}`)}
                  />
                ))}
              </ResultGroup>
            ) : null}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function ResultGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mt-6">
      <Text variant="headline" className="mb-1.5">
        {title}
      </Text>
      {children}
    </View>
  );
}

function ResultRow({
  title,
  subtitle,
  thumb,
  onPress,
}: {
  title: string;
  subtitle?: string;
  thumb: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="-mx-2 min-h-14 flex-row items-center gap-3 rounded-md px-2 py-1.5 active:bg-surface-2 web:hover:bg-surface-2">
      {thumb}
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-body-sm font-semibold text-foreground">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" numberOfLines={1} className="mt-0.5">
            {subtitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
